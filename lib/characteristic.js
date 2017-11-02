var debug = require('debug')('characteristic');

var events = require('events');
var util = require('util');

var characteristics = require('./characteristics.json');

function Characteristic(noble, peripheralId, serviceUuid, uuid, properties) {
  this._noble = noble;
  this._peripheralId = peripheralId;
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
  const promise = new Promise((resolve, reject) => {
    const onRead = function(data, isNotificaton) {
      // only call the callback if 'read' event and non-notification
      // 'read' for non-notifications is only present for backwards compatbility
      if (!isNotificaton) {
        // remove the listener
        this.removeListener('read', onRead);

        // call the callback
        resolve(data);
      }
    }.bind(this);

    this.on('read', onRead);

    this._noble.read(
      this._peripheralId,
      this._serviceUuid,
      this.uuid
    );
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

Characteristic.prototype.write = function(data, withoutResponse, callback) {
  if (process.title !== 'browser' && !(data instanceof Buffer)) {
    throw new Error('data must be a Buffer');
  }

  const promise = new Promise((resolve, reject) => {
    this.once('write', resolve);

    this._noble.write(
      this._peripheralId,
      this._serviceUuid,
      this.uuid,
      data,
      withoutResponse
    );
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

Characteristic.prototype.broadcast = function(broadcast, callback) {
  const promise = new Promise((resolve, reject) => {
    this.once('broadcast', resolve);

    this._noble.broadcast(
      this._peripheralId,
      this._serviceUuid,
      this.uuid,
      broadcast
    );
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

// deprecated in favour of subscribe/unsubscribe
Characteristic.prototype.notify = function(notify, callback) {
  const promise = new Promise((resolve, reject) => {
    this.once('notify', resolve);

    this._noble.notify(
      this._peripheralId,
      this._serviceUuid,
      this.uuid,
      notify
    );
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

Characteristic.prototype.subscribe = function(callback) {
  return this.notify(true, callback);
};

Characteristic.prototype.unsubscribe = function(callback) {
  return this.notify(false, callback);
};

Characteristic.prototype.discoverDescriptors = function(callback) {
  const promise = new Promise((resolve, reject) => {
    this.once('descriptorsDiscover', resolve);

    this._noble.discoverDescriptors(
      this._peripheralId,
      this._serviceUuid,
      this.uuid
    );
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

module.exports = Characteristic;
