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

Noble.prototype.connect = function(peripheralId) {
  this._bindings.connect(peripheralId);
};

Noble.prototype.onConnect = function(peripheralId, error) {
  var peripheral = this._peripherals[peripheralId];

  if (peripheral) {
    peripheral.state = error ? 'error' : 'connected';
    peripheral.emit('connect', error);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ' connected!');
  }
};

Noble.prototype.disconnect = function(peripheralId) {
  this._bindings.disconnect(peripheralId);
};

Noble.prototype.onDisconnect = function(peripheralId) {
  var peripheral = this._peripherals[peripheralId];

  if (peripheral) {
    peripheral.state = 'disconnected';
    peripheral.emit('disconnect');
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ' disconnected!');
  }
};

Noble.prototype.updateRssi = function(peripheralId) {
  this._bindings.updateRssi(peripheralId);
};

Noble.prototype.onRssiUpdate = function(peripheralId, rssi) {
  var peripheral = this._peripherals[peripheralId];

  if (peripheral) {
    peripheral.rssi = rssi;

    peripheral.emit('rssiUpdate', rssi);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ' RSSI update!');
  }
};

Noble.prototype.discoverServices = function(peripheralId, uuids) {
  this._bindings.discoverServices(peripheralId, uuids);
};

Noble.prototype.onServicesDiscover = function(peripheralId, serviceUuids) {
  var peripheral = this._peripherals[peripheralId];

  if (peripheral) {
    var services = [];

    for (var i = 0; i < serviceUuids.length; i++) {
      var serviceUuid = serviceUuids[i];
      var service = new Service(this, peripheralId, serviceUuid);

      this._services[peripheralId][serviceUuid] = service;
      this._characteristics[peripheralId][serviceUuid] = {};
      this._descriptors[peripheralId][serviceUuid] = {};

      services.push(service);
    }

    peripheral.services = services;

    peripheral.emit('servicesDiscover', services);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ' services discover!');
  }
};

Noble.prototype.discoverIncludedServices = function(peripheralId, serviceUuid, serviceUuids) {
  this._bindings.discoverIncludedServices(peripheralId, serviceUuid, serviceUuids);
};

Noble.prototype.onIncludedServicesDiscover = function(peripheralId, serviceUuid, includedServiceUuids) {
  var service = this._services[peripheralId][serviceUuid];

  if (service) {
    service.includedServiceUuids = includedServiceUuids;

    service.emit('includedServicesDiscover', includedServiceUuids);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceUuid + ' included services discover!');
  }
};

Noble.prototype.discoverCharacteristics = function(peripheralId, serviceUuid, characteristicUuids) {
  this._bindings.discoverCharacteristics(peripheralId, serviceUuid, characteristicUuids);
};

Noble.prototype.onCharacteristicsDiscover = function(peripheralId, serviceUuid, characteristics) {
  var service = this._services[peripheralId][serviceUuid];

  if (service) {
    var characteristics_ = [];

    for (var i = 0; i < characteristics.length; i++) {
      var characteristicUuid = characteristics[i].uuid;

      var characteristic = new Characteristic(
                                this,
                                peripheralId,
                                serviceUuid,
                                characteristicUuid,
                                characteristics[i].properties
                            );

      this._characteristics[peripheralId][serviceUuid][characteristicUuid] = characteristic;
      this._descriptors[peripheralId][serviceUuid][characteristicUuid] = {};

      characteristics_.push(characteristic);
    }

    service.characteristics = characteristics_;

    service.emit('characteristicsDiscover', characteristics_);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceUuid + ' characteristics discover!');
  }
};

Noble.prototype.read = function(peripheralId, serviceUuid, characteristicUuid) {
   this._bindings.read(peripheralId, serviceUuid, characteristicUuid);
};

Noble.prototype.onRead = function(peripheralId, serviceUuid, characteristicUuid, data, isNotification) {
  var characteristic = this._characteristics[peripheralId][serviceUuid][characteristicUuid];

  if (characteristic) {
    characteristic.emit('data', data, isNotification);

    characteristic.emit('read', data, isNotification); // for backwards compatbility
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceUuid + ', ' + characteristicUuid + ' read!');
  }
};

Noble.prototype.write = function(peripheralId, serviceUuid, characteristicUuid, data, withoutResponse) {
   this._bindings.write(peripheralId, serviceUuid, characteristicUuid, data, withoutResponse);
};

Noble.prototype.onWrite = function(peripheralId, serviceUuid, characteristicUuid) {
  var characteristic = this._characteristics[peripheralId][serviceUuid][characteristicUuid];

  if (characteristic) {
    characteristic.emit('write');
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceUuid + ', ' + characteristicUuid + ' write!');
  }
};

