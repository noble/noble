var debug = require('debug')('ios-bindings');

var EventEmitter = require('events');
var inherits = require('inherits');

var Buffer = require('buffer/').Buffer;

/**
 *  NobleBindings for react native
 */
var NobleBindings = function() {

  this.RNNoble = null;
};

inherits(NobleBindings, EventEmitter);

NobleBindings.prototype.onConnect = function(message) {
  this.emit('connect', message.peripheralUuid, message.error);
};

NobleBindings.prototype.onDisconnect = function(message) {
  this.emit('disconnect', message.peripheralUuid);
};

NobleBindings.prototype.onRssiUpdate = function(message) {
  this.emit('rssiUpdate', message.peripheralUuid, message.rssi);
};

NobleBindings.prototype.onServicesDiscover = function(message) {
  this.emit('servicesDiscover', message.peripheralUuid, message.serviceUuids);
};


NobleBindings.prototype.onIncludedServicesDiscover = function(message) {
  this.emit('includedServicesDiscover', message.peripheralUuid, message.serviceUuid, message.includedServiceUuids);
};

NobleBindings.prototype.onCharacteristicsDiscover = function(message) {
  this.emit('characteristicsDiscover', message.peripheralUuid, message.serviceUuid, message.characteristics);
};

NobleBindings.prototype.onDescriptorsDiscover = function(message) {
  this.emit('descriptorsDiscover', message.peripheralUuid, message.serviceUuid, message.characteristicUuid, message.descriptors);
};

NobleBindings.prototype.onData = function(message) {
  var processedData = new Buffer(message.data, 'base64');

  this.emit('data', message.peripheralUuid, message.serviceUuid, message.characteristicUuid, processedData, message.isNotification);
  this.emit('read', message.peripheralUuid, message.serviceUuid, message.characteristicUuid, processedData, message.isNotification);
};

NobleBindings.prototype.onWrite = function(message) {
  this.emit('write', message.peripheralUuid, message.serviceUuid, message.characteristicUuid);
};

NobleBindings.prototype.onValueWrite = function(message) {
  var processedData = new Buffer(message.data, 'base64');

  this.emit('valueWrite', message.peripheralUuid, message.serviceUuid, message.characteristicUuid, message.descriptorUuid);
};

NobleBindings.prototype.onValueUpdate = function(message) {
  this.emit('valueRead', message.peripheralUuid, message.serviceUuid, message.characteristicUuid, message.descriptorUuid, message.data);
};

NobleBindings.prototype.onNotify = function(message) {
  this.emit('notify', message.peripheralUuid, message.serviceUuid, message.characteristicUuid, message.state);
};

NobleBindings.prototype.onDiscover = function(message) {
  debug('peripheral ' + message.peripheralUuid + ' discovered');

  if (message.advertisement.manufacturerData) {
  message.advertisement.manufacturerData = new Buffer(message.advertisement.manufacturerData, 'base64');
  }

  if (message.advertisement.serviceData) {
  message.advertisement.serviceData = message.advertisement.serviceData.map((ad) => ({
    uuid: ad.uuid,
    data: new Buffer(ad.data, 'base64'),
  }));
  }

  // We don't know these values because iOS doesn't want to give us 
  // this information. Only random UUIDs are generated from them 
  // under the hood
  var address = 'unknown';
  var addressType = 'unknown';

  this.emit('discover', message.peripheralUuid, address, addressType, message.connectable, message.advertisement, message.rssi);
};

NobleBindings.prototype.onStateChange = function(state) {
  // var state = ['unknown', 'resetting', 'unsupported', 'unauthorized', 'poweredOff', 'poweredOn'][args.kCBMsgArgState];
  debug('state change ' + state);
  this.emit('stateChange', state);
};

var nobleBindings = new NobleBindings();

/**
 * Start scanning
 * @param  {Array} serviceUuids     Scan for these UUIDs, if undefined then scan for all
 * @param  {Bool}  allowDuplicates  Scan can return duplicates
 *
 * @discussion tested
 */
nobleBindings.startScanning = function(serviceUuids, allowDuplicates) {

  var duplicates = allowDuplicates || false;

  this.RNNoble.startScanning(toAppleUuids(serviceUuids), duplicates);
  this.emit('scanStart');
};

/**
 * Stop scanning
 *
 * @discussion tested
 */
nobleBindings.stopScanning = function() {
  this.RNNoble.stopScanning();
  this.emit('scanStop');
};

