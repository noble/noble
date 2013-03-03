var debug = require('debug')('characteristic');

var events = require('events');
var util = require('util');

function Characteristic(service, uuid, properties) {
  this._service = service;
  this.uuid = uuid;
  this.properties = properties;
  this.descriptors = null;
}

util.inherits(Characteristic, events.EventEmitter);

Characteristic.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    properties: this.properties//,
    // descriptors: this.descriptors
  });
};

Characteristic.prototype.read = function() {
  this._service.readCharacteristic(this.uuid);
};

Characteristic.prototype.write = function(data, notify) {
  this._service.writeCharacteristic(this.uuid, data, notify);
};

Characteristic.prototype.broadcast = function(broadcast) {
  this._service.broadcastCharacteristic(this.uuid, broadcast);
};

Characteristic.prototype.notify = function(notify) {
  this._service.notifyCharacteristic(this.uuid, notify);
};

Characteristic.prototype.discoverDescriptors = function() {
  this._service.discoverCharacteristicDescriptors(this.uuid);
};

Characteristic.prototype.readDescriptorValue = function(uuid) {
  this._service.readCharacteristicDescriptorValue(this.uuid, uuid);
};

Characteristic.prototype.writeDescriptorValue = function(uuid, data) {
  this._service.writeCharacteristicDescriptorValue(this.uuid, uuid, data);
};

module.exports = Characteristic;
