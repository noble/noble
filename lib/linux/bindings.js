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
  // TODO: use params
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
  var uuid = address.split(':').join('').toLowerCase();
  this._addresses[uuid] = address;

  this.emit('discover', uuid, advertisement, rssi);
};

nobleBindings.connect = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address] = new Gatttool(address);
  this._gatttool[address].on('connect', this.onConnect.bind(this));
  this._gatttool[address].on('disconnect', this.onDisconnect.bind(this));
  this._gatttool[address].on('servicesDiscover', this.onServicesDiscovered.bind(this));
  this._gatttool[address].on('characteristicsDiscover', this.onCharacteristicsDiscovered.bind(this));
  this._gatttool[address].on('read', this.onRead.bind(this));

  this._gatttool[address].connect();
};

nobleBindings.onConnect = function(address) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('connect', uuid);
};

nobleBindings.disconnect = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].disconnect();
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

  this._gatttool[address].discoverServices();
};

nobleBindings.onServicesDiscovered = function(address, serviceUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('servicesDiscover', uuid, serviceUuids);
};

nobleBindings.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  // not implemented
  var includedServiceUuids = [];

  this.emit('includedServicesDiscover', peripheralUuid, serviceUuid, includedServiceUuids);
};

nobleBindings.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {
  // TODO: use characteristicUuids param
  var address = this._addresses[peripheralUuid];

  this._gatttool[address].discoverCharacteristics(serviceUuid, serviceUuid);
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

nobleBindings.write = function(peripheralUuid, serviceUuid, characteristicUuid, data, notify) {

};

nobleBindings.broadcast = function(peripheralUuid, serviceUuid, characteristicUuid, broadcast) {

};

nobleBindings.notify = function(peripheralUuid, serviceUuid, characteristicUuid, notify) {

};

nobleBindings.discoverDescriptors = function(peripheralUuid, serviceUuid, characteristicUuid) {

};

nobleBindings.readValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid) {

};

nobleBindings.writeValue = function(uuid, serviceUuid, characteristicUuid, descriptorUuid, data) {

};

nobleBindings.init();

module.exports = nobleBindings;