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
  this.once('_read', function(error, data) {
    if (typeof(callback) === 'function') {
      callback(error, data);
    }

    if (!error) {
      this.emit('read', data);
    }
  }.bind(this));

  this._noble.read(
    this._peripheralUuid,
    this._serviceUuid,
    this.uuid
  );
};

Characteristic.prototype.write = function(data, withoutResponse, callback) {
  if (process.title !== 'browser') {
    if (!(data instanceof Buffer)) {
      throw new Error('data must be a Buffer');
    }
  }

  this.once('_write', function(error) {
    if (typeof(callback) === 'function') {
      callback(error);
    }

    if (!error) {
      this.emit('write');
    }
  }.bind(this));

  this._noble.write(
    this._peripheralUuid,
    this._serviceUuid,
    this.uuid,
    data,
    withoutResponse
  );
};

Characteristic.prototype.broadcast = function(broadcast, callback) {
  this.once('_broadcast', function(error) {
    if (typeof(callback) === 'function') {
      callback(error);
    }

    if (!error) {
      this.emit('broadcast');
    }
  }.bind(this));

  this._noble.broadcast(
    this._peripheralUuid,
    this._serviceUuid,
    this.uuid,
    broadcast
  );
};

Characteristic.prototype.notify = function(notify, callback) {
  this.once('_notify', function(error) {
    if (typeof(callback) === 'function') {
      callback(error);
    }

    if (!error) {
      this.emit('notify');
    }
  }.bind(this));

  this._noble.notify(
    this._peripheralUuid,
    this._serviceUuid,
    this.uuid,
    notify
  );
};

Characteristic.prototype.discoverDescriptors = function(callback) {
  this.once('_descriptorsDiscover', function(error, descriptors) {
    if (typeof(callback) === 'function') {
      callback(error, descriptors);
    }

    if (!error) {
      this.emit('descriptorsDiscover');
    }
  }.bind(this));

  this._noble.discoverDescriptors(
    this._peripheralUuid,
    this._serviceUuid,
    this.uuid
  );
};

module.exports = Characteristic;
