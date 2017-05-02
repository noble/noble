var events = require('events');
var util = require('util');

var debug = require('debug')('bindings');
var WebSocketServer = require('ws').Server;

var NobleBindings = function() {
  this._wss = new WebSocketServer({
    port: 0xB1e
  });

  this._startScanCommand = null;
  this._peripherals = {};

  this._wss.on('connection', this._onConnection.bind(this));
  this.on('close', this._onClose.bind(this));
  this.on('message', this._onMessage.bind(this));

  process.nextTick(function() {
    this.emit('stateChange', 'poweredOff');
  }.bind(this));
};

util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype.init = function() {
  // no-op
};

NobleBindings.prototype._onConnection = function(ws) {
  var _this = this;

  if (this._wss.clients.length === 1) {
    this.emit('stateChange', 'poweredOn');
  } else if (this._startScanCommand) {
    this._sendCommand(ws, this._startScanCommand);
  }

  ws.on('close', function() {
    _this.emit('close', ws);
  });

  ws.on('message', function(data) {
    _this.emit('message', ws, JSON.parse(data));
  });
};

NobleBindings.prototype._onClose = function(ws) {
  if (this._wss.clients.length === 0) {
    this.emit('stateChange', 'poweredOff');
  }
};

NobleBindings.prototype._onMessage = function(ws, event) {
  var type = event.type;
  var peripheralUuid = event.peripheralUuid;
  var address = event.address;
  var addressType = event.addressType;
  var connectable = event.connectable;
  var advertisement = event.advertisement;
  var rssi = event.rssi;
  var serviceUuids = event.serviceUuids;
  var serviceId = event.serviceId;
  var includedServiceUuids = event.includedServiceUuids;
  var characteristics = event.characteristics;
  var characteristicId = event.characteristicId;
  var data = event.data ? new Buffer(event.data, 'hex') : null;
  var isNotification = event.isNotification;
  var state = event.state;
  var descriptors = event.descriptors;
  var descriptorId = event.descriptorId;
  var handle = event.handle;

  if (type === 'discover') {
    advertisement = {
      localName: advertisement.localName,
      txPowerLevel: advertisement.txPowerLevel,
      serviceUuids: advertisement.serviceUuids,
      manufacturerData: (advertisement.manufacturerData ? new Buffer(advertisement.manufacturerData, 'hex') : null),
      serviceData: (advertisement.serviceData ? new Buffer(advertisement.serviceData, 'hex') : null)
    };

    // TODO: handle duplicate peripheralUuid's
    this._peripherals[peripheralUuid] = {
      uuid: peripheralUuid,
      address: address,
      advertisement: advertisement,
      rssi: rssi,
      ws: ws
    };

    this.emit('discover', peripheralUuid, address, addressType, connectable, advertisement, rssi);
  } else if (type === 'connect') {
    this.emit('connect', peripheralUuid);
  } else if (type === 'disconnect') {
    this.emit('disconnect', peripheralUuid);
  } else if (type === 'rssiUpdate') {
    this.emit('rssiUpdate', peripheralUuid, rssi);
  } else if (type === 'servicesDiscover') {
    this.emit('servicesDiscover', peripheralUuid, serviceUuids);
  } else if (type === 'includedServicesDiscover') {
    this.emit('includedServicesDiscover', peripheralUuid, serviceId, includedServiceUuids);
  } else if (type === 'characteristicsDiscover') {
    this.emit('characteristicsDiscover', peripheralUuid, serviceId, characteristics);
  } else if (type === 'read') {
    this.emit('read', peripheralUuid, serviceId, characteristicId, data, isNotification);
  } else if (type === 'write') {
    this.emit('write', peripheralUuid, serviceId, characteristicId);
  } else if (type === 'broadcast') {
    this.emit('broadcast', peripheralUuid, serviceId, characteristicId, state);
  } else if (type === 'notify') {
    this.emit('notify', peripheralUuid, serviceId, characteristicId, state);
  } else if (type === 'descriptorsDiscover') {
    this.emit('descriptorsDiscover', peripheralUuid, serviceId, characteristicId, descriptors);
  } else if (type === 'valueRead') {
    this.emit('valueRead', peripheralUuid, serviceId, characteristicId, descriptorId, data);
  } else if (type === 'valueWrite') {
    this.emit('valueWrite', peripheralUuid, serviceId, characteristicId, descriptorId);
  } else if (type === 'handleRead') {
    this.emit('handleRead', peripheralUuid, handle, data);
  } else if (type === 'handleWrite') {
    this.emit('handleWrite', peripheralUuid, handle);
  } else if (type === 'handleNotify') {
    this.emit('handleNotify', peripheralUuid, handle, data);
  }
};

