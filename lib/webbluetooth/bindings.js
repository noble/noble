var events = require('events');
var util = require('util');

var debug = require('debug')('bindings');

var ble = navigator.bluetooth;

//stub data until web APIs are implemented.
var tempResponses = require('./tempResponses');


function addDashes(uuid){
  if(uuid && uuid.length === 32){
    uuid = uuid.substring(0,8) + '-' + uuid.substring(8,12) + '-' +  uuid.substring(12,16) + '-' +  uuid.substring(16,20) + '-' +  uuid.substring(20);
  }
  return uuid;
}

function stripDashes(uuid){
  if(uuid){
    uuid = uuid.split('-').join('');
  }
  return uuid;
}


var NobleBindings = function() {

  this._startScanCommand = null;
  this._peripherals = {};

  var self = this;

  setTimeout(function(){
    self.emit('stateChange', 'poweredOn');
  }, 50); //maybe just a next tick?

};

util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype._onOpen = function() {
  console.log('on -> open');
};

NobleBindings.prototype._onClose = function() {
  console.log('on -> close');

  this.emit('stateChange', 'poweredOff');
};

NobleBindings.prototype.startScanning = function(serviceUuids, allowDuplicates) {
  var self = this;
  console.log('startScanning', serviceUuids, allowDuplicates);

  if(!Array.isArray(serviceUuids)){
    serviceUuids = [serviceUuids];
  }

  ble.requestDevice({ filters: [{ services: serviceUuids.map(addDashes) }] })
    .then(function(device){
      console.log('scan finished', device);
      if(device){

        var address = device.instanceID;
        var rssi;
        //TODO use device.adData when api is ready
        //rssi = device.adData.rssi;

        self._peripherals[address] = {
          uuid: address,
          address: address,
          advertisement: {}, //advertisement,
          rssi: rssi,
          device: device,
          cachedServices: {}
        };

        self.emit('discover', device.instanceID, {localName:device.name, serviceUuids: serviceUuids}, device.rssi);

      }
    }, function(err){
      console.log('err scanning', err);
    });

  this.emit('scanStart');
};

NobleBindings.prototype.stopScanning = function() {
  this._startScanCommand = null;

  //TODO: need web api completed for this to work'=
  this.emit('scanStop');
};

NobleBindings.prototype.connect = function(deviceUuid) {
  var self = this;
  console.log('connect', deviceUuid);
  var peripheral = this._peripherals[deviceUuid];

  // Attempts to connect to remote GATT Server.
  peripheral.device.connectGATT()
    .then(function(gattServer){
      peripheral.gattServer = gattServer;
      console.log('peripheral connected', gattServer);
      self.emit('connect', deviceUuid);
    }, function(err){
      console.log('err connecting', err);
    });

};

NobleBindings.prototype.disconnect = function(deviceUuid) {
  var peripheral = this._peripherals[deviceUuid];
  if(peripheral.gattServer ){
    peripheral.gattServer.disconnect();
    this.emit('disconnect', deviceUuid);
  }
};

NobleBindings.prototype.updateRssi = function(deviceUuid) {
  var peripheral = this._peripherals[deviceUuid];

  //TODO: need web api completed for this to work
  this.emit('rssiUpdate', deviceUuid, rssi);
};

NobleBindings.prototype.discoverServices = function(deviceUuid, uuids) {
  var peripheral = this._peripherals[deviceUuid];

  //TODO: need web api completed for this to work
  if(peripheral){
    this.emit('servicesDiscover', deviceUuid, tempResponses.BEAN_SERVICES);
  }

};

NobleBindings.prototype.discoverIncludedServices = function(deviceUuid, serviceUuid, serviceUuids) {
  var peripheral = this._peripherals[deviceUuid];

  //TODO impelment when web API has functionatility then emit response
  //this.emit('includedServicesDiscover', deviceUuid, serviceUuid, includedServiceUuids);
};

NobleBindings.prototype.discoverCharacteristics = function(deviceUuid, serviceUuid, characteristicUuids) {
  var peripheral = this._peripherals[deviceUuid];

  //TODO need a web api to do this
  if(peripheral){
    this.emit('characteristicsDiscover', deviceUuid, serviceUuid, tempResponses.BEAN_CHARACTERISTICS[serviceUuid] || []);
  }

};

