var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');

var BlueZ = require('./bluez');

var NobleBindings = function() {
  this._addresses = {};

  this._bluez = new BlueZ();
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

};

nobleBindings.disconnect = function(peripheralUuid) {

};

nobleBindings.updateRssi = function(peripheralUuid) {
  // not implemented
  var rssi = 127;

  this.emit('rssiUpdate', peripheralUuid, rssi);
};

nobleBindings.discoverServices = function(peripheralUuid, uuids) {

};

nobleBindings.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  // not implemented
  var includedServiceUuids = [];

  this.emit('includedServicesDiscover', peripheralUuid, serviceUuid, includedServiceUuids);
};

nobleBindings.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {

};

nobleBindings.read = function(peripheralUuid, serviceUuid, characteristicUuid) {

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