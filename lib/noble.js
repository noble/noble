var debug = require('debug')('noble');

var events = require('events');
var util = require('util');

var Peripheral = require('./peripheral');
var Service = require('./service');
var Characteristic = require('./characteristic');
var Descriptor = require('./descriptor');

var bindings = require('./bindings');

function Noble() {
  this._bindings = bindings;
  this._peripherals = {};

  this._bindings.on('stateChange', this.onStateChange.bind(this));
  this._bindings.on('scanStart', this.onScanStart.bind(this));
  this._bindings.on('scanStop', this.onScanStop.bind(this));
  this._bindings.on('peripheralDiscover', this.onPeripheralDiscover.bind(this));
  this._bindings.on('peripheralConnect', this.onPeripheralConnect.bind(this));
  this._bindings.on('peripheralDisconnect', this.onPeripheralDisconnect.bind(this));
  this._bindings.on('peripheralRssiUpdate', this.onPeripheralRssiUpdate.bind(this));
  this._bindings.on('peripheralServicesDiscover', this.onPeripheralServicesDiscover.bind(this));
  this._bindings.on('peripheralServiceIncludedServicesDiscover', this.onPeripheralServiceIncludedServicesDiscover.bind(this));
  this._bindings.on('peripheralServiceCharacteristicsDiscover', this.onPeripheralServiceCharacteristicsDiscover.bind(this));
  this._bindings.on('peripheralServiceCharacteristicRead', this.onPeripheralServiceCharacteristicRead.bind(this));
  this._bindings.on('peripheralServiceCharacteristicWrite', this.onPeripheralServiceCharacteristicWrite.bind(this));
  this._bindings.on('peripheralServiceCharacteristicBroadcast', this.onPeripheralServiceCharacteristicBroadcast.bind(this));
  this._bindings.on('peripheralServiceCharacteristicNotify', this.onPeripheralServiceCharacteristicNotify.bind(this));
  this._bindings.on('peripheralServiceCharacteristicDescriptorsDiscover', this.onPeripheralServiceCharacteristicDescriptorsDiscover.bind(this));
  this._bindings.on('peripheralServiceCharacteristicDescriptorRead', this.onPeripheralServiceCharacteristicDescriptorRead.bind(this));
  this._bindings.on('peripheralServiceCharacteristicDescriptorWrite', this.onPeripheralServiceCharacteristicDescriptorWrite.bind(this));
}

util.inherits(Noble, events.EventEmitter);

Noble.prototype.onStateChange = function(state) {
  debug('stateChange ' + state);
  this.emit('stateChange', state);
};

Noble.prototype.startScanning = function(serviceUuids, allowDuplicates) {
  this._bindings.startScanning(serviceUuids, allowDuplicates);
};

Noble.prototype.onScanStart = function() {
  debug('scanStart');
  this.emit('scanStart');
};

Noble.prototype.stopScanning = function() {
  this._bindings.stopScanning();
};

Noble.prototype.onScanStop = function() {
  debug('scanStop');
  this.emit('scanStop');
};

Noble.prototype.onPeripheralDiscover = function(uuid, advertisement, rssi) {
  var peripheral = new Peripheral(this, uuid, advertisement, rssi);

  this._peripherals[uuid] = peripheral;

  this.emit('peripheralDiscover', peripheral);
};

Noble.prototype.connectPeripheral = function(uuid) {
  this._bindings.connectPeripheral(uuid);
};

Noble.prototype.onPeripheralConnect = function(uuid) {
  var peripheral = this._peripherals[uuid];

  this.emit('peripheralConnect', peripheral);
  peripheral.emit('connect');
};

Noble.prototype.disconnectPeripheral = function(uuid) {
  this._bindings.disconnectPeripheral(uuid);
};

Noble.prototype.onPeripheralDisconnect = function(uuid) {
  var peripheral = this._peripherals[uuid];

  this.emit('peripheralDisconnect', peripheral);
  peripheral.emit('disconnect');
};

