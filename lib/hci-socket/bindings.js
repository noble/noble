var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');

var AclStream = require('./acl-stream');
var Gatt = require('./gatt');
var Gap = require('./gap');
var Hci = require('./hci');
var Signaling = require('./signaling');


var NobleBindings = function() {
  this._state = null;

  this._addresses = {};
  this._addresseTypes = {};
  this._connectable = {};

  this._pendingConnectionUuid = null;
  this._connectionQueue = [];

  this._handles = {};
  this._gatts = {};
  this._aclStreams = {};
  this._signalings = {};

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

  if (!this._pendingConnectionUuid) {
    this._pendingConnectionUuid = peripheralUuid;

    this._hci.createLeConn(address, addressType);
  } else {
    this._connectionQueue.push(peripheralUuid);
  }
};

NobleBindings.prototype.disconnect = function(peripheralUuid) {
  this._hci.disconnect(this._handles[peripheralUuid]);
};

NobleBindings.prototype.updateRssi = function(peripheralUuid) {
  this._hci.readRssi(this._handles[peripheralUuid]);
};

NobleBindings.prototype.init = function() {
  this.onSigIntBinded = this.onSigInt.bind(this);

  this._gap.on('scanStart', this.onScanStart.bind(this));
  this._gap.on('scanStop', this.onScanStop.bind(this));
  this._gap.on('discover', this.onDiscover.bind(this));

  this._hci.on('stateChange', this.onStateChange.bind(this));
  this._hci.on('addressChange', this.onAddressChange.bind(this));
  this._hci.on('leConnComplete', this.onLeConnComplete.bind(this));
  this._hci.on('leConnUpdateComplete', this.onLeConnUpdateComplete.bind(this));
  this._hci.on('rssiRead', this.onRssiRead.bind(this));
  this._hci.on('disconnComplete', this.onDisconnComplete.bind(this));
  this._hci.on('encryptChange', this.onEncryptChange.bind(this));
  this._hci.on('aclDataPkt', this.onAclDataPkt.bind(this));

  this._hci.init();

  /* Add exit handlers after `init()` has completed. If no adaptor
  is present it can throw an exception - in which case we don't
  want to try and clear up afterwards (issue #502) */
  process.on('SIGINT', this.onSigIntBinded);
  process.on('exit', this.onExit.bind(this));
};

NobleBindings.prototype.onSigInt = function() {
  var sigIntListeners = process.listeners('SIGINT');

  if (sigIntListeners[sigIntListeners.length - 1] === this.onSigIntBinded) {
    // we are the last listener, so exit
    // this will trigger onExit, and clean up
    process.exit(1);
  }
};

NobleBindings.prototype.onExit = function() {
  this.stopScanning();

  for (var handle in this._aclStreams) {
    this._hci.disconnect(handle);
  }
};

NobleBindings.prototype.onStateChange = function(state) {
  if (this._state === state) {
    return;
  }
  this._state = state;


  if (state === 'unauthorized') {
    console.log('noble warning: adapter state unauthorized, please run as root or with sudo');
    console.log('               or see README for information on running without root/sudo:');
    console.log('               https://github.com/sandeepmistry/noble#running-on-linux');
  } else if (state === 'unsupported') {
    console.log('noble warning: adapter does not support Bluetooth Low Energy (BLE, Bluetooth Smart).');
    console.log('               Try to run with environment variable:');
    console.log('               [sudo] NOBLE_HCI_DEVICE_ID=x node ...');
  }

  this.emit('stateChange', state);
};

NobleBindings.prototype.onAddressChange = function(address) {
  this.emit('addressChange', address);
};

NobleBindings.prototype.onScanStart = function(filterDuplicates) {
  this.emit('scanStart', filterDuplicates);
};

NobleBindings.prototype.onScanStop = function() {
  this.emit('scanStop');
};

