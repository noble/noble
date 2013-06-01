var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');

var BlueZ = require('./bluez');
var Gatttool = require('./gatttool');

var NobleBindings = function() {
  this._addresses = {};

  this._bluez = new BlueZ();
  this._gatttool = {};
};

util.inherits(NobleBindings, events.EventEmitter);

var nobleBindings = new NobleBindings();

nobleBindings.init = function() {
  this._bluez.on('stateChange', this.onStateChange.bind(this));
  this._bluez.on('scanStart', this.onScanStart.bind(this));
  this._bluez.on('scanStop', this.onScanStop.bind(this));
  this._bluez.on('discover', this.onDiscover.bind(this));

  this._bluez.init();
};

nobleBindings.onStateChange = function(state) {
  this.emit('stateChange', state);
};

nobleBindings.startScanning = function(serviceUuids, allowDuplicates) {
  this._devicesDiscovered = {}; // reset previously discovered devices

  this._scanServiceUuids = serviceUuids || [];
  this._scanAllowDuplicated = allowDuplicates;

  this._bluez.startScanning();
};

nobleBindings.onScanStart = function() {
  this.emit('scanStart');
};

nobleBindings.stopScanning = function() {
  this._bluez.stopScanning();
};

nobleBindings.onScanStop = function() {
  this.emit('scanStop');
};

nobleBindings.onDiscover = function(address, advertisement, rssi) {
  if (!this._devicesDiscovered[address] || this._scanAllowDuplicated) {
    this._devicesDiscovered[address] = true;

    var serviceUuids = advertisement.serviceUuids;
    var hasScanServiceUuids = (this._scanServiceUuids.length === 0);

    if (!hasScanServiceUuids) {
      for (var i in serviceUuids) {
        hasScanServiceUuids = (this._scanServiceUuids.indexOf(serviceUuids[i]) !== -1);

        if (hasScanServiceUuids) {
          break;
        }
      }
    }

    if (hasScanServiceUuids) {
      var uuid = address.split(':').join('').toLowerCase();
      this._addresses[uuid] = address;

      this.emit('discover', uuid, advertisement, rssi);
    }
  }
};

nobleBindings.connect = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address] = new Gatttool(address);
  this._gatttool[address].on('connect', this.onConnect.bind(this));
  this._gatttool[address].on('disconnect', this.onDisconnect.bind(this));
  this._gatttool[address].on('servicesDiscover', this.onServicesDiscovered.bind(this));
  this._gatttool[address].on('includedServicesDiscover', this.onIncludedServicesDiscovered.bind(this));
  this._gatttool[address].on('characteristicsDiscover', this.onCharacteristicsDiscovered.bind(this));
  this._gatttool[address].on('read', this.onRead.bind(this));
  this._gatttool[address].on('write', this.onWrite.bind(this));
  this._gatttool[address].on('broadcast', this.onBroadcast.bind(this));
  this._gatttool[address].on('notify', this.onNotify.bind(this));
  this._gatttool[address].on('notification', this.onNotification.bind(this));
  this._gatttool[address].on('descriptorsDiscover', this.onDescriptorsDiscovered.bind(this));
  this._gatttool[address].on('valueRead', this.onValueRead.bind(this));
  this._gatttool[address].on('valueWrite', this.onValueWrite.bind(this));
  this._gatttool[address].on('handleRead', this.onHandleRead.bind(this));
  this._gatttool[address].on('handleWrite', this.onHandleWrite.bind(this));

  this._gatttool[address].connect();
};

nobleBindings.onConnect = function(address) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('connect', uuid);
};

nobleBindings.disconnect = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].disconnect();

  // TODO: kill gatttool, unbind events
};

nobleBindings.onDisconnect = function(address) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('disconnect', uuid);
};

nobleBindings.updateRssi = function(peripheralUuid) {
  // not implemented
  var rssi = 127;

  this.emit('rssiUpdate', peripheralUuid, rssi);
};

nobleBindings.discoverServices = function(peripheralUuid, uuids) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].discoverServices(uuids || []);
};

nobleBindings.onServicesDiscovered = function(address, serviceUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('servicesDiscover', uuid, serviceUuids);
};

nobleBindings.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].discoverIncludedServices(serviceUuid, serviceUuids || []);
};

nobleBindings.onIncludedServicesDiscovered = function(address, serviceUuid, includedServiceUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('includedServicesDiscover', uuid, serviceUuid, includedServiceUuids);
};

nobleBindings.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].discoverCharacteristics(serviceUuid, characteristicUuids || []);
};

nobleBindings.onCharacteristicsDiscovered = function(address, serviceUuid, characteristics) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('characteristicsDiscover', uuid, serviceUuid, characteristics);
};

nobleBindings.read = function(peripheralUuid, serviceUuid, characteristicUuid) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].read(serviceUuid, characteristicUuid);
};

nobleBindings.onRead = function(address, serviceUuid, characteristicUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('read', uuid, serviceUuid, characteristicUuid, data, false);
};

nobleBindings.write = function(peripheralUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].write(serviceUuid, characteristicUuid, data, withoutResponse);
};

nobleBindings.onWrite = function(address, serviceUuid, characteristicUuid) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('write', uuid, serviceUuid, characteristicUuid);
};

nobleBindings.broadcast = function(peripheralUuid, serviceUuid, characteristicUuid, broadcast) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].broadcast(serviceUuid, characteristicUuid, broadcast);
};

nobleBindings.onBroadcast = function(address, serviceUuid, characteristicUuid, state) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('broadcast', uuid, serviceUuid, characteristicUuid, state);
};

nobleBindings.notify = function(peripheralUuid, serviceUuid, characteristicUuid, notify) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].notify(serviceUuid, characteristicUuid, notify);
};

nobleBindings.onNotify = function(address, serviceUuid, characteristicUuid, state) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('notify', uuid, serviceUuid, characteristicUuid, state);
};

nobleBindings.onNotification = function(address, serviceUuid, characteristicUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('read', uuid, serviceUuid, characteristicUuid, data, true);
};

nobleBindings.discoverDescriptors = function(peripheralUuid, serviceUuid, characteristicUuid) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].discoverDescriptors(serviceUuid, characteristicUuid);
};

nobleBindings.onDescriptorsDiscovered = function(address, serviceUuid, characteristicUuid, descriptorUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('descriptorsDiscover', uuid, serviceUuid, characteristicUuid, descriptorUuids);
};

nobleBindings.readValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].readValue(serviceUuid, characteristicUuid, descriptorUuid);
};

nobleBindings.onValueRead = function(address, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('valueRead', uuid, serviceUuid, characteristicUuid, descriptorUuid, data);
};

nobleBindings.writeValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].writeValue(serviceUuid, characteristicUuid, descriptorUuid, data);
};

nobleBindings.onValueWrite = function(address, serviceUuid, characteristicUuid, descriptorUuid) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('valueWrite', uuid, serviceUuid, characteristicUuid, descriptorUuid);
};

nobleBindings.readHandle = function(peripheralUuid, handle) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].readHandle(handle);
};

nobleBindings.onHandleRead = function(address, handle, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('handleRead', uuid, handle, data);
};

nobleBindings.writeHandle = function(peripheralUuid, handle, data, withoutResponse) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].writeHandle(handle, data, withoutResponse);
};

nobleBindings.onHandleWrite = function(address, handle) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('handleWrite', uuid, handle);
};


nobleBindings.init();

module.exports = nobleBindings;