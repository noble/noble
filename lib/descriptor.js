var debug = require('debug')('descriptor');

var events = require('events');
var util = require('util');

var descriptors = require('./descriptors.json');

function Descriptor(noble, peripheralId, serviceId, serviceUuid, characteristicId, characteristicUuid, id, uuid) {
  this._noble = noble;
  this._peripheralId = peripheralId;
  this._serviceId = serviceId;
  this._serviceUuid = serviceUuid;
  this._characteristicId = characteristicId;
  this._characteristicUuid = characteristicUuid;

  this.id = id;
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
    id: this.id,
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
    this._serviceId,
    this._characteristicId,
    this.id
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
    this._serviceId,
    this._characteristicId,
    this.id,
    data
  );
};

module.exports = Descriptor;