NobleBindings.prototype._sendCommand = function(ws, command) {
  var clients = ws ? [ws] : this._wss.clients;

  var message = JSON.stringify(command);

  for (var i = 0; i < clients.length; i++) {
    clients[i].send(message);
  }
};

NobleBindings.prototype.startScanning = function(serviceUuids, allowDuplicates) {
  this._startScanCommand = {
    action: 'startScanning',
    serviceUuids: serviceUuids,
    allowDuplicates: allowDuplicates
  };

  this._sendCommand(null, this._startScanCommand);

  this.emit('scanStart');
};

NobleBindings.prototype.stopScanning = function() {
  this._startScanCommand = null;

  this._sendCommand(null, {
    action: 'stopScanning'
  });

  this.emit('scanStop');
};

NobleBindings.prototype.connect = function(deviceUuid) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'connect',
    peripheralUuid: peripheral.uuid
  });
};

NobleBindings.prototype.disconnect = function(deviceUuid) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'disconnect',
    peripheralUuid: peripheral.uuid
  });
};

NobleBindings.prototype.updateRssi = function(deviceUuid) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'updateRssi',
    peripheralUuid: peripheral.uuid
  });
};

NobleBindings.prototype.discoverServices = function(deviceUuid, uuids) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'discoverServices',
    peripheralUuid: peripheral.uuid,
    uuids: uuids
  });
};

NobleBindings.prototype.discoverIncludedServices = function(deviceUuid, serviceId, serviceUuids) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'discoverIncludedServices',
    peripheralUuid: peripheral.uuid,
    serviceId: serviceId,
    serviceUuids: serviceUuids
  });
};

NobleBindings.prototype.discoverCharacteristics = function(deviceUuid, serviceId, characteristicUuids) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'discoverCharacteristics',
    peripheralUuid: peripheral.uuid,
    serviceId: serviceId,
    characteristicUuids: characteristicUuids
  });
};

NobleBindings.prototype.read = function(deviceUuid, serviceId, characteristicId) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'read',
    peripheralUuid: peripheral.uuid,
    serviceId: serviceId,
    characteristicId: characteristicId
  });
};

NobleBindings.prototype.write = function(deviceUuid, serviceId, characteristicId, data, withoutResponse) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'write',
    peripheralUuid: peripheral.uuid,
    serviceId: serviceId,
    characteristicId: characteristicId,
    data: data.toString('hex'),
    withoutResponse: withoutResponse
  });
};

NobleBindings.prototype.broadcast = function(deviceUuid, serviceId, characteristicId, broadcast) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'broadcast',
    peripheralUuid: peripheral.uuid,
    serviceId: serviceId,
    characteristicId: characteristicId,
    broadcast: broadcast
  });
};

NobleBindings.prototype.notify = function(deviceUuid, serviceId, characteristicId, notify) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'notify',
    peripheralUuid: peripheral.uuid,
    serviceId: serviceId,
    characteristicId: characteristicId,
    notify: notify
  });
};

NobleBindings.prototype.discoverDescriptors = function(deviceUuid, serviceId, characteristicId) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'discoverDescriptors',
    peripheralUuid: peripheral.uuid,
    serviceId: serviceId,
    characteristicId: characteristicId
  });
};

NobleBindings.prototype.readValue = function(deviceUuid, serviceId, characteristicId, descriptorId) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'readValue',
    peripheralUuid: peripheral.uuid,
    serviceId: serviceId,
    characteristicId: characteristicId,
    descriptorId: descriptorId
  });
};

NobleBindings.prototype.writeValue = function(deviceUuid, serviceId, characteristicId, descriptorId, data) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'writeValue',
    peripheralUuid: peripheral.uuid,
    serviceId: serviceId,
    characteristicId: characteristicId,
    descriptorId: descriptorId,
    data: data.toString('hex')
  });
};

NobleBindings.prototype.readHandle = function(deviceUuid, handle) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'readHandle',
    peripheralUuid: peripheral.uuid,
    handle: handle
  });
};

NobleBindings.prototype.writeHandle = function(deviceUuid, handle, data, withoutResponse) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'readHandle',
    peripheralUuid: peripheral.uuid,
    handle: handle,
    data: data.toString('hex'),
    withoutResponse: withoutResponse
  });
};

module.exports = new NobleBindings();
