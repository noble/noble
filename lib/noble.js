var debug = require('debug')('noble');

var events = require('events');
var util = require('util');

var Peripheral = require('./peripheral');
var Service = require('./service');
var Characteristic = require('./characteristic');
var Descriptor = require('./descriptor');

function Noble(bindings) {
  this.initialized = false;

  this.address = 'unknown';
  this._state = 'unknown';
  this._bindings = bindings;
  this._peripherals = {};
  this._services = {};
  this._characteristics = {};
  this._descriptors = {};
  this._discoveredPeripheralUUids = [];

  this._bindings.on('stateChange', this.onStateChange.bind(this));
  this._bindings.on('addressChange', this.onAddressChange.bind(this));
  this._bindings.on('scanStart', this.onScanStart.bind(this));
  this._bindings.on('scanStop', this.onScanStop.bind(this));
  this._bindings.on('discover', this.onDiscover.bind(this));
  this._bindings.on('connect', this.onConnect.bind(this));
  this._bindings.on('disconnect', this.onDisconnect.bind(this));
  this._bindings.on('rssiUpdate', this.onRssiUpdate.bind(this));
  this._bindings.on('servicesDiscover', this.onServicesDiscover.bind(this));
  this._bindings.on('includedServicesDiscover', this.onIncludedServicesDiscover.bind(this));
  this._bindings.on('characteristicsDiscover', this.onCharacteristicsDiscover.bind(this));
  this._bindings.on('read', this.onRead.bind(this));
  this._bindings.on('write', this.onWrite.bind(this));
  this._bindings.on('broadcast', this.onBroadcast.bind(this));
  this._bindings.on('notify', this.onNotify.bind(this));
  this._bindings.on('descriptorsDiscover', this.onDescriptorsDiscover.bind(this));
  this._bindings.on('valueRead', this.onValueRead.bind(this));
  this._bindings.on('valueWrite', this.onValueWrite.bind(this));
  this._bindings.on('handleRead', this.onHandleRead.bind(this));
  this._bindings.on('handleWrite', this.onHandleWrite.bind(this));
  this._bindings.on('handleNotify', this.onHandleNotify.bind(this));

  this.on('warning', function(message) {
    if (this.listeners('warning').length === 1) {
      console.warn('noble: ' + message);
    }
  }.bind(this));

  //lazy init bindings on first new listener, should be on stateChange
  this.on('newListener', function(event) {
    if (event === 'stateChange' && !this.initialized) {
      process.nextTick(function() {
        this._bindings.init();
        this.initialized = true;
      }.bind(this));
    }
  }.bind(this));

  //or lazy init bindings if someone attempts to get state first
  Object.defineProperties(this, {
    state: {
      get: function () {
        if (!this.initialized) {
          this._bindings.init();
          this.initialized = true;
        }
        return this._state;
      }
    }
  });

}

util.inherits(Noble, events.EventEmitter);

Noble.prototype.onStateChange = function(state) {
  debug('stateChange ' + state);

  this._state = state;

  this.emit('stateChange', state);
};

Noble.prototype.onAddressChange = function(address) {
  debug('addressChange ' + address);

  this.address = address;
};

Noble.prototype.startScanning = function(serviceUuids, allowDuplicates, callback) {
  var scan = function(state) {
    if (state !== 'poweredOn') {
      var error = new Error('Could not start scanning, state is ' + state + ' (not poweredOn)');

      if (typeof callback === 'function') {
        callback(error);
      } else {
        throw error;
      }
    } else {
      if (callback) {
        this.once('scanStart', function(filterDuplicates) {
          callback(null, filterDuplicates);
        });
      }

      this._discoveredPeripheralUUids = [];
      this._allowDuplicates = allowDuplicates;

      this._bindings.startScanning(serviceUuids, allowDuplicates);
    }
  };

  //if bindings still not init, do it now
  if (!this.initialized) {
    this._bindings.init();
    this.initialized = true;
    this.once('stateChange', scan.bind(this));
  }else{
    scan.call(this, this._state);
  }
};

Noble.prototype.onScanStart = function(filterDuplicates) {
  debug('scanStart');
  this.emit('scanStart', filterDuplicates);
};

Noble.prototype.stopScanning = function(callback) {
  if (callback) {
    this.once('scanStop', callback);
  }
  if(this._bindings && this.initialized){
    this._bindings.stopScanning();
  }
};

Noble.prototype.onScanStop = function() {
  debug('scanStop');
  this.emit('scanStop');
};

