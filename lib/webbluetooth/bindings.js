var events = require('events');
var util = require('util');

var debug = require('debug')('bindings');

var ble = navigator.bluetooth;

function stack(name){
  var e = new Error(name);
  var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
      .replace(/^\s+at\s+/gm, '')
      .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
      .split('\n');
  console.log(stack);

}

function addDashes(uuid){
  console.log('addDashes', uuid, uuid.length);
  if(uuid && uuid.length === 32){
    uuid = uuid.substring(0,8) + '-' + uuid.substring(8,12) + '-' +  uuid.substring(12,16) + '-' +  uuid.substring(16,20) + '-' +  uuid.substring(20); 
  }
  return uuid;
}

var NobleBindings = function() {
  var port = 0xB1e;
  // this._ws = new WebSocket('ws://localhost:' + port);

  this._startScanCommand = null;
  this._peripherals = {};

  this.on('message', this._onMessage.bind(this));

  // if (!this._ws.on) {
  //   this._ws.on = this._ws.addEventListener;
  // }

  // this._ws.on('open', this._onOpen.bind(this));
  // this._ws.on('close', this._onClose.bind(this));

  var _this = this;
  // this._ws.on('message', function(event) {
  //   var data = (process.title === 'browser') ? event.data : event;

  //   _this.emit('message', JSON.parse(data));
  // });
  setTimeout(function(){
    _this.emit('stateChange', 'poweredOn');  
  }, 50); //maybe just a next tick?

  console.log('bindings constructor');
};

util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype._onOpen = function() {
  console.log('on -> open');
};

NobleBindings.prototype._onClose = function() {
  console.log('on -> close');

  this.emit('stateChange', 'poweredOff');
};

NobleBindings.prototype._onMessage = function(event) {
  console.log('_onMessage', event);

  var type = event.type;
  var peripheralUuid = event.peripheralUuid;
  var address = event.address;
  var addressType = event.addressType;
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

    this._peripherals[peripheralUuid] = {
      uuid: peripheralUuid,
      address: address,
      advertisement: advertisement,
      rssi: rssi
    };

    this.emit('discover', peripheralUuid, address, addressType, advertisement, rssi);
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

NobleBindings.prototype._sendCommand = function(command) {
  var message = JSON.stringify(command);
  console.log('_sendCommand', command);

  //this._ws.send(message);
};

NobleBindings.prototype.startScanning = function(serviceUuids, allowDuplicates) {
  var self = this;
  console.log('startScanning', serviceUuids, allowDuplicates);

  if(!Array.isArray(serviceUuids)){
    serviceUuids = [serviceUuids];
  }
  // ble.startScan(function(data){
  //   console.log('scan', data);
  //   if(data.status === 'scanResult'){
  //     self._peripherals[data.address] = data;
  //     self.emit('discover', data.address, {localName:data.name, serviceUuids: serviceUuids}, data.rssi);
  //   }
  // }, function(err){
  //   console.log('cant scan ble', err);
  // }, {serviceUuids: serviceUuids});


  ble.requestDevice({ filters: [{ services: serviceUuids.map(addDashes) }] })
    .then(function(results){
      console.log('scan finished', results);
      if(results){
        if(!Array.isArray(results)){
          results = [results];
        }
        results.forEach(function(device){


          // var advertisement = {
          //   localName: advertisement.localName,
          //   txPowerLevel: advertisement.txPowerLevel,
          //   serviceUuids: advertisement.serviceUuids,
          //   manufacturerData: (advertisement.manufacturerData ? new Buffer(advertisement.manufacturerData, 'hex') : null),
          //   serviceData: (advertisement.serviceData ? new Buffer(advertisement.serviceData, 'hex') : null)
          // };
          var peripheralUuid = device.uuids[0];
          var address = device.instanceID;
          var rssi = device.rssi;

          self._peripherals[address] = {
            uuid: peripheralUuid,
            address: address,
            advertisement: {}, //advertisement,
            rssi: rssi,
            device: device
          };

          // self.emit('discover', peripheralUuid, address, addressType, advertisement, rssi);


          self.emit('discover', device.instanceID, {localName:device.name, serviceUuids: serviceUuids}, device.rssi);
        });
      }
    }, function(err){
      console.log('err scanning', err);
    });

  this.emit('scanStart');
};

NobleBindings.prototype.stopScanning = function() {
  this._startScanCommand = null;

  this._sendCommand({
    action: 'stopScanning'
  });

  this.emit('scanStop');
};

NobleBindings.prototype.connect = function(deviceUuid) {
  var self = this;
  console.log('connect', deviceUuid);
  stack('connect');
  var peripheral = this._peripherals[deviceUuid];

  // Attempts to connect to remote GATT Server.
  peripheral.device.connectGATT()
    .then(function(connectOk){
      console.log('peripheral connected', connectOk);
      self.emit('connect', deviceUuid);
    }, function(err){
      console.log('err connecting', err);
    });

  // this._sendCommand({
  //   action: 'connect',
  //   peripheralUuid: peripheral.uuid
  // });


};

NobleBindings.prototype.disconnect = function(deviceUuid) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'disconnect',
    peripheralUuid: peripheral.uuid
  });
};

NobleBindings.prototype.updateRssi = function(deviceUuid) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'updateRssi',
    peripheralUuid: peripheral.uuid
  });
};

NobleBindings.prototype.discoverServices = function(deviceUuid, uuids) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'discoverServices',
    peripheralUuid: peripheral.uuid,
    uuids: uuids
  });
};

NobleBindings.prototype.discoverIncludedServices = function(deviceUuid, serviceUuid, serviceUuids) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'discoverIncludedServices',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    serviceUuids: serviceUuids
  });
};

NobleBindings.prototype.discoverCharacteristics = function(deviceUuid, serviceUuid, characteristicUuids) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'discoverCharacteristics',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuids: characteristicUuids
  });
};

NobleBindings.prototype.read = function(deviceUuid, serviceUuid, characteristicUuid) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'read',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid
  });
};

NobleBindings.prototype.write = function(deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'write',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    data: data.toString('hex'),
    withoutResponse: withoutResponse
  });
};

NobleBindings.prototype.broadcast = function(deviceUuid, serviceUuid, characteristicUuid, broadcast) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'broadcast',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    broadcast: broadcast
  });
};

NobleBindings.prototype.notify = function(deviceUuid, serviceUuid, characteristicUuid, notify) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'notify',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    notify: notify
  });
};

NobleBindings.prototype.discoverDescriptors = function(deviceUuid, serviceUuid, characteristicUuid) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'discoverDescriptors',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid
  });
};

NobleBindings.prototype.readValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'readValue',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    descriptorUuid: descriptorUuid
  });
};

NobleBindings.prototype.writeValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'writeValue',
    peripheralUuid: peripheral.uuid,
    serviceUuid: serviceUuid,
    characteristicUuid: characteristicUuid,
    descriptorUuid: descriptorUuid,
    data: data.toString('hex')
  });
};

NobleBindings.prototype.readHandle = function(deviceUuid, handle) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'readHandle',
    peripheralUuid: peripheral.uuid,
    handle: handle
  });
};

NobleBindings.prototype.writeHandle = function(deviceUuid, handle, data, withoutResponse) {
  var peripheral = this._peripherals[deviceUuid];

  this._sendCommand({
    action: 'readHandle',
    peripheralUuid: peripheral.uuid,
    handle: handle,
    data: data.toString('hex'),
    withoutResponse: withoutResponse
  });
};

var nobleBindings = new NobleBindings();
nobleBindings.bindingsName = 'web bluetooth api';

module.exports = nobleBindings;
