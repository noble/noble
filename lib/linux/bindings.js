var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');

var HciBle = require('./hci-ble');
var L2capBle = require('./l2cap-ble');

var NobleBindings = function() {
  this._addresses = {};
  this._addresseTypes = {};

  this._pendingConnection = false;
  this._connectionQueue = [];

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
    address = address.toLowerCase();

    var uuid = address.split(':').join('');
    this._addresses[uuid] = address;
    this._addresseTypes[uuid] = addressType;

    this.emit('discover', uuid, address, advertisement, rssi);
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

  if (!this._pendingConnection) {
    this._pendingConnection = true;
    this._l2capBle[address].connect();
  } else {
    this._connectionQueue.push(address);
  }
};

nobleBindings.onConnect = function(address, error) {
  var uuid = address.split(':').join('').toLowerCase();

  if (!error) {
    this._l2capBle[address].exchangeMtu(256);
  }

  this.emit('connect', uuid, error);

  if (this._connectionQueue.length > 0) {
    address = this._connectionQueue.shift();

    this._l2capBle[address].connect();
  } else {
    this._pendingConnection = false;
  }
};

nobleBindings.disconnect = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.disconnect();
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
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
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.updateRssi();
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

nobleBindings.onRssi = function(address, rssi) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('rssiUpdate', uuid, rssi);
};

nobleBindings.discoverServices = function(peripheralUuid, uuids) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.discoverServices(uuids || []);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

nobleBindings.onServicesDiscovered = function(address, serviceUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('servicesDiscover', uuid, serviceUuids);
};

nobleBindings.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.discoverIncludedServices(serviceUuid, serviceUuids || []);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

nobleBindings.onIncludedServicesDiscovered = function(address, serviceUuid, includedServiceUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('includedServicesDiscover', uuid, serviceUuid, includedServiceUuids);
};

nobleBindings.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.discoverCharacteristics(serviceUuid, characteristicUuids || []);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

nobleBindings.onCharacteristicsDiscovered = function(address, serviceUuid, characteristics) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('characteristicsDiscover', uuid, serviceUuid, characteristics);
};

nobleBindings.read = function(peripheralUuid, serviceUuid, characteristicUuid) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.read(serviceUuid, characteristicUuid);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

nobleBindings.onRead = function(address, serviceUuid, characteristicUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('read', uuid, serviceUuid, characteristicUuid, data, false);
};

nobleBindings.write = function(peripheralUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.write(serviceUuid, characteristicUuid, data, withoutResponse);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

nobleBindings.onWrite = function(address, serviceUuid, characteristicUuid) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('write', uuid, serviceUuid, characteristicUuid);
};

nobleBindings.broadcast = function(peripheralUuid, serviceUuid, characteristicUuid, broadcast) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.broadcast(serviceUuid, characteristicUuid, broadcast);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

nobleBindings.onBroadcast = function(address, serviceUuid, characteristicUuid, state) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('broadcast', uuid, serviceUuid, characteristicUuid, state);
};

nobleBindings.notify = function(peripheralUuid, serviceUuid, characteristicUuid, notify) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.notify(serviceUuid, characteristicUuid, notify);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
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
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.discoverDescriptors(serviceUuid, characteristicUuid);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

nobleBindings.onDescriptorsDiscovered = function(address, serviceUuid, characteristicUuid, descriptorUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('descriptorsDiscover', uuid, serviceUuid, characteristicUuid, descriptorUuids);
};

nobleBindings.readValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.readValue(serviceUuid, characteristicUuid, descriptorUuid);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

nobleBindings.onValueRead = function(address, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('valueRead', uuid, serviceUuid, characteristicUuid, descriptorUuid, data);
};

nobleBindings.writeValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.writeValue(serviceUuid, characteristicUuid, descriptorUuid, data);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

nobleBindings.onValueWrite = function(address, serviceUuid, characteristicUuid, descriptorUuid) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('valueWrite', uuid, serviceUuid, characteristicUuid, descriptorUuid);
};

nobleBindings.readHandle = function(peripheralUuid, handle) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.readHandle(handle);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

nobleBindings.onHandleRead = function(address, handle, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('handleRead', uuid, handle, data);
};

nobleBindings.writeHandle = function(peripheralUuid, handle, data, withoutResponse) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.writeHandle(handle, data, withoutResponse);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
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
