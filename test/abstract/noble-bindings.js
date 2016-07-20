var util = require('util');
var events = require('events');

function NobleBindings () {
}
util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype.startScanning = function(serviceUuidsArray, allowDuplicates) {
  if (typeof this._startScanning == 'function')
    return this._startScanning(serviceUuidsArray, allowDuplicates);

  throw new Error('open() not implemented');
};

NobleBindings.prototype.stopScanning = function() {
  if (typeof this._stopScanning == 'function')
    return this._stopScanning();

  throw new Error('stopScanning() not implemented');
};

NobleBindings.prototype.connect = function(peripheralUuidString) {
  if (typeof this._connect == 'function')
    return this._connect(peripheralUuidString);

  throw new Error('connect() not implemented');
};

NobleBindings.prototype.disconnect = function(peripheralUuidString) {
  if (typeof this._disconnect == 'function')
    return this._disconnect(peripheralUuidString);

  throw new Error('disconnect() not implemented');
};

NobleBindings.prototype.updateRssi = function(peripheralUuidString) {
  if (typeof this._updateRssi == 'function')
    return this._updateRssi(peripheralUuidString);

  throw new Error('updateRssi() not implemented');
};

NobleBindings.prototype.discoverServices = function(peripheralUuidString, serviceUuidsArray) {
  if (typeof this._discoverServices == 'function')
    return this._discoverServices(peripheralUuidString, serviceUuidsArray);

  throw new Error('discoverServices() not implemented');
};

NobleBindings.prototype.discoverIncludedServices = function(peripheralUuidString, serviceUuidString, serviceUuidsArray) {
  if (typeof this._discoverIncludedServices == 'function')
    return this._discoverIncludedServices(peripheralUuidString, serviceUuidString, serviceUuidsArray);

  throw new Error('discoverIncludedServices() not implemented');
};

NobleBindings.prototype.discoverCharacteristics = function(peripheralUuidString, serviceUuidString, characteristicUuidsArray) {
  if (typeof this._discoverCharacteristics == 'function')
    return this._discoverCharacteristics(peripheralUuidString, serviceUuidString, characteristicUuidsArray);

  throw new Error('discoverCharacteristics() not implemented');
};

NobleBindings.prototype.discoverDescriptors = function(peripheralUuidString, serviceUuidString, characteristicUuidString) {
  if (typeof this._discoverDescriptors == 'function')
    return this._discoverDescriptors(peripheralUuidString, serviceUuidString, characteristicUuidString);

  throw new Error('discoverDescriptors() not implemented');
};

NobleBindings.prototype.read = function(peripheralUuidString, serviceUuidString, characteristicUuidString) {
  if (typeof this._read == 'function')
    return this._read(peripheralUuidString, serviceUuidString, characteristicUuidString);

  throw new Error('read() not implemented');
};

NobleBindings.prototype.write = function(peripheralUuidString, serviceUuidString, characteristicUuidString, dataBuffer, withoutResponseBool) {
  if (typeof this._write == 'function')
    return this._write(peripheralUuidString, serviceUuidString, characteristicUuidString, dataBuffer, withoutResponseBool);

  throw new Error('write() not implemented');
};

NobleBindings.prototype.readValue = function(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString) {
  if (typeof this._readValue == 'function')
    return this._readValue(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString);

  throw new Error('readValue() not implemented');
};

NobleBindings.prototype.writeValue = function(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString, dataBuffer) {
  if (typeof this._writeValue == 'function')
    return this._writeValue(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString, dataBuffer);

  throw new Error('writeValue() not implemented');
};

NobleBindings.prototype.notify = function(peripheralUuidString, serviceUuidString, characteristicUuidString, notifyBoolean) {
  if (typeof this._notify == 'function')
    return this._notify(peripheralUuidString, serviceUuidString, characteristicUuidString, notifyBoolean);

  throw new Error('notify() not implemented');
};

NobleBindings.prototype.init = function(native) {
  if (typeof this._init == 'function')
    return this._init(native);

  throw new Error('init() not implemented');
};

module.exports = NobleBindings;