Noble.prototype.onDiscover = function(uuid, address, addressType, connectable, advertisement, rssi) {
  var peripheral = this._peripherals[uuid];

  if (!peripheral) {
    peripheral = new Peripheral(this, uuid, address, addressType, connectable, advertisement, rssi);

    this._peripherals[uuid] = peripheral;
    this._services[uuid] = {};
    this._characteristics[uuid] = {};
    this._descriptors[uuid] = {};
  } else {
    // "or" the advertisment data with existing
    for (var i in advertisement) {
      if (advertisement[i] !== undefined) {
        peripheral.advertisement[i] = advertisement[i];
      }
    }

    peripheral.connectable = connectable;
    peripheral.rssi = rssi;
  }

  var previouslyDiscoverd = (this._discoveredPeripheralUUids.indexOf(uuid) !== -1);

  if (!previouslyDiscoverd) {
    this._discoveredPeripheralUUids.push(uuid);
  }

  if (this._allowDuplicates || !previouslyDiscoverd) {
    this.emit('discover', peripheral);
  }
};

Noble.prototype.connect = function(peripheralUuid) {
  this._bindings.connect(peripheralUuid);
};

Noble.prototype.onConnect = function(peripheralUuid, error) {
  var peripheral = this._peripherals[peripheralUuid];

  if (peripheral) {
    peripheral.state = error ? 'error' : 'connected';
    peripheral.emit('connect', error);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ' connected!');
  }
};

Noble.prototype.disconnect = function(peripheralUuid) {
  this._bindings.disconnect(peripheralUuid);
};

Noble.prototype.onDisconnect = function(peripheralUuid) {
  var peripheral = this._peripherals[peripheralUuid];

  if (peripheral) {
    peripheral.state = 'disconnected';
    peripheral.emit('disconnect');
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ' disconnected!');
  }
};

Noble.prototype.updateRssi = function(peripheralUuid) {
  this._bindings.updateRssi(peripheralUuid);
};

Noble.prototype.onRssiUpdate = function(peripheralUuid, rssi) {
  var peripheral = this._peripherals[peripheralUuid];

  if (peripheral) {
    peripheral.rssi = rssi;

    peripheral.emit('rssiUpdate', rssi);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ' RSSI update!');
  }
};

Noble.prototype.discoverServices = function(peripheralUuid, uuids) {
  this._bindings.discoverServices(peripheralUuid, uuids);
};

Noble.prototype.onServicesDiscover = function(peripheralUuid, serviceUuids) {
  var peripheral = this._peripherals[peripheralUuid];

  if (peripheral) {
    var services = [];

    for (var i = 0; i < serviceUuids.length; i++) {
      var serviceIds = serviceUuids[i];
      var service = new Service(this, peripheralUuid, serviceIds.id, serviceIds.uuid);

      this._services[peripheralUuid][serviceIds.id] = service;
      this._characteristics[peripheralUuid][serviceIds.id] = {};
      this._descriptors[peripheralUuid][serviceIds.id] = {};

      services.push(service);
    }

    peripheral.services = services;

    peripheral.emit('servicesDiscover', services);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ' services discover!');
  }
};

Noble.prototype.discoverIncludedServices = function(peripheralUuid, serviceId, serviceUuids) {
  this._bindings.discoverIncludedServices(peripheralUuid, serviceId, serviceUuids);
};

Noble.prototype.onIncludedServicesDiscover = function(peripheralUuid, serviceId, includedServiceUuids) {
  var service = this._services[peripheralUuid][serviceId];

  if (service) {
    service.includedServiceUuids = includedServiceUuids;

    service.emit('includedServicesDiscover', includedServiceUuids);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceUuid + ' included services discover!');
  }
};

Noble.prototype.discoverCharacteristics = function(peripheralUuid, serviceId, characteristicUuids) {
  this._bindings.discoverCharacteristics(peripheralUuid, serviceId, characteristicUuids);
};

Noble.prototype.onCharacteristicsDiscover = function(peripheralUuid, serviceId, characteristics) {
  var service = this._services[peripheralUuid][serviceId];

  if (service) {
    var characteristics_ = [];

    for (var i = 0; i < characteristics.length; i++) {
      var characteristicId = characteristics[i].id;

      var characteristic = new Characteristic(
                                this,
                                peripheralUuid,
                                serviceId,
                                service.uuid,
                                characteristicId,
                                characteristics[i].uuid,
                                characteristics[i].properties
                            );

      this._characteristics[peripheralUuid][serviceId][characteristicId] = characteristic;
      this._descriptors[peripheralUuid][serviceId][characteristicId] = {};

      characteristics_.push(characteristic);
    }

    service.characteristics = characteristics_;

    service.emit('characteristicsDiscover', characteristics_);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceId + ' characteristics discover!');
  }
};

Noble.prototype.read = function(peripheralUuid, serviceId, characteristicId) {
   this._bindings.read(peripheralUuid, serviceId, characteristicId);
};

Noble.prototype.onRead = function(peripheralUuid, serviceId, characteristicId, data, isNotification) {
  var characteristic = this._characteristics[peripheralUuid][serviceId][characteristicId];

  if (characteristic) {
    characteristic.emit('data', data, isNotification);

    characteristic.emit('read', data, isNotification); // for backwards compatbility
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceId + ', ' + characteristicId + ' read!');
  }
};

