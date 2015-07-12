/*jshint loopfunc: true */
var debug = require('debug')('peripheral');

var events = require('events');
var util = require('util');

function Peripheral(noble, uuid, address, addressType, advertisement, rssi) {
  this._noble = noble;

  this.uuid = uuid;
  this.address = address;
  this.addressType = addressType;
  this.advertisement = advertisement;
  this.rssi = rssi;
  this.services = null;
  this.state = 'disconnected';
}

util.inherits(Peripheral, events.EventEmitter);

Peripheral.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    address: this.address,
    advertisement: this.advertisement,
    rssi: this.rssi,
    state: this.state
  });
};

Peripheral.prototype.connect = function(callback) {
  this.once('_connect', function(error) {
    if (typeof(callback) === 'function') {
      callback(error);
    }

    if (!error) {
      this.emit('connect');
    }
  }.bind(this));

  if (this.state === 'connected') {
    this.emit('_connect', new Error('Peripheral already connected'));
  } else {
    this.state = 'connecting';
    this._noble.connect(this.uuid);
  }
};

Peripheral.prototype.disconnect = function(callback) {
  this.once('_disconnect', function(error) {
    if (typeof(callback) === 'function') {
      callback(error);
    }

    if (!error) {
      this.emit('disconnect');
    }
  }.bind(this));

  this.state = 'disconnecting';
  this._noble.disconnect(this.uuid);
};

Peripheral.prototype.updateRssi = function(callback) {
  this.once('_rssiUpdate', function(error, rssi) {
    if (typeof(callback) === 'function') {
      callback(error, rssi);
    }

    if (!error) {
      this.emit('rssiUpdate', rssi);
    }
  });

  this._noble.updateRssi(this.uuid);
};

Peripheral.prototype.discoverServices = function(uuids, callback) {
  this.once('_servicesDiscover', function(error, services) {
    if (typeof(callback) === 'function') {
      callback(error, services);
    }

    if (!error) {
      this.emit('servicesDiscover', services);
    }
  }.bind(this));

  this._noble.discoverServices(this.uuid, uuids);
};

Peripheral.prototype.discoverSomeServicesAndCharacteristics = function(serviceUuids, characteristicsUuids, callback) {
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
          if (callback) {
            callback(null, services, allCharacteristics);
          }
        }
      }.bind(this));
    }
  }.bind(this));
};

Peripheral.prototype.discoverAllServicesAndCharacteristics = function(callback) {
  this.discoverSomeServicesAndCharacteristics([], [], callback);
};

Peripheral.prototype.readHandle = function(handle, callback) {
  if (callback) {
    this.once('handleRead' + handle, function(data) {
      callback(null, data);
    });
  }

  this._noble.readHandle(this.uuid, handle);
};

Peripheral.prototype.writeHandle = function(handle, data, withoutResponse, callback) {
  if (!(data instanceof Buffer)) {
    throw new Error('data must be a Buffer');
  }

  if (callback) {
    this.once('handleWrite' + handle, function() {
      callback(null);
    });
  }

  this._noble.writeHandle(this.uuid, handle, data, withoutResponse);
};

module.exports = Peripheral;