NobleBindings.prototype.onDiscover = function(status, address, addressType, connectable, advertisement, rssi) {
  if (this._scanServiceUuids === undefined) {
    return;
  }

  var serviceUuids = advertisement.serviceUuids || [];
  var serviceData = advertisement.serviceData || [];
  var hasScanServiceUuids = (this._scanServiceUuids.length === 0);

  if (!hasScanServiceUuids) {
    var i;

    serviceUuids = serviceUuids.slice();

    for (i in serviceData) {
      serviceUuids.push(serviceData[i].uuid);
    }

    for (i in serviceUuids) {
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
    this._connectable[uuid] = connectable;

    this.emit('discover', uuid, address, addressType, connectable, advertisement, rssi);
  }
};

NobleBindings.prototype.onLeConnComplete = function(status, handle, role, addressType, address, interval, latency, supervisionTimeout, masterClockAccuracy) {
  var uuid = null;

  var error = null;

  if (status === 0) {
    uuid = address.split(':').join('').toLowerCase();

    var aclStream = new AclStream(this._hci, handle, this._hci.addressType, this._hci.address, addressType, address);
    var gatt = new Gatt(address, aclStream);
    var signaling = new Signaling(handle, aclStream);

    this._gatts[uuid] = this._gatts[handle] = gatt;
    this._signalings[uuid] = this._signalings[handle] = signaling;
    this._aclStreams[handle] = aclStream;
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

    this._signalings[handle].on('connectionParameterUpdateRequest', this.onConnectionParameterUpdateRequest.bind(this));

    this._gatts[handle].exchangeMtu(256);
  } else {
    uuid = this._pendingConnectionUuid;

    error = new Error(Hci.STATUS_MAPPER[status] || ('Unknown (' + status + ')'));
  }

  this.emit('connect', uuid, error);

  if (this._connectionQueue.length > 0) {
    var peripheralUuid = this._connectionQueue.shift();

    address = this._addresses[peripheralUuid];
    addressType = this._addresseTypes[peripheralUuid];

    this._pendingConnectionUuid = peripheralUuid;

    this._hci.createLeConn(address, addressType);
  } else {
    this._pendingConnectionUuid = null;
  }
};

NobleBindings.prototype.onLeConnUpdateComplete = function(handle, interval, latency, supervisionTimeout) {
  // no-op
};

NobleBindings.prototype.onDisconnComplete = function(handle, reason) {
  var uuid = this._handles[handle];

  if (uuid) {
    this._aclStreams[handle].push(null, null);
    this._gatts[handle].removeAllListeners();
    this._signalings[handle].removeAllListeners();

    delete this._gatts[uuid];
    delete this._gatts[handle];
    delete this._signalings[uuid];
    delete this._signalings[handle];
    delete this._aclStreams[handle];
    delete this._handles[uuid];
    delete this._handles[handle];

    this.emit('disconnect', uuid); // TODO: handle reason?
  } else {
    console.warn('noble warning: unknown handle ' + handle + ' disconnected!');
  }
};

NobleBindings.prototype.onEncryptChange = function(handle, encrypt) {
  var aclStream = this._aclStreams[handle];

  if (aclStream) {
    aclStream.pushEncrypt(encrypt);
  }
};

NobleBindings.prototype.onMtu = function(address, mtu) {

};

NobleBindings.prototype.onRssiRead = function(handle, rssi) {
  this.emit('rssiUpdate', this._handles[handle], rssi);
};


NobleBindings.prototype.onAclDataPkt = function(handle, cid, data) {
  var aclStream = this._aclStreams[handle];

  if (aclStream) {
    aclStream.push(cid, data);
  }
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

NobleBindings.prototype.onConnectionParameterUpdateRequest = function(handle, minInterval, maxInterval, latency, supervisionTimeout) {
  this._hci.connUpdateLe(handle, minInterval, maxInterval, latency, supervisionTimeout);
};

module.exports = new NobleBindings();