Noble.prototype.updatePeripheralRssi = function(uuid) {
  this._bindings.updatePeripheralRssi(uuid);
};

Noble.prototype.onPeripheralRssiUpdate = function(uuid, rssi) {
  var peripheral = this._peripherals[uuid];

  peripheral.rssi = rssi;

  this.emit('peripheralRssiUpdate', peripheral, rssi);

  peripheral.emit('rssiUpdate', rssi);
};

Noble.prototype.discoverPeripheralServices = function(uuid, uuids) {
  this._bindings.discoverPeripheralServices(uuid, uuids);
};

Noble.prototype.onPeripheralServicesDiscover = function(uuid, serviceUuids) {
  var peripheral = this._peripherals[uuid];
  var services = [];

  for (var i = 0; i < serviceUuids.length; i++) {
    services.push(new Service(peripheral, serviceUuids[i]));
  }

  peripheral.services = services;

  this.emit('peripheralServicesDiscover', peripheral, services);
  peripheral.emit('servicesDiscover', services);
};

Noble.prototype.discoverPeripheralServiceIncludedServices = function(uuid, serviceUuid, serviceUuids) {
  this._bindings.discoverPeripheralServiceIncludedServices(uuid, serviceUuid, serviceUuids);
};

Noble.prototype.onPeripheralServiceIncludedServicesDiscover = function(uuid, serviceUuid, includedServiceUuids) {
  var peripheral = this._peripherals[uuid];

  for(var i = 0; i < peripheral.services.length; i++) {
    var service = peripheral.services[i];
    if (service.uuid === serviceUuid) {
      this.emit('peripheralServiceIncludedServicesDiscover', peripheral, service, includedServiceUuids);
      peripheral.emit('serviceIncludedServicesDiscover', service, includedServiceUuids);
      service.emit('includedServicesDiscover', includedServiceUuids);
      break;
    }
  }
};

Noble.prototype.discoverPeripheralServiceCharacteristics = function(uuid, serviceUuid, characteristicUuids) {
  this._bindings.discoverPeripheralServiceCharacteristics(uuid, serviceUuid, characteristicUuids);
};

Noble.prototype.onPeripheralServiceCharacteristicsDiscover = function(uuid, serviceUuid, characteristics) {
  var peripheral = this._peripherals[uuid];

  for(var i = 0; i < peripheral.services.length; i++) {
    var service = peripheral.services[i];
    if (service.uuid === serviceUuid) {  
      var characteristics_ = [];
      for (var j = 0; j < characteristics.length; j++) {
        characteristics_[j] = new Characteristic(service, characteristics[j].uuid, characteristics[j].properties);
      }

      service.characteristics = characteristics_;

      this.emit('peripheralServiceCharacteristicsDiscover', peripheral, service, characteristics_);
      peripheral.emit('serviceCharacteristicsDiscover', service, characteristics_);
      service.emit('characteristicsDiscover', characteristics_);
      break;
    }
  }
};

Noble.prototype.readPeripheralServiceCharacteristic = function(uuid, serviceUuid, characteristicUuid) {
   this._bindings.readPeripheralServiceCharacteristic(uuid, serviceUuid, characteristicUuid);
};

Noble.prototype.onPeripheralServiceCharacteristicRead = function(uuid, serviceUuid, characteristicUuid, data, isNotification) {
  var peripheral = this._peripherals[uuid];

  for(var i = 0; i < peripheral.services.length; i++) {
    var service = peripheral.services[i];
    if (service.uuid === serviceUuid) {  
      for (var j = 0; j < service.characteristics.length; j++) {
        var characteristic = service.characteristics[j];
        if (characteristic.uuid === characteristicUuid) {
          this.emit('peripheralServiceCharacteristicRead', peripheral, service, characteristic, data, isNotification);
          peripheral.emit('serviceCharacteristicRead', service, characteristic, data, isNotification);
          service.emit('characteristicRead', characteristic, data, isNotification);
          characteristic.emit('read', data, isNotification);
          break;
        }
      }
      break;
    }
  }
};