Noble.prototype.broadcast = function(peripheralId, serviceUuid, characteristicUuid, broadcast) {
   this._bindings.broadcast(peripheralId, serviceUuid, characteristicUuid, broadcast);
};

Noble.prototype.onBroadcast = function(peripheralId, serviceUuid, characteristicUuid, state) {
  var characteristic = this._characteristics[peripheralId][serviceUuid][characteristicUuid];

  if (characteristic) {
    characteristic.emit('broadcast', state);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceUuid + ', ' + characteristicUuid + ' broadcast!');
  }
};

Noble.prototype.notify = function(peripheralId, serviceUuid, characteristicUuid, notify) {
   this._bindings.notify(peripheralId, serviceUuid, characteristicUuid, notify);
};

Noble.prototype.onNotify = function(peripheralId, serviceUuid, characteristicUuid, state) {
  var characteristic = this._characteristics[peripheralId][serviceUuid][characteristicUuid];

  if (characteristic) {
    characteristic.emit('notify', state);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceUuid + ', ' + characteristicUuid + ' notify!');
  }
};

Noble.prototype.discoverDescriptors = function(peripheralId, serviceUuid, characteristicUuid) {
  this._bindings.discoverDescriptors(peripheralId, serviceUuid, characteristicUuid);
};

Noble.prototype.onDescriptorsDiscover = function(peripheralId, serviceUuid, characteristicUuid, descriptors) {
  var characteristic = this._characteristics[peripheralId][serviceUuid][characteristicUuid];

  if (characteristic) {
    var descriptors_ = [];

    for (var i = 0; i < descriptors.length; i++) {
      var descriptorUuid = descriptors[i];

      var descriptor = new Descriptor(
                            this,
                            peripheralId,
                            serviceUuid,
                            characteristicUuid,
                            descriptorUuid
                        );

      this._descriptors[peripheralId][serviceUuid][characteristicUuid][descriptorUuid] = descriptor;

      descriptors_.push(descriptor);
    }

    characteristic.descriptors = descriptors_;

    characteristic.emit('descriptorsDiscover', descriptors_);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceUuid + ', ' + characteristicUuid + ' descriptors discover!');
  }
};

Noble.prototype.readValue = function(peripheralId, serviceUuid, characteristicUuid, descriptorUuid) {
  this._bindings.readValue(peripheralId, serviceUuid, characteristicUuid, descriptorUuid);
};

Noble.prototype.onValueRead = function(peripheralId, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var descriptor = this._descriptors[peripheralId][serviceUuid][characteristicUuid][descriptorUuid];

  if (descriptor) {
    descriptor.emit('valueRead', data);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceUuid + ', ' + characteristicUuid + ', ' + descriptorUuid + ' value read!');
  }
};

Noble.prototype.writeValue = function(peripheralId, serviceUuid, characteristicUuid, descriptorUuid, data) {
  this._bindings.writeValue(peripheralId, serviceUuid, characteristicUuid, descriptorUuid, data);
};

Noble.prototype.onValueWrite = function(peripheralId, serviceUuid, characteristicUuid, descriptorUuid) {
  var descriptor = this._descriptors[peripheralId][serviceUuid][characteristicUuid][descriptorUuid];

  if (descriptor) {
    descriptor.emit('valueWrite');
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceUuid + ', ' + characteristicUuid + ', ' + descriptorUuid + ' value write!');
  }
};

Noble.prototype.readHandle = function(peripheralId, handle) {
  this._bindings.readHandle(peripheralId, handle);
};

Noble.prototype.onHandleRead = function(peripheralId, handle, data) {
  var peripheral = this._peripherals[peripheralId];

  if (peripheral) {
    peripheral.emit('handleRead' + handle, data);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ' handle read!');
  }
};

Noble.prototype.writeHandle = function(peripheralId, handle, data, withoutResponse) {
  this._bindings.writeHandle(peripheralId, handle, data, withoutResponse);
};

Noble.prototype.onHandleWrite = function(peripheralId, handle) {
  var peripheral = this._peripherals[peripheralId];

  if (peripheral) {
    peripheral.emit('handleWrite' + handle);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ' handle write!');
  }
};

Noble.prototype.onHandleNotify = function(peripheralId, handle, data) {
  var peripheral = this._peripherals[peripheralId];

  if (peripheral) {
    peripheral.emit('handleNotify', handle, data);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ' handle notify!');
  }
};

module.exports = Noble;
