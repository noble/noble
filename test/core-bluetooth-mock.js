var events = require('events');
var util = require('util');

function NativeCentral() {}
util.inherits(NativeCentral, events.EventEmitter);

NativeCentral.prototype.scanForPeripherals = function(){};
NativeCentral.prototype.stopScan = function(){};

function NativePeripheral() {}
util.inherits(NativePeripheral, events.EventEmitter);

function NativeService() {}
util.inherits(NativeService, events.EventEmitter);

function NativeCharacteristic() {}
util.inherits(NativeCharacteristic, events.EventEmitter);

function NativeDescriptor() {}
  util.inherits(NativeDescriptor, events.EventEmitter);

module.exports = {
  NativeCentral: NativeCentral,
  NativePeripheral: NativePeripheral,
  NativeService: NativeService,
  NativeCharacteristic: NativeCharacteristic,
  NativeDescriptor: NativeDescriptor
};
