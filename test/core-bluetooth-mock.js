var events = require('events');
var util = require('util');

function NativeCentral() {}
util.inherits(NativeCentral, events.EventEmitter);

NativeCentral.prototype.scanForPeripherals = function(){};
NativeCentral.prototype.stopScan = function(){};

function NativePeripheral() {}
util.inherits(NativePeripheral, events.EventEmitter);

NativePeripheral.prototype.discoverServices = function(){};

NativePeripheral.prototype.connect = function(){};

NativePeripheral.prototype.cancelConnection = function(){};

NativePeripheral.prototype.readRSSI = function(){};

function NativeService() {}
util.inherits(NativeService, events.EventEmitter);

NativeService.prototype.discoverIncludedServices = function(){};
NativeService.prototype.discoverCharacteristics = function(){};

function NativeCharacteristic() {}
util.inherits(NativeCharacteristic, events.EventEmitter);

NativeCharacteristic.prototype.writeValue = function(){};
NativeCharacteristic.prototype.readValue = function(){};
NativeCharacteristic.prototype.setNotifyValue = function(){};
NativeCharacteristic.prototype.discoverDescriptors = function(){};

function NativeDescriptor() {}
util.inherits(NativeDescriptor, events.EventEmitter);

NativeDescriptor.prototype.readValue = function(){};
NativeDescriptor.prototype.writeValue = function(){};

module.exports = {
  NativeCentral: NativeCentral,
  NativePeripheral: NativePeripheral,
  NativeService: NativeService,
  NativeCharacteristic: NativeCharacteristic,
  NativeDescriptor: NativeDescriptor
};
