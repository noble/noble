var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');

var HciBle = require('./hci-ble');
var L2capBle = require('./l2cap-ble');

function NobleBindings (cfg) {
  this._cfg = cfg
  this._addresses = {};
  this._addresseTypes = {};

  this._hciBle = new HciBle(cfg);
  this._l2capBle = {};
};

util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype.init = function() {
  this._hciBle.on('stateChange', this.onStateChange.bind(this));
  this._hciBle.on('scanStart', this.onScanStart.bind(this));
  this._hciBle.on('scanStop', this.onScanStop.bind(this));
  this._hciBle.on('discover', this.onDiscover.bind(this));
};

NobleBindings.prototype.onStateChange = function(state) {
  this.emit('stateChange', state);
};

NobleBindings.prototype.prototype.startScanning = function(serviceUuids, allowDuplicates) {
  this._scanServiceUuids = serviceUuids || [];

  this._hciBle.startScanning(allowDuplicates);
};

NobleBindings.prototype.onScanStart = function() {
  this.emit('scanStart');
};

NobleBindings.prototype.stopScanning = function() {
  this._hciBle.stopScanning();
};

NobleBindings.prototype.onScanStop = function() {
  this.emit('scanStop');
};

NobleBindings.prototype.onDiscover = function(address, addressType, advertisement, rssi) {
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

NobleBindings.prototype.connect = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];
  var addressType = this._addresseTypes[peripheralUuid];

  this._l2capBle[address] = new L2capBle(this._cfg, address, addressType);
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

NobleBindings.prototype.onConnect = function(address, error) {
  var uuid = address.split(':').join('').toLowerCase();

  if (!error) {
    this._l2capBle[address].exchangeMtu(256);
  }

  this.emit('connect', uuid, error);
};

NobleBindings.prototype.disconnect = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.disconnect();
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onDisconnect = function(address) {
  var uuid = address.split(':').join('').toLowerCase();

  this._l2capBle[address].kill();

  this._l2capBle[address].removeAllListeners();

  delete this._l2capBle[address];

  this.emit('disconnect', uuid);
};

NobleBindings.prototype.exchangeMtu = function(peripheralUuid, mtu) {
};

NobleBindings.prototype.onMtu = function(address, mtu) {

};

NobleBindings.prototype.updateRssi = function(peripheralUuid) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.updateRssi();
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onRssi = function(address, rssi) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('rssiUpdate', uuid, rssi);
};

NobleBindings.prototype.discoverServices = function(peripheralUuid, uuids) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.discoverServices(uuids || []);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onServicesDiscovered = function(address, serviceUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('servicesDiscover', uuid, serviceUuids);
};

NobleBindings.prototype.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.discoverIncludedServices(serviceUuid, serviceUuids || []);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onIncludedServicesDiscovered = function(address, serviceUuid, includedServiceUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('includedServicesDiscover', uuid, serviceUuid, includedServiceUuids);
};

NobleBindings.prototype.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.discoverCharacteristics(serviceUuid, characteristicUuids || []);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onCharacteristicsDiscovered = function(address, serviceUuid, characteristics) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('characteristicsDiscover', uuid, serviceUuid, characteristics);
};

NobleBindings.prototype.read = function(peripheralUuid, serviceUuid, characteristicUuid) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.read(serviceUuid, characteristicUuid);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onRead = function(address, serviceUuid, characteristicUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('read', uuid, serviceUuid, characteristicUuid, data, false);
};

NobleBindings.prototype.write = function(peripheralUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.write(serviceUuid, characteristicUuid, data, withoutResponse);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onWrite = function(address, serviceUuid, characteristicUuid) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('write', uuid, serviceUuid, characteristicUuid);
};

NobleBindings.prototype.broadcast = function(peripheralUuid, serviceUuid, characteristicUuid, broadcast) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.broadcast(serviceUuid, characteristicUuid, broadcast);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onBroadcast = function(address, serviceUuid, characteristicUuid, state) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('broadcast', uuid, serviceUuid, characteristicUuid, state);
};

NobleBindings.prototype.notify = function(peripheralUuid, serviceUuid, characteristicUuid, notify) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.notify(serviceUuid, characteristicUuid, notify);
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
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.discoverDescriptors(serviceUuid, characteristicUuid);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onDescriptorsDiscovered = function(address, serviceUuid, characteristicUuid, descriptorUuids) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('descriptorsDiscover', uuid, serviceUuid, characteristicUuid, descriptorUuids);
};

NobleBindings.prototype.readValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.readValue(serviceUuid, characteristicUuid, descriptorUuid);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onValueRead = function(address, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('valueRead', uuid, serviceUuid, characteristicUuid, descriptorUuid, data);
};

NobleBindings.prototype.writeValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.writeValue(serviceUuid, characteristicUuid, descriptorUuid, data);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onValueWrite = function(address, serviceUuid, characteristicUuid, descriptorUuid) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('valueWrite', uuid, serviceUuid, characteristicUuid, descriptorUuid);
};

NobleBindings.prototype.readHandle = function(peripheralUuid, handle) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.readHandle(handle);
  } else {
    console.warn('noble warning: unknown peripheral ' + peripheralUuid);
  }
};

NobleBindings.prototype.onHandleRead = function(address, handle, data) {
  var uuid = address.split(':').join('').toLowerCase();

  this.emit('handleRead', uuid, handle, data);
};

NobleBindings.prototype.writeHandle = function(peripheralUuid, handle, data, withoutResponse) {
  var address = this._addresses[peripheralUuid];
  var l2capBle = this._l2capBle[address];

  if (l2capBle) {
    l2capBle.writeHandle(handle, data, withoutResponse);
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

module.exports = function (cfg) {
  var nobleBindings = new NobleBindings (cfg);
  nobleBindings.init();
  return nobleBindings;
}
