var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');


var NobleBindings = function() {

};

util.inherits(NobleBindings, events.EventEmitter);


var nobleBindings = new NobleBindings();

nobleBindings.init = function() {

};

nobleBindings.startScanning = function(serviceUuids, allowDuplicates) {

};

nobleBindings.stopScanning = function() {

};

nobleBindings.connect = function(peripheralUuid) {

};


nobleBindings.disconnect = function(peripheralUuid) {

};

nobleBindings.updateRssi = function(peripheralUuid) {

};

nobleBindings.discoverServices = function(peripheralUuid, uuids) {

};

nobleBindings.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {

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
