var debug = require('debug')('bluez');

var events = require('events');
var util = require('util');

var dbus = require('dbus');

var BlueZ4 = require('./bluez4');
var BlueZ5 = require('./bluez5');

var BlueZ = function() {
};

util.inherits(BlueZ, events.EventEmitter);

BlueZ.prototype.init = function() {
  this._bluez = null;

  dbus.start(function() {
    if (this._bluez === null) {
      try {
        this._bluez = new BlueZ5(dbus);
      } catch(e) {
        // console.error(e);
      }
    }

    if (this._bluez === null) {
      try {
        this._bluez = new BlueZ4(dbus);
      } catch(e) {
        // console.error(e);
      }
    }

    if (this._bluez === null) {
      throw new Error('Could not init BlueZ');
    } else {
      this._bluez.on('stateChange', this.onStateChange.bind(this));
      this._bluez.on('discover', this.onDiscover.bind(this));

      process.nextTick(function() {
        this.emit('stateChange', this._bluez._powered ? 'poweredOn' : 'poweredOff');
      }.bind(this));
    }
  }.bind(this));
};

BlueZ.prototype.onStateChange = function(state) {
  this.emit('stateChange', state);
};

BlueZ.prototype.startScanning = function() {
  this._bluez.startScanning();

  this.emit('scanStart');
};

BlueZ.prototype.stopScanning = function() {
  this._bluez.startScanning();

  this.emit('scanStop');
};

BlueZ.prototype.onDiscover = function(address, advertisement, rssi) {
  this.emit('discover', address, advertisement, rssi);
};


module.exports = BlueZ;
