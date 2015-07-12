var debug = require('debug')('descriptor');

var events = require('events');
var util = require('util');

var descriptors = require('./descriptors.json');

function Descriptor(noble, peripheralUuid, serviceUuid, characteristicUuid, uuid) {
  this._noble = noble;
  this._peripheralUuid = peripheralUuid;
  this._serviceUuid = serviceUuid;
  this._characteristicUuid = characteristicUuid;

  this.uuid = uuid;
  this.name = null;
  this.type = null;

  var descriptor = descriptors[uuid];
  if (descriptor) {
    this.name = descriptor.name;
    this.type = descriptor.type;
  }
}

util.inherits(Descriptor, events.EventEmitter);

Descriptor.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    name: this.name,
    type: this.type
  });
};

Descriptor.prototype.readValue = function(callback) {
  this.once('_valueRead', function(error, data) {
    if (typeof(callback) === 'function') {
      callback(error, data);
    }

    if (!error) {
      this.emit('valueRead', data);
    }
  }.bind(this));

  this._noble.readValue(
    this._peripheralUuid,
    this._serviceUuid,
    this._characteristicUuid,
    this.uuid
  );
};

Descriptor.prototype.writeValue = function(data, callback) {
  if (!(data instanceof Buffer)) {
    throw new Error('data must be a Buffer');
  }

  this.once('_valueWrite', function(error) {
    if (typeof(callback) === 'function') {
      callback(error);
    }

    if (!error) {
      this.emit('valueWrite');
    }
  }.bind(this));

  this._noble.writeValue(
    this._peripheralUuid,
    this._serviceUuid,
    this._characteristicUuid,
    this.uuid,
    data
  );
};

module.exports = Descriptor;
