var debug = require('debug')('descriptor');

var events = require('events');
var util = require('util');

var descriptors = require('./descriptors.json');

function Descriptor(noble, peripheralId, serviceUuid, characteristicUuid, uuid) {
  this._noble = noble;
  this._peripheralId = peripheralId;
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
  if (callback) {
    this.once('valueRead', function(data) {
      callback(null, data);
    });
  }
  this._noble.readValue(
    this._peripheralId,
    this._serviceUuid,
    this._characteristicUuid,
    this.uuid
  );
};

Descriptor.prototype.writeValue = function(data, callback) {
  if (!(data instanceof Buffer)) {
    throw new Error('data must be a Buffer');
  }

  if (callback) {
    this.once('valueWrite', function() {
      callback(null);
    });
  }
  this._noble.writeValue(
    this._peripheralId,
    this._serviceUuid,
    this._characteristicUuid,
    this.uuid,
    data
  );
};

module.exports = Descriptor;