Noble.prototype.writePeripheralServiceCharacteristic = function(uuid, serviceUuid, characteristicUuid, data, notify) {
   this._bindings.writePeripheralServiceCharacteristic(uuid, serviceUuid, characteristicUuid, data, notify);
};

Noble.prototype.onPeripheralServiceCharacteristicWrite = function(uuid, serviceUuid, characteristicUuid) {
  var peripheral = this._peripherals[uuid];

  for(var i = 0; i < peripheral.services.length; i++) {
    var service = peripheral.services[i];
    if (service.uuid === serviceUuid) {  
      for (var j = 0; j < service.characteristics.length; j++) {
        var characteristic = service.characteristics[j];
        if (characteristic.uuid === characteristicUuid) {
          this.emit('peripheralServiceCharacteristicWrite', peripheral, service, characteristic);
          peripheral.emit('serviceCharacteristicWrite', service, characteristic);
          service.emit('characteristicWrite', characteristic);
          characteristic.emit('write');
          break;
        }
      }
      break;
    }
  }
};

Noble.prototype.broadcastPeripheralServiceCharacteristic = function(uuid, serviceUuid, characteristicUuid, broadcast) {
   this._bindings.broadcastPeripheralServiceCharacteristic(uuid, serviceUuid, characteristicUuid, broadcast);
};

Noble.prototype.onPeripheralServiceCharacteristicBroadcast = function(uuid, serviceUuid, characteristicUuid, state) {
  var peripheral = this._peripherals[uuid];

  for(var i = 0; i < peripheral.services.length; i++) {
    var service = peripheral.services[i];
    if (service.uuid === serviceUuid) {  
      for (var j = 0; j < service.characteristics.length; j++) {
        var characteristic = service.characteristics[j];
        if (characteristic.uuid === characteristicUuid) {
          this.emit('peripheralServiceCharacteristicBroadcast', peripheral, service, characteristic, state);
          peripheral.emit('serviceCharacteristicBroadcast', service, characteristic, state);
          service.emit('characteristicBroadcast', characteristic, state);
          characteristic.emit('broadcast', state);
          break;
        }
      }
      break;
    }
  }
};

Noble.prototype.notifyPeripheralServiceCharacteristic = function(uuid, serviceUuid, characteristicUuid, notify) {
   this._bindings.notifyPeripheralServiceCharacteristic(uuid, serviceUuid, characteristicUuid, notify);
};

Noble.prototype.onPeripheralServiceCharacteristicNotify = function(uuid, serviceUuid, characteristicUuid, state) {
  var peripheral = this._peripherals[uuid];

  for(var i = 0; i < peripheral.services.length; i++) {
    var service = peripheral.services[i];
    if (service.uuid === serviceUuid) {  
      for (var j = 0; j < service.characteristics.length; j++) {
        var characteristic = service.characteristics[j];
        if (characteristic.uuid === characteristicUuid) {
          this.emit('peripheralServiceCharacteristicNotify', peripheral, service, characteristic, state);
          peripheral.emit('serviceCharacteristicNotify', service, characteristic, state);
          service.emit('characteristicNotify', characteristic, state);
          characteristic.emit('notify', state);
          break;
        }
      }
      break;
    }
  }
};

Noble.prototype.discoverPeripheralServiceCharacteristicDescriptors = function(uuid, serviceUuid, characteristicUuid) {
  this._bindings.discoverPeripheralServiceCharacteristicDescriptors(uuid, serviceUuid, characteristicUuid);
};

