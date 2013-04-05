var debug = require('debug')('characteristic');

var events = require('events');
var util = require('util');

var characteristics = require('./characteristics.json');

function Characteristic(noble, peripheralUuid, serviceUuid, uuid, properties) {
  this._noble = noble;
  this._peripheralUuid = peripheralUuid;
  this._serviceUuid = serviceUuid;

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

  this._noble.read(
    this._peripheralUuid,
    this._serviceUuid,
    this.uuid
  );
};

Characteristic.prototype.write = function(data, notify, callback) {
  if (!(data instanceof Buffer)) {
    throw new Error('data must be a Buffer');
  }

  if (callback) {
    this.once('write', callback);
  }

  this._noble.write(
    this._peripheralUuid,
    this._serviceUuid,
    this.uuid,
    data,
    notify
  );
};

Characteristic.prototype.broadcast = function(broadcast, callback) {
  if (callback) {
    this.once('broadcast', callback);
  }

  this._noble.broadcast(
    this._peripheralUuid,
    this._serviceUuid,
    this.uuid,
    broadcast
  );
};

Characteristic.prototype.notify = function(notify, callback) {
  if (callback) {
    this.once('notify', callback);
  }

  this._noble.notify(
    this._peripheralUuid,
    this._serviceUuid,
    this.uuid,
    notify
  );
};

Characteristic.prototype.discoverDescriptors = function(callback) {
  if (callback) {
    this.once('descriptorsDiscover', callback);
  }

  this._noble.discoverDescriptors(
    this._peripheralUuid,
    this._serviceUuid,
    this.uuid
  );
};

module.exports = Characteristic;
