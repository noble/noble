var debug = require('debug')('peripheral');

var events = require('events');
var util = require('util');

function Peripheral(noble, uuid, advertisement, rssi) {
  this._noble = noble;

  this.uuid = uuid;
  this.advertisement = advertisement;
  this.rssi = rssi;
  this.services = null;
}

util.inherits(Peripheral, events.EventEmitter);

Peripheral.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    advertisement: this.advertisement,
    rssi: this.rssi
  });
};

Peripheral.prototype.connect = function(callback) {
  if (callback) {
    this.once('connect', callback);
  }

  this._noble.connect(this.uuid);
};

Peripheral.prototype.disconnect = function(callback) {
  if (callback) {
    this.once('disconnect', callback);
  }

  this._noble.disconnect(this.uuid);
};

Peripheral.prototype.updateRssi = function(callback) {
  if (callback) {
    this.once('rssiUpdate', callback);
  }

  this._noble.updateRssi(this.uuid);
};

Peripheral.prototype.discoverServices = function(uuids, callback) {
  if (callback) {
    this.once('servicesDiscover', callback);
  }

  this._noble.discoverServices(this.uuid, uuids);
};

module.exports = Peripheral;
