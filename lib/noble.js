var debug = require('debug')('noble');

var events = require('events');
var util = require('util');

var Peripheral = require('./peripheral');
var Service = require('./service');
var Characteristic = require('./characteristic');
var Descriptor = require('./descriptor');

var PeripheralCache = require("./peripheralCache");

// The max cache age sets the minimum time we will cache device information in the peripheral cache.
// The BLE maximum advertising interval is 10.24s + 10ms random delay,
// and broadcasts cycle through 3 channels, so the maximum full cycle is 30.75s.
// This default is slightly longer than two full cycles. 
var DEFAULT_MAX_CACHE_AGE = 62000;

function Noble(bindings) {
  this.initialized = false;

  this.address = 'unknown';
  this._state = 'unknown';
  this._bindings = bindings;
  this._peripheralCache = new PeripheralCache();

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
      this.initialized = true;

      process.nextTick(function() {
        this._bindings.init();
      }.bind(this));
    }
  }.bind(this));

  //or lazy init bindings if someone attempts to get state first
  Object.defineProperties(this, {
    state: {
      get: function () {
        if (!this.initialized) {
          this.initialized = true;

          this._bindings.init();
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

      this._allowDuplicates = allowDuplicates;
      if(this._peripheralCache){
        this._peripheralCache.stopSweeping();
      }
      if(allowDuplicates){
        this._peripheralCache = new PeripheralCache(DEFAULT_MAX_CACHE_AGE);
        this._peripheralCache.startSweeping();
      }

      this._bindings.startScanning(serviceUuids, allowDuplicates);
    }
  };

  //if bindings still not init, do it now
  if (!this.initialized) {
    this.initialized = true;

    this._bindings.init();

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
  if (this._bindings && this.initialized) {
    this._bindings.stopScanning();
  }
  this._peripheralCache.stopSweeping();
};

Noble.prototype.onScanStop = function() {
  debug('scanStop');
  this.emit('scanStop');
};

Noble.prototype.onDiscover = function(uuid, address, addressType, connectable, advertisement, rssi) {
  var peripheral = this._peripheralCache.getPeripheral(uuid);
  var previouslyDiscovered = false;

  if (!peripheral) {
    peripheral = new Peripheral(this, uuid, address, addressType, connectable, advertisement, rssi);
    peripheral._hasScanResponse = advertisement.isScanResponse;
    peripheral._discovered = false;
    this._peripheralCache.addPeripheral(peripheral);
  } else {
    //update the peripheral state
    if (connectable !== undefined){
      peripheral.connectable = connectable;
    }
    if (advertisement.isScanResponse){
      peripheral._hasScanResponse = true;
    }

    //merge the advertisement state
    for (var i in advertisement) {
      if (i != "serviceData" && advertisement[i] !== undefined) {
        peripheral.advertisement[i] = advertisement[i];
      }
    }
    //replace any service data entries this advertisement contains
    var updatedServiceDataUuids = {};
    advertisement.serviceData.map(function(entry){ return entry.uuid; }).forEach(function(uuid){ updatedServiceDataUuids[uuid] = true; });
    peripheral.advertisement.serviceData = peripheral.advertisement.serviceData.filter(function(entry){ 
      return !updatedServiceDataUuids[entry.uuid]; 
    }).concat(advertisement.serviceData);

    peripheral.connectable = connectable;
    peripheral.rssi = rssi;
    previouslyDiscovered = true;
  }

  //if using HCI, only report after a scan response event or if non-connectable or more than one discovery without a scan response, so more data can be collected
  var reportThisEvent = advertisement.isScanResponse === undefined || // not from hci
    process.env.NOBLE_REPORT_ALL_HCI_EVENTS ||
    advertisement.isScanResponse ||
    !connectable ||
    (previouslyDiscovered && !peripheral._hasScanResponse);

  if (reportThisEvent && (this._allowDuplicates || !peripheral._discovered)) {
    this.emit('discover', peripheral, advertisement);
    peripheral._discovered = true;
  }
};

Noble.prototype.connect = function(peripheralUuid) {
  this._bindings.connect(peripheralUuid);
};

Noble.prototype.onConnect = function(peripheralUuid, error) {
  var peripheral = this._peripheralCache.getPeripheral(peripheralUuid);

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
  var peripheral = this._peripheralCache.getPeripheral(peripheralUuid);

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
  var peripheral = this._peripheralCache.getPeripheral(peripheralUuid);

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
  var peripheral = this._peripheralCache.getPeripheral(peripheralUuid);

  if (peripheral) {
    var services = [];

    for (var i = 0; i < serviceUuids.length; i++) {
      var serviceUuid = serviceUuids[i];
      var service = new Service(this, peripheralUuid, serviceUuid);

      this._peripheralCache.addService(peripheralUuid, service);

      services.push(service);
    }

    peripheral.services = services;

    peripheral.emit('servicesDiscover', services);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ' services discover!');
  }
};

Noble.prototype.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  this._bindings.discoverIncludedServices(peripheralUuid, serviceUuid, serviceUuids);
};

Noble.prototype.onIncludedServicesDiscover = function(peripheralUuid, serviceUuid, includedServiceUuids) {
  var service = this._peripheralCache.getService(peripheralUuid, serviceUuid);

  if (service) {
    service.includedServiceUuids = includedServiceUuids;

    service.emit('includedServicesDiscover', includedServiceUuids);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceUuid + ' included services discover!');
  }
};

Noble.prototype.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {
  this._bindings.discoverCharacteristics(peripheralUuid, serviceUuid, characteristicUuids);
};

