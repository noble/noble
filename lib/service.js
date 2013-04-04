var debug = require('debug')('service');

var events = require('events');
var util = require('util');

var services = require('./services.json');

function Service(peripheral, uuid) {
  this._peripheral = peripheral;
  this.uuid = uuid;
  this.name = null;
  this.type = null;
  this.includedServiceUuids = null;
  this.characteristics = null;

  var service = services[uuid];
  if (service) {
    this.name = service.name;
    this.type = service.type;
  }
}

util.inherits(Service, events.EventEmitter);

Service.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    name: this.name,
    type: this.type,
    includedServiceUuids: this.includedServiceUuids
  });
};

Service.prototype.discoverIncludedServices = function(serviceUuids, callback) {
  if (callback) {
    this.once('includedServicesDiscover', callback);
  }
  this._peripheral.discoverServiceIncludedServices(this.uuid, serviceUuids);
};

Service.prototype.discoverCharacteristics = function(characteristicUuids, callback) {
  if (callback) {
    this.once('characteristicsDiscover', callback);
  }
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
