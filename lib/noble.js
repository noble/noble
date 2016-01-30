var debug = require('debug')('noble');

var events = require('events');
var os = require('os');
var util = require('util');

var Peripheral = require('./peripheral');
var Service = require('./service');
var Characteristic = require('./characteristic');
var Descriptor = require('./descriptor');

var bindings = null;

var platform = os.platform();

if (process.env.NOBLE_WEBSOCKET || process.title === 'browser') {
  bindings = require('./websocket/bindings');
} else if (process.env.NOBLE_DISTRIBUTED) {
  bindings = require('./distributed/bindings');
} else if (platform === 'darwin') {
  bindings = require('./mac/bindings');
} else if (platform === 'linux' || platform === 'win32') {
  bindings = require('./hci-socket/bindings');
} else {
  throw new Error('Unsupported platform');
}

function Noble() {
  this.state = 'unknown';

  this._bindings = bindings;
  this._peripherals = {};
  this._services = {};
  this._characteristics = {};
  this._descriptors = {};
  this._discoveredPeripheralIds = [];

  this._bindings.on('stateChange', this.onStateChange.bind(this));
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

  this._bindings.init();
}

util.inherits(Noble, events.EventEmitter);

Noble.prototype.onStateChange = function(state) {
  debug('stateChange ' + state);

  this.state = state;

  this.emit('stateChange', state);
};

Noble.prototype.startScanning = function(serviceUuids, allowDuplicates, callback) {
  if (this.state !== 'poweredOn') {
    var error = new Error('Could not start scanning, state is ' + this.state + ' (not poweredOn)');

    if (typeof callback === 'function') {
      callback(error);
    } else {
      throw error;
    }
  } else {
    if (callback) {
      this.once('scanStart', callback);
    }

    this._discoveredPeripheralIds = [];
    this._allowDuplicates = allowDuplicates;

    this._bindings.startScanning(serviceUuids, allowDuplicates);
  }
};

Noble.prototype.onScanStart = function() {
  debug('scanStart');
  this.emit('scanStart');
};

Noble.prototype.stopScanning = function(callback) {
  if (callback) {
    this.once('scanStop', callback);
  }
  this._bindings.stopScanning();
};

Noble.prototype.onScanStop = function() {
  debug('scanStop');
  this.emit('scanStop');
};

Noble.prototype.onDiscover = function(id, address, addressType, connectable, advertisement, rssi) {
  var peripheral = this._peripherals[id];

  if (!peripheral) {
    peripheral = new Peripheral(this, id, address, addressType, connectable, advertisement, rssi);

    this._peripherals[id] = peripheral;
    this._services[id] = {};
    this._characteristics[id] = {};
    this._descriptors[id] = {};
  } else {
    // "or" the advertisment data with existing
    for (var i in advertisement) {
      if (advertisement[i] !== undefined) {
        peripheral.advertisement[i] = advertisement[i];
      }
    }

    peripheral.rssi = rssi;
  }

  var previouslyDiscoverd = (this._discoveredPeripheralIds.indexOf(id) !== -1);

  if (!previouslyDiscoverd) {
    this._discoveredPeripheralIds.push(id);
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

Noble.prototype.onServicesDiscover = function(peripheralId, services) {
  var peripheral = this._peripherals[peripheralId];

  if (peripheral) {
    var services_ = [];

    for (var i = 0; i < services.length; i++) {
      var service = services[i];
      var serviceId = service.id;

      var service_ = new Service(this, peripheralId, serviceId, service.uuid);

      this._services[peripheralId][serviceId] = service_;
      this._characteristics[peripheralId][serviceId] = {};
      this._descriptors[peripheralId][serviceId] = {};

      services_.push(service_);
    }

    peripheral.services = services_;

    peripheral.emit('servicesDiscover', services_);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ' services discover!');
  }
};

Noble.prototype.discoverIncludedServices = function(peripheralId, serviceId, serviceUuids) {
  this._bindings.discoverIncludedServices(peripheralId, serviceId, serviceUuids);
};

Noble.prototype.onIncludedServicesDiscover = function(peripheralId, serviceId, includedServices) {
  var service = this._services[peripheralId][serviceId];

  if (service) {
    var includedServiceUuids_ = [];

    for (var i = 0; i < includedServices.length; i++) {
      service.includedServiceUuids_.push(includedServices[i].uuid);
    }

    service.includedServiceUuids = includedServiceUuids_;

    service.emit('includedServicesDiscover', includedServiceUuids_);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceId + ' included services discover!');
  }
};

Noble.prototype.discoverCharacteristics = function(peripheralId, serviceId, characteristicUuids) {
  this._bindings.discoverCharacteristics(peripheralId, serviceId, characteristicUuids);
};

