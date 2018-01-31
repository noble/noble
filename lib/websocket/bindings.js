var events = require('events');
var util = require('util');

var debug = require('debug')('bindings');
var WebSocket = require('ws');

var NobleBindings = function() {
  var port = 0xB1e;
  this._ws = new WebSocket('ws://localhost:' + port);

  this._startScanCommand = null;
  this._peripherals = {};

  this.on('message', this._onMessage.bind(this));

  if (!this._ws.on) {
    this._ws.on = this._ws.addEventListener;
  }

  this._ws.on('open', this._onOpen.bind(this));
  this._ws.on('close', this._onClose.bind(this));

  var _this = this;
  this._ws.on('message', function(event) {
    var data = (process.title === 'browser') ? event.data : event;

    _this.emit('message', JSON.parse(data));
  });
};

util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype.init = function() {
  // no-op
};

NobleBindings.prototype._onOpen = function() {
  console.log('on -> open');
};

NobleBindings.prototype._onClose = function() {
  console.log('on -> close');

  this.emit('stateChange', 'poweredOff');
};

NobleBindings.prototype._onMessage = function(event) {
  var type = event.type;
  var peripheralId = event.peripheralUuid;
  var address = event.address;
  var addressType = event.addressType;
  var connectable = event.connectable;
  var advertisement = event.advertisement;
  var rssi = event.rssi;
  var serviceUuids = event.serviceUuids;
  var serviceUuid = event.serviceUuid;
  var includedServiceUuids = event.includedServiceUuids;
  var characteristics = event.characteristics;
  var characteristicUuid = event.characteristicUuid;
  var data = event.data ? new Buffer(event.data, 'hex') : null;
  var isNotification = event.isNotification;
  var state = event.state;
  var descriptors = event.descriptors;
  var descriptorUuid = event.descriptorUuid;
  var handle = event.handle;

  if (type === 'stateChange') {
    console.log(state);
    this.emit('stateChange', state);
  } else if (type === 'discover') {
    advertisement = {
      localName: advertisement.localName,
      txPowerLevel: advertisement.txPowerLevel,
      serviceUuids: advertisement.serviceUuids,
      manufacturerData: (advertisement.manufacturerData ? new Buffer(advertisement.manufacturerData, 'hex') : null),
      serviceData: (advertisement.serviceData ? new Buffer(advertisement.serviceData, 'hex') : null)
    };

    this._peripherals[peripheralId] = {
      uuid: peripheralId,
      address: address,
      advertisement: advertisement,
      rssi: rssi
    };

    this.emit('discover', peripheralId, address, addressType, connectable, advertisement, rssi);
  } else if (type === 'connect') {
    this.emit('connect', peripheralId);
  } else if (type === 'disconnect') {
    this.emit('disconnect', peripheralId);
  } else if (type === 'rssiUpdate') {
    this.emit('rssiUpdate', peripheralId, rssi);
  } else if (type === 'servicesDiscover') {
    this.emit('servicesDiscover', peripheralId, serviceUuids);
  } else if (type === 'includedServicesDiscover') {
    this.emit('includedServicesDiscover', peripheralId, serviceUuid, includedServiceUuids);
  } else if (type === 'characteristicsDiscover') {
    this.emit('characteristicsDiscover', peripheralId, serviceUuid, characteristics);
  } else if (type === 'read') {
    this.emit('read', peripheralId, serviceUuid, characteristicUuid, data, isNotification);
  } else if (type === 'write') {
    this.emit('write', peripheralId, serviceUuid, characteristicUuid);
  } else if (type === 'broadcast') {
    this.emit('broadcast', peripheralId, serviceUuid, characteristicUuid, state);
  } else if (type === 'notify') {
    this.emit('notify', peripheralId, serviceUuid, characteristicUuid, state);
  } else if (type === 'descriptorsDiscover') {
    this.emit('descriptorsDiscover', peripheralId, serviceUuid, characteristicUuid, descriptors);
  } else if (type === 'valueRead') {
    this.emit('valueRead', peripheralId, serviceUuid, characteristicUuid, descriptorUuid, data);
  } else if (type === 'valueWrite') {
    this.emit('valueWrite', peripheralId, serviceUuid, characteristicUuid, descriptorUuid);
  } else if (type === 'handleRead') {
    this.emit('handleRead', peripheralId, handle, data);
  } else if (type === 'handleWrite') {
    this.emit('handleWrite', peripheralId, handle);
  } else if (type === 'handleNotify') {
    this.emit('handleNotify', peripheralId, handle, data);
  }
};

