var debug = require('debug')('characteristic');

var events = require('events');
var util = require('util');

var characteristics = require('./characteristics.json');

function Characteristic(service, uuid, properties) {
  this._service = service;
  this.uuid = uuid;
  this.name = null;
  this.type = null;
  this.properties = properties;
  this.descriptors = null;

  var characteristic = characteristics[uuid];
  if (characteristic) {
    this.name = characteristic.name;
    this.type = characteristic.type;
  }
}

util.inherits(Characteristic, events.EventEmitter);

Characteristic.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    name: this.name,
    type: this.type,
    properties: this.properties
  });
};

Characteristic.prototype.read = function(callback) {
  if (callback) {
    this.once('read', callback);
  }
  this._service.readCharacteristic(this.uuid);
};

Characteristic.prototype.write = function(data, notify, callback) {
  if (!(data instanceof Buffer)) {
    throw new Error('data must be a Buffer');
  }

  if (callback) {
    this.once('write', callback);
  }
  this._service.writeCharacteristic(this.uuid, data, notify);
};

Characteristic.prototype.broadcast = function(broadcast, callback) {
  if (callback) {
    this.once('broadcast', callback);
  }
  this._service.broadcastCharacteristic(this.uuid, broadcast);
};

Characteristic.prototype.notify = function(notify, callback) {
  if (callback) {
    this.once('notify', callback);
  }
  this._service.notifyCharacteristic(this.uuid, notify);
};

Characteristic.prototype.discoverDescriptors = function(callback) {
  if (callback) {
    this.once('descriptorsDiscover', callback);
  }
  this._service.discoverCharacteristicDescriptors(this.uuid);
};

Characteristic.prototype.readDescriptorValue = function(uuid) {
  this._service.readCharacteristicDescriptorValue(this.uuid, uuid);
};

Characteristic.prototype.writeDescriptorValue = function(uuid, data) {
  this._service.writeCharacteristicDescriptorValue(this.uuid, uuid, data);
};

module.exports = Characteristic;
