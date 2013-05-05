var debug = require('debug')('bluez');

var events = require('events');
var util = require('util');

var BlueZ4 = function(dbus) {
  this._devicesDiscovered = {};

  this._dbus = dbus;

  this._systemBus = this._dbus.system_bus();
  this._manager = this._dbus.get_interface(this._systemBus, 'org.bluez', '/', 'org.bluez.Manager')

  this.setupDefaultAdapter();
};

util.inherits(BlueZ4, events.EventEmitter);

BlueZ4.prototype.setupDefaultAdapter = function() {
  var defaultAdapterObject = this._manager.DefaultAdapter();

  this._defaultAdapter = this._dbus.get_interface(this._systemBus, 'org.bluez', defaultAdapterObject, 'org.bluez.Adapter');

  this._defaultAdapter.PropertyChanged.onemit = this.onDefaultAdapterPropertyChanged.bind(this);
  this._defaultAdapter.PropertyChanged.enabled = true;

  this._defaultAdapter.DeviceFound.onemit = this.onDeviceFound.bind(this);
  this._defaultAdapter.DeviceFound.enabled = true;

  var properties = this._defaultAdapter.GetProperties();

  for (var i in properties.Devices) {
    this._defaultAdapter.RemoveDevice(properties.Devices[i]);
  }

  this._powered = properties.Powered;
};

BlueZ4.prototype.onDefaultAdapterPropertyChanged = function(name, value) {
  if (name === 'Powered') {
    process.nextTick(function() {
      this.emit('stateChange', value ? 'poweredOn' : 'poweredOff');
    }.bind(this));
  }
};

BlueZ4.prototype.onDeviceFound = function(address, values) {
  if (!this._devicesDiscovered[address]) {
    this._devicesDiscovered[address] = true;

    var advertisement = {
      localName: values.Name,
      serviceUuids: []
    };
    var rssi = ((values.RSSI ^ 0xFFFF) + 1) * -1;

    var uuids = values.UUIDs || [];
    for (var i in uuids) {
      var uuid = uuids[i].split('-').join('');

      if (uuid.match(/^0000.{4}00001000800000805f9b/)) {
        uuid = uuid.substring(4, 8);
      }
      advertisement.serviceUuids.push(uuid);
    }

    this.emit('discover', address, advertisement, rssi);
  }
};

BlueZ4.prototype.startScanning = function() {
  this._defaultAdapter.StartDiscovery();
};

BlueZ4.prototype.stopScanning = function() {
  this._defaultAdapter.StopDiscovery();
};

module.exports = BlueZ4;