NobleBindings.prototype._sendCommand = function(command) {
  var message = JSON.stringify(command);

  this._ws.send(message);
};

NobleBindings.prototype.startScanning = function(serviceUuids, allowDuplicates) {
  this._startScanCommand = {
    action: 'startScanning',
    serviceUuids: serviceUuids,
    allowDuplicates: allowDuplicates
  };
  this._sendCommand(this._startScanCommand);

  this.emit('scanStart');
};

NobleBindings.prototype.stopScanning = function() {
  this._startScanCommand = null;

  this._sendCommand({
    action: 'stopScanning'
  });

  this.emit('scanStop');
};

NobleBindings.prototype.connect = function(peripheralId) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'connect',
    peripheralUuid: peripheral.uuid
  });
};

NobleBindings.prototype.disconnect = function(peripheralId) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'disconnect',
    peripheralUuid: peripheral.uuid
  });
};

NobleBindings.prototype.updateRssi = function(peripheralId) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'updateRssi',
    peripheralUuid: peripheral.uuid
  });
};

NobleBindings.prototype.discoverServices = function(peripheralId, uuids) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'discoverServices',
    peripheralUuid: peripheral.uuid,
    uuids: uuids
  });
};

NobleBindings.prototype.discoverIncludedServices = function(peripheralId, serviceUuid, serviceUuids) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'discoverIncludedServices',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    serviceUuids: serviceUuids
  });
};

NobleBindings.prototype.discoverCharacteristics = function(peripheralId, serviceUuid, characteristicUuids) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'discoverCharacteristics',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuids: characteristicUuids
  });
};

NobleBindings.prototype.read = function(peripheralId, serviceUuid, characteristicUuid) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'read',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid
  });
};

NobleBindings.prototype.write = function(peripheralId, serviceUuid, characteristicUuid, data, withoutResponse) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'write',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    data: data.toString('hex'),
    withoutResponse: withoutResponse
  });
};

NobleBindings.prototype.broadcast = function(peripheralId, serviceUuid, characteristicUuid, broadcast) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'broadcast',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    broadcast: broadcast
  });
};

NobleBindings.prototype.notify = function(peripheralId, serviceUuid, characteristicUuid, notify) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'notify',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    notify: notify
  });
};

NobleBindings.prototype.discoverDescriptors = function(peripheralId, serviceUuid, characteristicUuid) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'discoverDescriptors',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid
  });
};

NobleBindings.prototype.readValue = function(peripheralId, serviceUuid, characteristicUuid, descriptorUuid) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'readValue',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    descriptorUuid: descriptorUuid
  });
};

NobleBindings.prototype.writeValue = function(peripheralId, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'writeValue',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    descriptorUuid: descriptorUuid,
    data: data.toString('hex')
  });
};

NobleBindings.prototype.readHandle = function(peripheralId, handle) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'readHandle',
    peripheralUuid: peripheral.uuid,
    handle: handle
  });
};

NobleBindings.prototype.writeHandle = function(peripheralId, handle, data, withoutResponse) {
  var peripheral = this._peripherals[peripheralId];

  this._sendCommand({
    action: 'writeHandle',
    peripheralUuid: peripheral.uuid,
    handle: handle,
    data: data.toString('hex'),
    withoutResponse: withoutResponse
  });
};

module.exports = new NobleBindings();
