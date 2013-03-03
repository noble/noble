var debug = require('debug')('service');

var events = require('events');
var util = require('util');

function Service(peripheral, uuid) {
  this._peripheral = peripheral;
  this.uuid = uuid;
  this.includedServiceUuids = null;
  this.characteristics = null;
}

util.inherits(Service, events.EventEmitter);

Service.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    includedServiceUuids: this.includedServiceUuids//,
    // characteristics: this.characteristics
  });
};

Service.prototype.discoverIncludedServices = function(serviceUuids) {
  this._peripheral.discoverServiceIncludedServices(this.uuid, serviceUuids);
};

Service.prototype.discoverCharacteristics = function(characteristicUuids) {
  this._peripheral.discoverServiceCharacteristics(this.uuid, characteristicUuids);
};

Service.prototype.readCharacteristic = function(uuid) {
  this._peripheral.readServiceCharacteristics(this.uuid, uuid);
};

Service.prototype.writeCharacteristic = function(uuid, data, notify) {
  this._peripheral.writeServiceCharacteristics(this.uuid, uuid, data, notify);
};

Service.prototype.broadcastCharacteristic = function(uuid, broadcast) {
  this._peripheral.broadcastServiceCharacteristics(this.uuid, uuid, broadcast);
};

Service.prototype.notifyCharacteristic = function(uuid, notify) {
  this._peripheral.notifyServiceCharacteristics(this.uuid, uuid, notify);
};

Service.prototype.discoverCharacteristicDescriptors = function(uuid) {
  this._peripheral.discoverServiceCharacteristicDescriptors(this.uuid, uuid);
};

Service.prototype.readCharacteristicDescriptorValue = function(uuid, descriptorUuid) {
  this._peripheral.readServiceCharacteristicDescriptorValue(this.uuid, uuid, descriptorUuid);
};

Service.prototype.writeCharacteristicDescriptorValue = function(uuid, descriptorUuid, data) {
  this._peripheral.writeServiceCharacteristicDescriptorValue(this.uuid, uuid, descriptorUuid, data);
};


module.exports = Service;
