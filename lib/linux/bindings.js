var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');

var HciBle = require('./hci-ble');
var L2capBle = require('./l2cap-ble');

var NobleBindings = function() {
  this._addresses = {};
  this._addresseTypes = {};

  this._hciBle = new HciBle();
  this._l2capBle = {};
};

util.inherits(NobleBindings, events.EventEmitter);

var nobleBindings = new NobleBindings();

nobleBindings.init = function() {
  this._hciBle.on('stateChange', this.onStateChange.bind(this));
  this._hciBle.on('scanStart', this.onScanStart.bind(this));
  this._hciBle.on('scanStop', this.onScanStop.bind(this));
  this._hciBle.on('discover', this.onDiscover.bind(this));
};

nobleBindings.onStateChange = function(state) {
  this.emit('stateChange', state);
};

nobleBindings.startScanning = function(serviceUuids, allowDuplicates) {
  this._scanServiceUuids = serviceUuids || [];

  this._hciBle.startScanning(allowDuplicates);
};

nobleBindings.onScanStart = function() {
  this.emit('scanStart');
};

nobleBindings.stopScanning = function() {
  this._hciBle.stopScanning();
};

nobleBindings.onScanStop = function() {
  this.emit('scanStop');
};

nobleBindings.onDiscover = function(address, addressType, advertisement, rssi) {
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
    this._addresseTypes[uuid] = addressType;

    this.emit('discover', uuid, advertisement, rssi);
  }
};

nobleBindings.connect = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];
  var addressType = this._addresseTypes[peripheralUuid];

  this._l2capBle[address] = new L2capBle(address, addressType);
  this._l2capBle[address].on('connect', this.onConnect.bind(this));
  this._l2capBle[address].on('disconnect', this.onDisconnect.bind(this));
  this._l2capBle[address].on('mtu', this.onMtu.bind(this));
  this._l2capBle[address].on('rssi', this.onRssi.bind(this));
  this._l2capBle[address].on('servicesDiscover', this.onServicesDiscovered.bind(this));
  this._l2capBle[address].on('includedServicesDiscover', this.onIncludedServicesDiscovered.bind(this));
  this._l2capBle[address].on('characteristicsDiscover', this.onCharacteristicsDiscovered.bind(this));
  this._l2capBle[address].on('read', this.onRead.bind(this));
  this._l2capBle[address].on('write', this.onWrite.bind(this));
  this._l2capBle[address].on('broadcast', this.onBroadcast.bind(this));
  this._l2capBle[address].on('notify', this.onNotify.bind(this));
  this._l2capBle[address].on('notification', this.onNotification.bind(this));
  this._l2capBle[address].on('descriptorsDiscover', this.onDescriptorsDiscovered.bind(this));
  this._l2capBle[address].on('valueRead', this.onValueRead.bind(this));
  this._l2capBle[address].on('valueWrite', this.onValueWrite.bind(this));
  this._l2capBle[address].on('handleRead', this.onHandleRead.bind(this));
  this._l2capBle[address].on('handleWrite', this.onHandleWrite.bind(this));
  this._l2capBle[address].on('handleNotify', this.onHandleNotify.bind(this));

  this._l2capBle[address].connect();
};

nobleBindings.onConnect = function(address, error) {
  var uuid = address.split(':').join('').toLowerCase();

  if (!error) {
    this._l2capBle[address].exchangeMtu(256);
  }
  
  this.emit('connect', uuid, error);
};

nobleBindings.disconnect = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].disconnect();
};

nobleBindings.onDisconnect = function(address) {
  var uuid = address.split(':').join('').toLowerCase();

  this._l2capBle[address].kill();

  this._l2capBle[address].removeAllListeners();

  delete this._l2capBle[address];

  this.emit('disconnect', uuid);
};

nobleBindings.exchangeMtu = function(peripheralUuid, mtu) {
};

nobleBindings.onMtu = function(address, mtu) {

};

nobleBindings.updateRssi = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].updateRssi();
};

nobleBindings.onRssi = function(address, rssi) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('rssiUpdate', uuid, rssi);
};

nobleBindings.discoverServices = function(peripheralUuid, uuids) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].discoverServices(uuids || []);
};

nobleBindings.onServicesDiscovered = function(address, serviceUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('servicesDiscover', uuid, serviceUuids);
};

nobleBindings.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].discoverIncludedServices(serviceUuid, serviceUuids || []);
};

nobleBindings.onIncludedServicesDiscovered = function(address, serviceUuid, includedServiceUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('includedServicesDiscover', uuid, serviceUuid, includedServiceUuids);
};

nobleBindings.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].discoverCharacteristics(serviceUuid, characteristicUuids || []);
};

nobleBindings.onCharacteristicsDiscovered = function(address, serviceUuid, characteristics) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('characteristicsDiscover', uuid, serviceUuid, characteristics);
};

nobleBindings.read = function(peripheralUuid, serviceUuid, characteristicUuid) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].read(serviceUuid, characteristicUuid);
};

nobleBindings.onRead = function(address, serviceUuid, characteristicUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('read', uuid, serviceUuid, characteristicUuid, data, false);
};

nobleBindings.write = function(peripheralUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].write(serviceUuid, characteristicUuid, data, withoutResponse);
};

nobleBindings.onWrite = function(address, serviceUuid, characteristicUuid) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('write', uuid, serviceUuid, characteristicUuid);
};

nobleBindings.broadcast = function(peripheralUuid, serviceUuid, characteristicUuid, broadcast) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].broadcast(serviceUuid, characteristicUuid, broadcast);
};

nobleBindings.onBroadcast = function(address, serviceUuid, characteristicUuid, state) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('broadcast', uuid, serviceUuid, characteristicUuid, state);
};

nobleBindings.notify = function(peripheralUuid, serviceUuid, characteristicUuid, notify) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].notify(serviceUuid, characteristicUuid, notify);
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

  this._l2capBle[address].discoverDescriptors(serviceUuid, characteristicUuid);
};

nobleBindings.onDescriptorsDiscovered = function(address, serviceUuid, characteristicUuid, descriptorUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('descriptorsDiscover', uuid, serviceUuid, characteristicUuid, descriptorUuids);
};

nobleBindings.readValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].readValue(serviceUuid, characteristicUuid, descriptorUuid);
};

nobleBindings.onValueRead = function(address, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('valueRead', uuid, serviceUuid, characteristicUuid, descriptorUuid, data);
};

nobleBindings.writeValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].writeValue(serviceUuid, characteristicUuid, descriptorUuid, data);
};

nobleBindings.onValueWrite = function(address, serviceUuid, characteristicUuid, descriptorUuid) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('valueWrite', uuid, serviceUuid, characteristicUuid, descriptorUuid);
};

nobleBindings.readHandle = function(peripheralUuid, handle) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].readHandle(handle);
};

nobleBindings.onHandleRead = function(address, handle, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('handleRead', uuid, handle, data);
};

nobleBindings.writeHandle = function(peripheralUuid, handle, data, withoutResponse) {
  var address = this._addresses[peripheralUuid];

  this._l2capBle[address].writeHandle(handle, data, withoutResponse);
};

nobleBindings.onHandleWrite = function(address, handle) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('handleWrite', uuid, handle);
};

nobleBindings.onHandleNotify = function(address, handle, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('handleNotify', uuid, handle, data);
};


nobleBindings.init();

module.exports = nobleBindings;
