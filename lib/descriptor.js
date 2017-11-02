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
  const promise = new Promise((resolve, reject) => {
    this.once('valueRead', resolve);

    this._noble.readValue(
      this._peripheralId,
      this._serviceUuid,
      this._characteristicUuid,
      this.uuid
    );
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

Descriptor.prototype.writeValue = function(data, callback) {
  if (!(data instanceof Buffer)) {
    throw new Error('data must be a Buffer');
  }

  const promise = new Promise((resolve, reject) => {
    this.once('valueWrite', resolve);

    this._noble.writeValue(
      this._peripheralId,
      this._serviceUuid,
      this._characteristicUuid,
      this.uuid,
      data
    );
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

module.exports = Descriptor;