NobleBindings.prototype._getPrimaryService = function(peripheral, serviceUuid){
  serviceUuid = addDashes(serviceUuid);
  
  if(peripheral.cachedServices[serviceUuid]){
    return new Promise(function(resolve, reject){
      resolve(peripheral.cachedServices[serviceUuid]);
    });
  }
  
  return peripheral.gattServer.getPrimaryService(serviceUuid)
    .then(function(service){
      peripheral.cachedServices[serviceUuid] = service;
      return service;
    });
};

NobleBindings.prototype.read = function(deviceUuid, serviceUuid, characteristicUuid) {
  var self = this;
  var peripheral = this._peripherals[deviceUuid];
  console.log('read', deviceUuid, serviceUuid, characteristicUuid);

  self._getPrimaryService(peripheral, serviceUuid)
    .then(function(service){
      return service.getCharacteristic(addDashes(characteristicUuid));
    })
    .then(function(characteristic) {
      return characteristic.readValue();
    })
    .then(function(data){
      console.log('value written');
      self.emit('write', peripheral.uuid, serviceUuid, characteristicUuid);
    })
    .catch(function(err) {
      console.log('error writing to characteristc', err);
    });
};

NobleBindings.prototype.write = function(deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  var self = this;
  var peripheral = this._peripherals[deviceUuid];
  console.log('write', deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse);

  self._getPrimaryService(peripheral, serviceUuid)
    .then(function(service){
      return service.getCharacteristic(addDashes(characteristicUuid));
    })
    .then(function(characteristic) {
      return characteristic.writeValue(data);
    })
    .then(function(writeResponse){
      console.log('value written', writeResponse);
      self.emit('write', peripheral.uuid, serviceUuid, characteristicUuid);
    })
    .catch(function(err) {
      console.log('error writing to characteristc', err);
    });
    
};

NobleBindings.prototype.broadcast = function(deviceUuid, serviceUuid, characteristicUuid, broadcast) {
  var peripheral = this._peripherals[deviceUuid];

  //TODO impelment when web API has functionatility then emit response
  //this.emit('broadcast', deviceUuid, serviceUuid, characteristicUuid, state);
};

NobleBindings.prototype.notify = function(deviceUuid, serviceUuid, characteristicUuid, notify) {
  var peripheral = this._peripherals[deviceUuid];
  
  console.log('notify not yet implemented', serviceUuid, characteristicUuid, notify);
  
  //TODO impelment when web API has functionatility then emit response
  this.emit('notify', deviceUuid, serviceUuid, characteristicUuid, true);
};

NobleBindings.prototype.discoverDescriptors = function(deviceUuid, serviceUuid, characteristicUuid) {
  var peripheral = this._peripherals[deviceUuid];

  //TODO impelment when web API has functionatility then emit response
  //this.emit('descriptorsDiscover', deviceUuid, serviceUuid, characteristicUuid, descriptors);
};

NobleBindings.prototype.readValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  var peripheral = this._peripherals[deviceUuid];

  //TODO impelment when web API has functionatility then emit response
  //this.emit('valueRead', deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data);
};

NobleBindings.prototype.writeValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var peripheral = this._peripherals[deviceUuid];

  //TODO impelment when web API has functionatility then emit response
  //this.emit('valueWrite', deviceUuid, serviceUuid, characteristicUuid, descriptorUuid);
};

NobleBindings.prototype.readHandle = function(deviceUuid, handle) {
  var peripheral = this._peripherals[deviceUuid];

  //TODO impelment when web API has functionatility then emit response
  //this.emit('handleRead', deviceUuid, handle, data);
};

NobleBindings.prototype.writeHandle = function(deviceUuid, handle, data, withoutResponse) {
  var peripheral = this._peripherals[deviceUuid];
  
  //TODO impelment when web API has functionatility then emit response
  //this.emit('handleWrite', deviceUuid, handle);
};

var nobleBindings = new NobleBindings();

module.exports = nobleBindings;
