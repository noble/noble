var util = require('util');
var events = require('events');

function NobleBindings () {
}
util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype.startScanning = function(serviceUuidsArray, allowDuplicates) {
  if (typeof this._startScanning == 'function')
    return this._startScanning(serviceUuidsArray, allowDuplicates);
};

NobleBindings.prototype.stopScanning = function() {
  if (typeof this._stopScanning == 'function')
    return this._stopScanning();
};

NobleBindings.prototype.connect = function(peripheralUuidString) {
  if (typeof this._connect == 'function')
    return this._connect(peripheralUuidString);
};

NobleBindings.prototype.disconnect = function(peripheralUuidString) {
  if (typeof this._disconnect == 'function')
    return this._disconnect(peripheralUuidString);
};

NobleBindings.prototype.updateRssi = function(peripheralUuidString) {
  if (typeof this._updateRssi == 'function')
    return this._updateRssi(peripheralUuidString);
};

NobleBindings.prototype.discoverServices = function(peripheralUuidString, serviceUuidsArray) {
  if (typeof this._discoverServices == 'function')
    return this._discoverServices(peripheralUuidString, serviceUuidsArray);
};

NobleBindings.prototype.discoverIncludedServices = function(peripheralUuidString, serviceUuidString, serviceUuidsArray) {
  if (typeof this._discoverIncludedServices == 'function')
    return this._discoverIncludedServices(peripheralUuidString, serviceUuidString, serviceUuidsArray);
};

NobleBindings.prototype.discoverCharacteristics = function(peripheralUuidString, serviceUuidString, characteristicUuidsArray) {
  if (typeof this._discoverCharacteristics == 'function')
    return this._discoverCharacteristics(peripheralUuidString, serviceUuidString, characteristicUuidsArray);
};

NobleBindings.prototype.discoverDescriptors = function(peripheralUuidString, serviceUuidString, characteristicUuidString) {
  if (typeof this._discoverDescriptors == 'function')
    return this._discoverDescriptors(peripheralUuidString, serviceUuidString, characteristicUuidString);
};

NobleBindings.prototype.read = function(peripheralUuidString, serviceUuidString, characteristicUuidString) {
  if (typeof this._read == 'function')
    return this._read(peripheralUuidString, serviceUuidString, characteristicUuidString);
};

NobleBindings.prototype.write = function(peripheralUuidString, serviceUuidString, characteristicUuidString, dataBuffer, withoutResponseBool) {
  if (typeof this._write == 'function')
    return this._write(peripheralUuidString, serviceUuidString, characteristicUuidString, dataBuffer, withoutResponseBool);
};

NobleBindings.prototype.readValue = function(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString) {
  if (typeof this._readValue == 'function')
    return this._readValue(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString);
};

NobleBindings.prototype.writeValue = function(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString, dataBuffer) {
  if (typeof this._writeValue == 'function')
    return this._writeValue(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString, dataBuffer);
};

NobleBindings.prototype.notify = function(peripheralUuidString, serviceUuidString, characteristicUuidString, notifyBoolean) {
  if (typeof this._notify == 'function')
    return this._notify(peripheralUuidString, serviceUuidString, characteristicUuidString, notifyBoolean);
};

NobleBindings.prototype.init = function(native) {
  if (typeof this._init == 'function')
    return this._init(native);
};

module.exports = NobleBindings;
