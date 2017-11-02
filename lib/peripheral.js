/*jshint loopfunc: true */
var debug = require('debug')('peripheral');

var events = require('events');
var util = require('util');

function Peripheral(noble, id, address, addressType, connectable, advertisement, rssi) {
  this._noble = noble;

  this.id = id;
  this.uuid = id; // for legacy
  this.address = address;
  this.addressType = addressType;
  this.connectable = connectable;
  this.advertisement = advertisement;
  this.rssi = rssi;
  this.services = null;
  this.state = 'disconnected';
}

util.inherits(Peripheral, events.EventEmitter);

Peripheral.prototype.toString = function() {
  return JSON.stringify({
    id: this.id,
    address: this.address,
    addressType: this.addressType,
    connectable: this.connectable,
    advertisement: this.advertisement,
    rssi: this.rssi,
    state: this.state
  });
};

Peripheral.prototype.connect = function(callback) {
  const promise = new Promise((resolve, reject) => {
    this.once('connect', function(error) {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });

    if (this.state === 'connected') {
      this.emit('connect', new Error('Peripheral already connected'));
    } else {
      this.state = 'connecting';
      this._noble.connect(this.id);
    }
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

Peripheral.prototype.disconnect = function(callback) {
  const promise = new Promise((resolve, reject) => {
    this.once('disconnect', function() {
      resolve();
    });

    this.state = 'disconnecting';
    this._noble.disconnect(this.id);
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

Peripheral.prototype.updateRssi = function(callback) {
  const promise = new Promise((resolve, reject) => {
    this.once('rssiUpdate', function(rssi) {
      resolve(rssi);
    });

    this._noble.updateRssi(this.id);
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

Peripheral.prototype.discoverServices = function(uuids, callback) {
  const promise = new Promise((resolve, reject) => {
    this.once('servicesDiscover', function(services) {
      resolve(services);
    });

    this._noble.discoverServices(this.id, uuids);
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

Peripheral.prototype.discoverSomeServicesAndCharacteristics = function(serviceUuids, characteristicsUuids, callback) {
  const promise = new Promise((resolve, reject) => {
    this.discoverServices(serviceUuids, function(err, services) {
      var numDiscovered = 0;
      var allCharacteristics = [];

      for (var i in services) {
        var service = services[i];

        service.discoverCharacteristics(characteristicsUuids, function(error, characteristics) {
          numDiscovered++;

          if (error === null) {
            for (var j in characteristics) {
              var characteristic = characteristics[j];

              allCharacteristics.push(characteristic);
            }
          }

          if (numDiscovered === services.length) {
            resolve({services, characteristics: allCharacteristics});
          }
        }.bind(this));
      }
    }.bind(this));
  });

  if (callback && typeof callback == 'function') {
    promise.then((result) => {
      const services = result.services;
      const characteristics = result.characteristics;
      callback(null, services, characteristics);
    }, callback);
  }

  return promise;
};

Peripheral.prototype.discoverAllServicesAndCharacteristics = function(callback) {
  return this.discoverSomeServicesAndCharacteristics([], [], callback);
};

Peripheral.prototype.readHandle = function(handle, callback) {
  const promise = new Promise((resolve, reject) => {
    this.once('handleRead' + handle, function(data) {
      resolve(data);
    });
    this._noble.readHandle(this.id, handle);
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

Peripheral.prototype.writeHandle = function(handle, data, withoutResponse, callback) {
  if (!(data instanceof Buffer)) {
    throw new Error('data must be a Buffer');
  }

  const promise = new Promise((resolve, reject) => {
    this.once('handleWrite' + handle, resolve);

    this._noble.writeHandle(this.id, handle, data, withoutResponse);
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

module.exports = Peripheral;