Noble.prototype.onPeripheralServiceCharacteristicDescriptorsDiscover = function(uuid, serviceUuid, characteristicUuid, descriptors) {
  var peripheral = this._peripherals[uuid];

  for(var i = 0; i < peripheral.services.length; i++) {
    var service = peripheral.services[i];
    if (service.uuid === serviceUuid) {  
      for (var j = 0; j < service.characteristics.length; j++) {
        var characteristic = service.characteristics[j];
        if (characteristic.uuid === characteristicUuid) {
          var descriptors_ = [];

          for (var k = 0; k < descriptors.length; k++) {
            descriptors_.push(new Descriptor(characteristic, descriptors[k]));
          }

          characteristic.descriptors = descriptors_;

          this.emit('peripheralServiceCharacteristicDescriptorsDiscover', peripheral, service, characteristic, descriptors_);
          peripheral.emit('serviceCharacteristicDescriptorsDiscover', service, characteristic, descriptors_);
          service.emit('characteristicDescriptorsDiscover', characteristic, descriptors_);
          characteristic.emit('descriptorsDiscover', descriptors_);
          break;
        }
      }
      break;
    }
  }
};

Noble.prototype.readServiceCharacteristicDescriptorValue = function(uuid, serviceUuid, characteristicUuid, descriptorUuid) {
  this._bindings.readServiceCharacteristicDescriptorValue(uuid, serviceUuid, characteristicUuid, descriptorUuid);
};

Noble.prototype.onPeripheralServiceCharacteristicDescriptorRead = function(uuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var peripheral = this._peripherals[uuid];

  for(var i = 0; i < peripheral.services.length; i++) {
    var service = peripheral.services[i];
    if (service.uuid === serviceUuid) {  
      for (var j = 0; j < service.characteristics.length; j++) {
        var characteristic = service.characteristics[j];
        if (characteristic.uuid === characteristicUuid) {
          for (var k = 0; k < characteristic.descriptors.length; k++){
            var descriptor = characteristic.descriptors[k];
            if (descriptor.uuid === descriptorUuid) {
              this.emit('peripheralServiceCharacteristicDescriptorValueRead', peripheral, service, characteristic, descriptor, data);
              peripheral.emit('serviceCharacteristicDescriptorsValueRead', service, characteristic, descriptor, data);
              service.emit('characteristicDescriptorValueRead', characteristic, descriptor, data);
              characteristic.emit('descriptorValueRead', descriptor, data);
              descriptor.emit('valueRead', data);
              break;
            }
          }
          break;
        }
      }
      break;
    }
  }
};

Noble.prototype.writeServiceCharacteristicDescriptorValue = function(uuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  this._bindings.writeServiceCharacteristicDescriptorValue(uuid, serviceUuid, characteristicUuid, descriptorUuid, data);
};

Noble.prototype.onPeripheralServiceCharacteristicDescriptorWrite = function(uuid, serviceUuid, characteristicUuid, descriptorUuid) {
  var peripheral = this._peripherals[uuid];
  
  for(var i = 0; i < peripheral.services.length; i++) {
    var service = peripheral.services[i];
    if (service.uuid === serviceUuid) {  
      for (var j = 0; j < service.characteristics.length; j++) {
        var characteristic = service.characteristics[j];
        if (characteristic.uuid === characteristicUuid) {
          for (var k = 0; k < characteristic.descriptors.length; k++){
            var descriptor = characteristic.descriptors[k];
            if (descriptor.uuid === descriptorUuid) {
              this.emit('peripheralServiceCharacteristicDescriptorValueWrite', peripheral, service, characteristic, descriptor);
              peripheral.emit('serviceCharacteristicDescriptorsValueWrite', service, characteristic, descriptor);
              service.emit('characteristicDescriptorValueWrite', characteristic, descriptor);
              characteristic.emit('descriptorValueWrite', descriptor);
              descriptor.emit('valueWrite');
              break;
            }
          }
          break;
        }
      }
      break;
    }
  }
};

module.exports = Noble;