Noble.prototype.write = function(peripheralUuid, serviceId, characteristicId, data, withoutResponse) {
   this._bindings.write(peripheralUuid, serviceId, characteristicId, data, withoutResponse);
};

Noble.prototype.onWrite = function(peripheralUuid, serviceId, characteristicId) {
  var characteristic = this._characteristics[peripheralUuid][serviceId][characteristicId];

  if (characteristic) {
    characteristic.emit('write');
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceId + ', ' + characteristicId + ' write!');
  }
};

Noble.prototype.broadcast = function(peripheralUuid, serviceId, characteristicId, broadcast) {
   this._bindings.broadcast(peripheralUuid, serviceId, characteristicId, broadcast);
};

Noble.prototype.onBroadcast = function(peripheralUuid, serviceId, characteristicId, state) {
  var characteristic = this._characteristics[peripheralUuid][serviceId][characteristicId];

  if (characteristic) {
    characteristic.emit('broadcast', state);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceId + ', ' + characteristicId + ' broadcast!');
  }
};

Noble.prototype.notify = function(peripheralUuid, serviceId, characteristicId, notify) {
   this._bindings.notify(peripheralUuid, serviceId, characteristicId, notify);
};

Noble.prototype.onNotify = function(peripheralUuid, serviceId, characteristicId, state) {
  var characteristic = this._characteristics[peripheralUuid][serviceId][characteristicId];

  if (characteristic) {
    characteristic.emit('notify', state);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceId + ', ' + characteristicId + ' notify!');
  }
};

Noble.prototype.discoverDescriptors = function(peripheralUuid, serviceId, characteristicId) {
  this._bindings.discoverDescriptors(peripheralUuid, serviceId, characteristicId);
};

Noble.prototype.onDescriptorsDiscover = function(peripheralUuid, serviceId, characteristicId, descriptors) {
  var characteristic = this._characteristics[peripheralUuid][serviceId][characteristicId];

  if (characteristic) {
    var descriptors_ = [];

    for (var i = 0; i < descriptors.length; i++) {
      var descriptorId = descriptors[i].id;

      var descriptor = new Descriptor(
                            this,
                            peripheralUuid,
                            serviceId,
                            characteristic._serviceUuid,
                            characteristicId,
                            characteristic.uuid,
                            descriptorId,
                            descriptors[i].uuid
                        );

      this._descriptors[peripheralUuid][serviceId][characteristicId][descriptorId] = descriptor;

      descriptors_.push(descriptor);
    }

    characteristic.descriptors = descriptors_;

    characteristic.emit('descriptorsDiscover', descriptors_);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceUuid + ', ' + characteristicUuid + ' descriptors discover!');
  }
};

Noble.prototype.readValue = function(peripheralUuid, serviceId, characteristicId, descriptorId) {
  this._bindings.readValue(peripheralUuid, serviceId, characteristicId, descriptorId);
};

Noble.prototype.onValueRead = function(peripheralUuid, serviceId, characteristicId, descriptorId, data) {
  var descriptor = this._descriptors[peripheralUuid][serviceId][characteristicId][descriptorId];

  if (descriptor) {
    descriptor.emit('valueRead', data);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceId + ', ' + characteristicId + ', ' + descriptorId + ' value read!');
  }
};

Noble.prototype.writeValue = function(peripheralUuid, serviceId, characteristicId, descriptorId, data) {
  this._bindings.writeValue(peripheralUuid, serviceId, characteristicId, descriptorId, data);
};

Noble.prototype.onValueWrite = function(peripheralUuid, serviceId, characteristicId, descriptorId) {
  var descriptor = this._descriptors[peripheralUuid][serviceId][characteristicId][descriptorId];

  if (descriptor) {
    descriptor.emit('valueWrite');
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceId + ', ' + characteristicId + ', ' + descriptorId + ' value write!');
  }
};

Noble.prototype.readHandle = function(peripheralUuid, handle) {
  this._bindings.readHandle(peripheralUuid, handle);
};

Noble.prototype.onHandleRead = function(peripheralUuid, handle, data) {
  var peripheral = this._peripherals[peripheralUuid];

  if (peripheral) {
    peripheral.emit('handleRead' + handle, data);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ' handle read!');
  }
};

Noble.prototype.writeHandle = function(peripheralUuid, handle, data, withoutResponse) {
  this._bindings.writeHandle(peripheralUuid, handle, data, withoutResponse);
};

Noble.prototype.onHandleWrite = function(peripheralUuid, handle) {
  var peripheral = this._peripherals[peripheralUuid];

  if (peripheral) {
    peripheral.emit('handleWrite' + handle);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ' handle write!');
  }
};

Noble.prototype.onHandleNotify = function(peripheralUuid, handle, data) {
  var peripheral = this._peripherals[peripheralUuid];

  if (peripheral) {
    peripheral.emit('handleNotify', handle, data);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ' handle notify!');
  }
};

module.exports = Noble;
