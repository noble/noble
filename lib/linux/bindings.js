var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');

var AclAttStream = require('./acl-att-stream');
var Gatt = require('./gatt');
var Gap = require('./gap');
var Hci = require('./hci');

var NobleBindings = function() {
  this._addresses = {};
  this._addresseTypes = {};

  this._pendingConnection = false;
  this._connectionQueue = [];

  this._handles = {};
  this._gatts = {};
  this._aclAttStreams = {};

  this._hci = new Hci();
  this._gap = new Gap(this._hci);
};

util.inherits(NobleBindings, events.EventEmitter);


NobleBindings.prototype.startScanning = function(serviceUuids, allowDuplicates) {
  this._scanServiceUuids = serviceUuids || [];

  this._gap.startScanning(allowDuplicates);
};

NobleBindings.prototype.stopScanning = function() {
  this._gap.stopScanning();
};

NobleBindings.prototype.connect = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];
  var addressType = this._addresseTypes[peripheralUuid];

  if (!this._pendingConnection) {
    this._pendingConnection = true;

    this._hci.createLeConn(address, addressType);
  } else {
    this._connectionQueue.push(peripheralUuid);
  }
};

NobleBindings.prototype.disconnect = function(peripheralUuid) {
  var HCI_OE_USER_ENDED_CONNECTION = 0x13;

  this._hci.disconnect(this._handles[peripheralUuid], HCI_OE_USER_ENDED_CONNECTION);
};

NobleBindings.prototype.updateRssi = function(peripheralUuid) {
  this._hci.readRssi(this._handles[peripheralUuid]);
};

NobleBindings.prototype.init = function() {
  this._gap.on('scanStart', this.onScanStart.bind(this));
  this._gap.on('scanStop', this.onScanStop.bind(this));
  this._gap.on('discover', this.onDiscover.bind(this));

  this._hci.on('stateChange', this.onStateChange.bind(this));
  this._hci.on('leConnComplete', this.onLeConnComplete.bind(this));
  this._hci.on('leConnUpdateComplete', this.onLeConnUpdateComplete.bind(this));
  this._hci.on('rssiRead', this.onRssiRead.bind(this));
  this._hci.on('disconnComplete', this.onDisconnComplete.bind(this));
  this._hci.on('aclAttDataPkt', this.onAclAttDataPkt.bind(this));

  this._hci.init();
};

NobleBindings.prototype.onStateChange = function(state) {
  this.emit('stateChange', state);
};

NobleBindings.prototype.onScanStart = function() {
  this.emit('scanStart');
};

NobleBindings.prototype.onScanStop = function() {
  this.emit('scanStop');
};

NobleBindings.prototype.onDiscover = function(status, address, addressType, advertisement, rssi) {
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
    var uuid = address.split(':').join('');
    this._addresses[uuid] = address;
    this._addresseTypes[uuid] = addressType;

    this.emit('discover', uuid, address, addressType, advertisement, rssi);
  }
};

NobleBindings.prototype.onLeConnComplete = function(status, handle, role, addressType, address, interval, latency, supervisionTimeout, masterClockAccuracy) {
  var uuid = address.split(':').join('').toLowerCase();

  var error = null; // TODO: errors, from status

  if (!error) {
    var aclAttStream = new AclAttStream(this._hci, handle);
    var gatt = new Gatt(address, aclAttStream);

    this._gatts[uuid] = this._gatts[handle] = gatt;
    this._aclAttStreams[handle] = aclAttStream;
    this._handles[uuid] = handle;
    this._handles[handle] = uuid;

    this._gatts[handle].on('mtu', this.onMtu.bind(this));
    this._gatts[handle].on('servicesDiscover', this.onServicesDiscovered.bind(this));
    this._gatts[handle].on('includedServicesDiscover', this.onIncludedServicesDiscovered.bind(this));
    this._gatts[handle].on('characteristicsDiscover', this.onCharacteristicsDiscovered.bind(this));
    this._gatts[handle].on('read', this.onRead.bind(this));
    this._gatts[handle].on('write', this.onWrite.bind(this));
    this._gatts[handle].on('broadcast', this.onBroadcast.bind(this));
    this._gatts[handle].on('notify', this.onNotify.bind(this));
    this._gatts[handle].on('notification', this.onNotification.bind(this));
    this._gatts[handle].on('descriptorsDiscover', this.onDescriptorsDiscovered.bind(this));
    this._gatts[handle].on('valueRead', this.onValueRead.bind(this));
    this._gatts[handle].on('valueWrite', this.onValueWrite.bind(this));
    this._gatts[handle].on('handleRead', this.onHandleRead.bind(this));
    this._gatts[handle].on('handleWrite', this.onHandleWrite.bind(this));
    this._gatts[handle].on('handleNotify', this.onHandleNotify.bind(this));

    this._gatts[handle].exchangeMtu(256);
  }

  this.emit('connect', uuid, error);

  if (this._connectionQueue.length > 0) {
    var peripheralUuid = this._connectionQueue.shift();

    address = this._addresses[peripheralUuid];
    addressType = this._addresseTypes[peripheralUuid];

    this._hci.createLeConn(address, addressType);
  } else {
    this._pendingConnection = false;
  }
};

