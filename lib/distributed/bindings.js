const events = require('events');
const util = require('util');

const WebSocketServer = require('ws').Server;

const NobleBindings = function () {
  this._wss = new WebSocketServer({
    port: 0xB1e
  });

  this._startScanCommand = null;
  this._peripherals = {};

  this._wss.on('connection', this._onConnection.bind(this));
  this.on('close', this._onClose.bind(this));
  this.on('message', this._onMessage.bind(this));

  process.nextTick(() => {
    this.emit('stateChange', 'poweredOff');
  });
};

util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype.init = function () {
  // no-op
};

NobleBindings.prototype._onConnection = function (ws) {
  const _this = this;

  if (this._wss.clients.length === 1) {
    this.emit('stateChange', 'poweredOn');
  } else if (this._startScanCommand) {
    this._sendCommand(ws, this._startScanCommand);
  }

  ws.on('close', () => {
    _this.emit('close', ws);
  });

  ws.on('message', data => {
    _this.emit('message', ws, JSON.parse(data));
  });
};

NobleBindings.prototype._onClose = function (ws) {
  if (this._wss.clients.length === 0) {
    this.emit('stateChange', 'poweredOff');
  }
};

NobleBindings.prototype._onMessage = function (ws, event) {
  let {
    type,
    peripheralUuid,
    address,
    addressType,
    connectable,
    advertisement,
    rssi,
    serviceUuids,
    serviceUuid,
    includedServiceUuids,
    characteristics,
    characteristicUuid,
    isNotification,
    state,
    descriptors,
    descriptorUuid,
    handle
  } = event;
  const data = event.data ? Buffer.from(event.data, 'hex') : null;

  if (type === 'discover') {
    advertisement = {
      localName: advertisement.localName,
      txPowerLevel: advertisement.txPowerLevel,
      serviceUuids: advertisement.serviceUuids,
      manufacturerData: (advertisement.manufacturerData ? Buffer.from(advertisement.manufacturerData, 'hex') : null),
      serviceData: (advertisement.serviceData ? Buffer.from(advertisement.serviceData, 'hex') : null)
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
    this.emit('includedServicesDiscover', peripheralUuid, serviceUuid, includedServiceUuids);
  } else if (type === 'characteristicsDiscover') {
    this.emit('characteristicsDiscover', peripheralUuid, serviceUuid, characteristics);
  } else if (type === 'read') {
    this.emit('read', peripheralUuid, serviceUuid, characteristicUuid, data, isNotification);
  } else if (type === 'write') {
    this.emit('write', peripheralUuid, serviceUuid, characteristicUuid);
  } else if (type === 'broadcast') {
    this.emit('broadcast', peripheralUuid, serviceUuid, characteristicUuid, state);
  } else if (type === 'notify') {
    this.emit('notify', peripheralUuid, serviceUuid, characteristicUuid, state);
  } else if (type === 'descriptorsDiscover') {
    this.emit('descriptorsDiscover', peripheralUuid, serviceUuid, characteristicUuid, descriptors);
  } else if (type === 'valueRead') {
    this.emit('valueRead', peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data);
  } else if (type === 'valueWrite') {
    this.emit('valueWrite', peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid);
  } else if (type === 'handleRead') {
    this.emit('handleRead', peripheralUuid, handle, data);
  } else if (type === 'handleWrite') {
    this.emit('handleWrite', peripheralUuid, handle);
  } else if (type === 'handleNotify') {
    this.emit('handleNotify', peripheralUuid, handle, data);
  }
};

NobleBindings.prototype._sendCommand = function (ws, command) {
  const clients = ws ? [ws] : this._wss.clients;

  const message = JSON.stringify(command);

  for (let i = 0; i < clients.length; i++) {
    clients[i].send(message);
  }
};

NobleBindings.prototype.startScanning = function (serviceUuids, allowDuplicates) {
  this._startScanCommand = {
    action: 'startScanning',
    serviceUuids: serviceUuids,
    allowDuplicates: allowDuplicates
  };

  this._sendCommand(null, this._startScanCommand);

  this.emit('scanStart');
};

NobleBindings.prototype.stopScanning = function () {
  this._startScanCommand = null;

  this._sendCommand(null, {
    action: 'stopScanning'
  });

  this.emit('scanStop');
};

NobleBindings.prototype.connect = function (deviceUuid) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'connect',
    peripheralUuid: peripheral.uuid
  });
};

NobleBindings.prototype.disconnect = function (deviceUuid) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'disconnect',
    peripheralUuid: peripheral.uuid
  });
};

NobleBindings.prototype.updateRssi = function (deviceUuid) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'updateRssi',
    peripheralUuid: peripheral.uuid
  });
};

NobleBindings.prototype.discoverServices = function (deviceUuid, uuids) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'discoverServices',
    peripheralUuid: peripheral.uuid,
    uuids: uuids
  });
};

NobleBindings.prototype.discoverIncludedServices = function (deviceUuid, serviceUuid, serviceUuids) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'discoverIncludedServices',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    serviceUuids: serviceUuids
  });
};

NobleBindings.prototype.discoverCharacteristics = function (deviceUuid, serviceUuid, characteristicUuids) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'discoverCharacteristics',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuids: characteristicUuids
  });
};

NobleBindings.prototype.read = function (deviceUuid, serviceUuid, characteristicUuid) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'read',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid
  });
};

NobleBindings.prototype.write = function (deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'write',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    data: data.toString('hex'),
    withoutResponse: withoutResponse
  });
};

NobleBindings.prototype.broadcast = function (deviceUuid, serviceUuid, characteristicUuid, broadcast) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'broadcast',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    broadcast: broadcast
  });
};

NobleBindings.prototype.notify = function (deviceUuid, serviceUuid, characteristicUuid, notify) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'notify',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    notify: notify
  });
};

NobleBindings.prototype.discoverDescriptors = function (deviceUuid, serviceUuid, characteristicUuid) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'discoverDescriptors',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid
  });
};

NobleBindings.prototype.readValue = function (deviceUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'readValue',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    descriptorUuid: descriptorUuid
  });
};

NobleBindings.prototype.writeValue = function (deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'writeValue',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    descriptorUuid: descriptorUuid,
    data: data.toString('hex')
  });
};

NobleBindings.prototype.readHandle = function (deviceUuid, handle) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'readHandle',
    peripheralUuid: peripheral.uuid,
    handle: handle
  });
};

NobleBindings.prototype.writeHandle = function (deviceUuid, handle, data, withoutResponse) {
  const peripheral = this._peripherals[deviceUuid];

  this._sendCommand(peripheral.ws, {
    action: 'readHandle',
    peripheralUuid: peripheral.uuid,
    handle: handle,
    data: data.toString('hex'),
    withoutResponse: withoutResponse
  });
};

module.exports = NobleBindings;