Noble.prototype.onCharacteristicsDiscover = function(peripheralId, serviceId, characteristics) {
  var service = this._services[peripheralId][serviceId];

  if (service) {
    var characteristics_ = [];

    for (var i = 0; i < characteristics.length; i++) {
      var characteristicId = characteristics[i].id;

      var characteristic = new Characteristic(
                                this,
                                peripheralId,
                                serviceId,
                                characteristicId,
                                characteristics[i].uuid,
                                characteristics[i].properties
                            );

      this._characteristics[peripheralId][serviceId][characteristicId] = characteristic;
      this._descriptors[peripheralId][serviceId][characteristicId] = {};

      characteristics_.push(characteristic);
    }

    service.characteristics = characteristics_;

    service.emit('characteristicsDiscover', characteristics_);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceId + ' characteristics discover!');
  }
};

Noble.prototype.read = function(peripheralId, serviceId, characteristicId) {
   this._bindings.read(peripheralId, serviceId, characteristicId);
};

Noble.prototype.onRead = function(peripheralId, serviceId, characteristicId, data, isNotification) {
  var characteristic = this._characteristics[peripheralId][serviceId][characteristicId];

  if (characteristic) {
    characteristic.emit('data', data, isNotification);

    characteristic.emit('read', data, isNotification); // for backwards compatbility
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceId + ', ' + characteristicId + ' read!');
  }
};

Noble.prototype.write = function(peripheralId, serviceId, characteristicId, data, withoutResponse) {
   this._bindings.write(peripheralId, serviceId, characteristicId, data, withoutResponse);
};

Noble.prototype.onWrite = function(peripheralId, serviceId, characteristicId) {
  var characteristic = this._characteristics[peripheralId][serviceId][characteristicId];

  if (characteristic) {
    characteristic.emit('write');
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceId + ', ' + characteristicId + ' write!');
  }
};

Noble.prototype.broadcast = function(peripheralId, serviceId, characteristicId, broadcast) {
   this._bindings.broadcast(peripheralId, serviceId, characteristicId, broadcast);
};

Noble.prototype.onBroadcast = function(peripheralId, serviceId, characteristicId, state) {
  var characteristic = this._characteristics[peripheralId][serviceId][characteristicId];

  if (characteristic) {
    characteristic.emit('broadcast', state);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceId + ', ' + characteristicId + ' broadcast!');
  }
};

Noble.prototype.notify = function(peripheralId, serviceId, characteristicId, notify) {
   this._bindings.notify(peripheralId, serviceId, characteristicId, notify);
};

Noble.prototype.onNotify = function(peripheralId, serviceId, characteristicId, state) {
  var characteristic = this._characteristics[peripheralId][serviceId][characteristicId];

  if (characteristic) {
    characteristic.emit('notify', state);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceId + ', ' + characteristicId + ' notify!');
  }
};

Noble.prototype.discoverDescriptors = function(peripheralId, serviceId, characteristicId) {
  this._bindings.discoverDescriptors(peripheralId, serviceId, characteristicId);
};

Noble.prototype.onDescriptorsDiscover = function(peripheralId, serviceId, characteristicId, descriptors) {
  var characteristic = this._characteristics[peripheralId][serviceId][characteristicId];

  if (characteristic) {
    var descriptors_ = [];

    for (var i = 0; i < descriptors.length; i++) {
      var descriptor = descriptors[i];
      var descriptorId = descriptor.id;

      var descriptor_ = new Descriptor(
                            this,
                            peripheralId,
                            serviceId,
                            characteristicId,
                            descriptorId,
                            descriptor.uuid
                        );

      this._descriptors[peripheralId][serviceId][characteristicId][descriptorId] = descriptor_;

      descriptors_.push(descriptor_);
    }

    characteristic.descriptors = descriptors_;

    characteristic.emit('descriptorsDiscover', descriptors_);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceId + ', ' + characteristicId + ' descriptors discover!');
  }
};

Noble.prototype.readValue = function(peripheralId, serviceId, characteristicId, descriptorId) {
  this._bindings.readValue(peripheralId, serviceId, characteristicId, descriptorId);
};

Noble.prototype.onValueRead = function(peripheralId, serviceId, characteristicId, descriptorId, data) {
  var descriptor = this._descriptors[peripheralId][serviceId][characteristicId][descriptorId];

  if (descriptor) {
    descriptor.emit('valueRead', data);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceId + ', ' + characteristicId + ', ' + descriptorId + ' value read!');
  }
};

Noble.prototype.writeValue = function(peripheralId, serviceId, characteristicId, descriptorId, data) {
  this._bindings.writeValue(peripheralId, serviceId, characteristicId, descriptorId, data);
};

Noble.prototype.onValueWrite = function(peripheralId, serviceId, characteristicId, descriptorId) {
  var descriptor = this._descriptors[peripheralId][serviceId][characteristicId][descriptorId];

  if (descriptor) {
    descriptor.emit('valueWrite');
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralId + ', ' + serviceIdserviceId + ', ' + characteristicId + ', ' + descriptorId + ' value write!');
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