NobleBindings.prototype.onLeConnUpdateComplete = function(handle, interval, latency, supervisionTimeout) {
  // no-op
};

NobleBindings.prototype.onDisconnComplete = function(handle, reason) {
  var uuid = this._handles[handle];

  this._aclAttStreams[handle].push(null);
  this._gatts[handle].removeAllListeners();

  delete this._gatts[uuid];
  delete this._gatts[handle];
  delete this._aclAttStreams[handle];
  delete this._handles[uuid];
  delete this._handles[handle];

  this.emit('disconnect', uuid); // TODO: handle reason?
};

NobleBindings.prototype.onMtu = function(address, mtu) {

};

NobleBindings.prototype.onRssiRead = function(handle, rssi) {
  this.emit('rssiUpdate', this._handles[handle], rssi);
};


NobleBindings.prototype.onAclAttDataPkt = function(handle, data) {
  this._aclAttStreams[handle].push(data);
};

NobleBindings.prototype.discoverServices = function(peripheralUuid, uuids) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.discoverServices(uuids || []);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onServicesDiscovered = function(address, serviceUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('servicesDiscover', uuid, serviceUuids);
};

NobleBindings.prototype.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.discoverIncludedServices(serviceUuid, serviceUuids || []);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onIncludedServicesDiscovered = function(address, serviceUuid, includedServiceUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('includedServicesDiscover', uuid, serviceUuid, includedServiceUuids);
};

NobleBindings.prototype.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.discoverCharacteristics(serviceUuid, characteristicUuids || []);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onCharacteristicsDiscovered = function(address, serviceUuid, characteristics) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('characteristicsDiscover', uuid, serviceUuid, characteristics);
};

NobleBindings.prototype.read = function(peripheralUuid, serviceUuid, characteristicUuid) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.read(serviceUuid, characteristicUuid);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onRead = function(address, serviceUuid, characteristicUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('read', uuid, serviceUuid, characteristicUuid, data, false);
};

NobleBindings.prototype.write = function(peripheralUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.write(serviceUuid, characteristicUuid, data, withoutResponse);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onWrite = function(address, serviceUuid, characteristicUuid) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('write', uuid, serviceUuid, characteristicUuid);
};

NobleBindings.prototype.broadcast = function(peripheralUuid, serviceUuid, characteristicUuid, broadcast) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.broadcast(serviceUuid, characteristicUuid, broadcast);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onBroadcast = function(address, serviceUuid, characteristicUuid, state) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('broadcast', uuid, serviceUuid, characteristicUuid, state);
};

NobleBindings.prototype.notify = function(peripheralUuid, serviceUuid, characteristicUuid, notify) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.notify(serviceUuid, characteristicUuid, notify);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onNotify = function(address, serviceUuid, characteristicUuid, state) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('notify', uuid, serviceUuid, characteristicUuid, state);
};

NobleBindings.prototype.onNotification = function(address, serviceUuid, characteristicUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('read', uuid, serviceUuid, characteristicUuid, data, true);
};

NobleBindings.prototype.discoverDescriptors = function(peripheralUuid, serviceUuid, characteristicUuid) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.discoverDescriptors(serviceUuid, characteristicUuid);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onDescriptorsDiscovered = function(address, serviceUuid, characteristicUuid, descriptorUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('descriptorsDiscover', uuid, serviceUuid, characteristicUuid, descriptorUuids);
};

NobleBindings.prototype.readValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.readValue(serviceUuid, characteristicUuid, descriptorUuid);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onValueRead = function(address, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('valueRead', uuid, serviceUuid, characteristicUuid, descriptorUuid, data);
};

NobleBindings.prototype.writeValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.writeValue(serviceUuid, characteristicUuid, descriptorUuid, data);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onValueWrite = function(address, serviceUuid, characteristicUuid, descriptorUuid) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('valueWrite', uuid, serviceUuid, characteristicUuid, descriptorUuid);
};

NobleBindings.prototype.readHandle = function(peripheralUuid, attHandle) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.readHandle(attHandle);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onHandleRead = function(address, handle, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('handleRead', uuid, handle, data);
};

NobleBindings.prototype.writeHandle = function(peripheralUuid, attHandle, data, withoutResponse) {
  var handle = this._handles[peripheralUuid];
  var gatt = this._gatts[handle];

  if (gatt) {
    gatt.writeHandle(attHandle, data, withoutResponse);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onHandleWrite = function(address, handle) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('handleWrite', uuid, handle);
};

NobleBindings.prototype.onHandleNotify = function(address, handle, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('handleNotify', uuid, handle, data);
};

var nobleBindings = new NobleBindings();

nobleBindings.init();

module.exports = nobleBindings;