nobleBindings.init = function(native) {

  if(native) {
    this.RNNoble = native.RNNoble;
    this.DeviceEventEmitter = native.DeviceEventEmitter;
  }else {
    this.RNNoble = require('react-native').NativeModules.RNNoble;
    this.DeviceEventEmitter = require('react-native').DeviceEventEmitter;
  }

  this.DeviceEventEmitter.addListener('ble.connect', this.onConnect.bind(this));
  this.DeviceEventEmitter.addListener('ble.disconnect', this.onDisconnect.bind(this));
  this.DeviceEventEmitter.addListener('ble.discover', this.onDiscover.bind(this));
  this.DeviceEventEmitter.addListener('ble.rssiUpdate', this.onRssiUpdate.bind(this));
  this.DeviceEventEmitter.addListener('ble.servicesDiscover', this.onServicesDiscover.bind(this));
  this.DeviceEventEmitter.addListener('ble.includedServicesDiscover', this.onIncludedServicesDiscover.bind(this));
  this.DeviceEventEmitter.addListener('ble.characteristicsDiscover', this.onCharacteristicsDiscover.bind(this));
  this.DeviceEventEmitter.addListener('ble.descriptorsDiscover', this.onDescriptorsDiscover.bind(this));
  this.DeviceEventEmitter.addListener('ble.stateChange', this.onStateChange.bind(this));
  this.DeviceEventEmitter.addListener('ble.data', this.onData.bind(this));
  this.DeviceEventEmitter.addListener('ble.write', this.onWrite.bind(this));
  this.DeviceEventEmitter.addListener('ble.notify', this.onNotify.bind(this));
  this.DeviceEventEmitter.addListener('ble.valueUpdate', this.onValueUpdate.bind(this));
  this.DeviceEventEmitter.addListener('ble.valueWrite', this.onValueWrite.bind(this));

  setTimeout(function() {
  this.RNNoble.getState();
  }.bind(this), 1000);
};

nobleBindings.connect = function(deviceUuid) {
  this.RNNoble.connect(toAppleUuid(deviceUuid));
};

nobleBindings.disconnect = function(deviceUuid) {
  this.RNNoble.disconnect(toAppleUuid(deviceUuid));
};

nobleBindings.updateRssi = function(deviceUuid) {
  this.RNNoble.updateRssi(toAppleUuid(deviceUuid));
};

nobleBindings.discoverServices = function(deviceUuid, uuids) {
  this.RNNoble.discoverServices(toAppleUuid(deviceUuid), toAppleUuids(uuids));
};

nobleBindings.discoverIncludedServices = function(deviceUuid, serviceUuid, serviceUuids) {
  this.RNNoble.discoverIncludedServices(toAppleUuid(deviceUuid), toAppleUuid(serviceUuid), toAppleUuids(serviceUuids));
};

nobleBindings.discoverCharacteristics = function(deviceUuid, serviceUuid, characteristicUuids) {
  this.RNNoble.discoverCharacteristics(toAppleUuid(deviceUuid), toAppleUuid(serviceUuid), toAppleUuids(characteristicUuids));
};

nobleBindings.read = function(deviceUuid, serviceUuid, characteristicUuid) {
  this.RNNoble.read(toAppleUuid(deviceUuid), toAppleUuid(serviceUuid), toAppleUuid(characteristicUuid));
};

nobleBindings.write = function(deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  this.RNNoble.write(toAppleUuid(deviceUuid), toAppleUuid(serviceUuid), toAppleUuid(characteristicUuid), data.toString('base64'), withoutResponse);
};

nobleBindings.notify = function(deviceUuid, serviceUuid, characteristicUuid, notify) {
  this.RNNoble.notify(toAppleUuid(deviceUuid), toAppleUuid(serviceUuid), toAppleUuid(characteristicUuid), notify);
};

nobleBindings.discoverDescriptors = function(deviceUuid, serviceUuid, characteristicUuid) {
  this.RNNoble.discoverDescriptors(toAppleUuid(deviceUuid), toAppleUuid(serviceUuid), toAppleUuid(characteristicUuid));
};

nobleBindings.readValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  this.RNNoble.readValue(toAppleUuid(deviceUuid), toAppleUuid(serviceUuid), toAppleUuid(characteristicUuid), toAppleUuid(descriptorUuid));
};

nobleBindings.writeValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  this.RNNoble.writeValue(toAppleUuid(deviceUuid), toAppleUuid(serviceUuid), toAppleUuid(characteristicUuid), toAppleUuid(descriptorUuid), data.toString('base64'), withoutResponse);
};

nobleBindings.readHandle = function(deviceUuid, handle) {
  throw new Error('readHandle not implemented on ios');
};

nobleBindings.writeHandle = function(deviceUuid, handle, data, withoutResponse) {
  throw new Error('writeHandle not implemented on ios');
};


function toAppleUuid(uuid) {
 return uuid.replace(/(\S{8})(\S{4})(\S{4})(\S{4})(\S{12})/, "$1-$2-$3-$4-$5").toUpperCase();
}

function toAppleUuids(uuids) {
  var convertedUuids = [];

  if (uuids) {
    uuids.forEach(function(uuid) {
      convertedUuids.push(toAppleUuid(uuid));
    });
  }

  return convertedUuids;
}

module.exports = function(){

  return nobleBindings;
};