Noble.prototype.onCharacteristicsDiscover = function(peripheralUuid, serviceUuid, characteristics) {
  var service = this._peripheralCache.getService(peripheralUuid, serviceUuid);

  if (service) {
    var characteristics_ = [];

    for (var i = 0; i < characteristics.length; i++) {
      var characteristicUuid = characteristics[i].uuid;

      var characteristic = new Characteristic(
                                this,
                                peripheralUuid,
                                serviceUuid,
                                characteristicUuid,
                                characteristics[i].properties
                            );

      this._peripheralCache.addCharacteristic(peripheralUuid, serviceUuid, characteristic);

      characteristics_.push(characteristic);
    }

    service.characteristics = characteristics_;

    service.emit('characteristicsDiscover', characteristics_);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceUuid + ' characteristics discover!');
  }
};

Noble.prototype.read = function(peripheralUuid, serviceUuid, characteristicUuid) {
   this._bindings.read(peripheralUuid, serviceUuid, characteristicUuid);
};

Noble.prototype.onRead = function(peripheralUuid, serviceUuid, characteristicUuid, data, isNotification) {
  var characteristic = this._peripheralCache.getCharacteristic(peripheralUuid, serviceUuid, characteristicUuid);

  if (characteristic) {
    characteristic.emit('data', data, isNotification);

    characteristic.emit('read', data, isNotification); // for backwards compatbility
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceUuid + ', ' + characteristicUuid + ' read!');
  }
};

Noble.prototype.write = function(peripheralUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
   this._bindings.write(peripheralUuid, serviceUuid, characteristicUuid, data, withoutResponse);
};

Noble.prototype.onWrite = function(peripheralUuid, serviceUuid, characteristicUuid) {
  var characteristic = this._peripheralCache.getCharacteristic(peripheralUuid, serviceUuid, characteristicUuid);

  if (characteristic) {
    characteristic.emit('write');
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceUuid + ', ' + characteristicUuid + ' write!');
  }
};

Noble.prototype.broadcast = function(peripheralUuid, serviceUuid, characteristicUuid, broadcast) {
   this._bindings.broadcast(peripheralUuid, serviceUuid, characteristicUuid, broadcast);
};

Noble.prototype.onBroadcast = function(peripheralUuid, serviceUuid, characteristicUuid, state) {
  var characteristic = this._peripheralCache.getCharacteristic(peripheralUuid, serviceUuid, characteristicUuid);

  if (characteristic) {
    characteristic.emit('broadcast', state);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceUuid + ', ' + characteristicUuid + ' broadcast!');
  }
};

Noble.prototype.notify = function(peripheralUuid, serviceUuid, characteristicUuid, notify) {
   this._bindings.notify(peripheralUuid, serviceUuid, characteristicUuid, notify);
};

Noble.prototype.onNotify = function(peripheralUuid, serviceUuid, characteristicUuid, state) {
  var characteristic = this._peripheralCache.getCharacteristic(peripheralUuid, serviceUuid, characteristicUuid);

  if (characteristic) {
    characteristic.emit('notify', state);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceUuid + ', ' + characteristicUuid + ' notify!');
  }
};

Noble.prototype.discoverDescriptors = function(peripheralUuid, serviceUuid, characteristicUuid) {
  this._bindings.discoverDescriptors(peripheralUuid, serviceUuid, characteristicUuid);
};

Noble.prototype.onDescriptorsDiscover = function(peripheralUuid, serviceUuid, characteristicUuid, descriptors) {
  var characteristic = this._peripheralCache.getCharacteristic(peripheralUuid, serviceUuid, characteristicUuid);

  if (characteristic) {
    var descriptors_ = [];

    for (var i = 0; i < descriptors.length; i++) {
      var descriptorUuid = descriptors[i];

      var descriptor = new Descriptor(
                            this,
                            peripheralUuid,
                            serviceUuid,
                            characteristicUuid,
                            descriptorUuid
                        );

      this._peripheralCache.addDescriptor(peripheralUuid, serviceUuid, characteristicUuid, descriptor);

      descriptors_.push(descriptor);
    }

    characteristic.descriptors = descriptors_;

    characteristic.emit('descriptorsDiscover', descriptors_);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceUuid + ', ' + characteristicUuid + ' descriptors discover!');
  }
};

Noble.prototype.readValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  this._bindings.readValue(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid);
};

Noble.prototype.onValueRead = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var descriptor = this._peripheralCache.getDescriptor(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid);

  if (descriptor) {
    descriptor.emit('valueRead', data);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceUuid + ', ' + characteristicUuid + ', ' + descriptorUuid + ' value read!');
  }
};

Noble.prototype.writeValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  this._bindings.writeValue(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data);
};

Noble.prototype.onValueWrite = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  var descriptor = this._peripheralCache.getDescriptor(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid);

  if (descriptor) {
    descriptor.emit('valueWrite');
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ', ' + serviceUuid + ', ' + characteristicUuid + ', ' + descriptorUuid + ' value write!');
  }
};

Noble.prototype.readHandle = function(peripheralUuid, handle) {
  this._bindings.readHandle(peripheralUuid, handle);
};

Noble.prototype.onHandleRead = function(peripheralUuid, handle, data) {
  var peripheral = this._peripheralCache.getPeripheral(peripheralUuid);

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
  var peripheral = this._peripheralCache.getPeripheral(peripheralUuid);

  if (peripheral) {
    peripheral.emit('handleWrite' + handle);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ' handle write!');
  }
};

Noble.prototype.onHandleNotify = function(peripheralUuid, handle, data) {
  var peripheral = this._peripheralCache.getPeripheral(peripheralUuid);

  if (peripheral) {
    peripheral.emit('handleNotify', handle, data);
  } else {
    this.emit('warning', 'unknown peripheral ' + peripheralUuid + ' handle notify!');
  }
};

module.exports = Noble;
