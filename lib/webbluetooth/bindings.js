var events = require('events');
var util = require('util');

var debug = require('debug')('bindings');

var ble = navigator.bluetooth;


function addDashes(uuid){
  if(!uuid){
    return uuid;
  }
  if(uuid && uuid.length === 32){
    uuid = uuid.substring(0,8) + '-' + uuid.substring(8,12) + '-' +  uuid.substring(12,16) + '-' +  uuid.substring(16,20) + '-' +  uuid.substring(20);
  }
  return uuid.toLowerCase();
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

  process.nextTick(function(){
    console.log('first state change');
    self.emit('stateChange', 'poweredOn');
  });
  
};

util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype.init = function() {
  var self = this;
  // no-op
  setTimeout(function(){
    console.log('initing');
    self.emit('stateChange', 'poweredOn');
  }, 2000);
};
 

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

        var address = device.id;
        //TODO use device.adData when api is ready
        //rssi = device.adData.rssi;

        self._peripherals[address] = {
          uuid: address,
          address: address,
          advertisement: {localName:device.name}, //advertisement,
          rssi: device.adData.rssi,
          device: device,
          cachedServices: {},
          localName: device.name,
          serviceUuids: serviceUuids
        };

        // self.emit('discover', device.id, self._peripherals[address], device.adData.rssi);
        self.emit('discover', device.id, device.id, device.addressType, !device.paired, self._peripherals[address].advertisement, self._peripherals[address].rssi);

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
  peripheral.device.gatt.connect()
    .then(function(gattServer){
      peripheral.gattServer = gattServer;
      console.log('peripheral connected', gattServer);
      self.emit('connect', deviceUuid);
    }, function(err){
      console.log('err connecting', err);
      self.emit('connect', deviceUuid, err);
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
    this.emit('servicesDiscover', deviceUuid, peripheral.device.uuids);
  }

};

NobleBindings.prototype.discoverIncludedServices = function(deviceUuid, serviceUuid, serviceUuids) {
  var peripheral = this._peripherals[deviceUuid];

  //TODO impelment when web API has functionatility then emit response
  //this.emit('includedServicesDiscover', deviceUuid, serviceUuid, includedServiceUuids);
};

NobleBindings.prototype.discoverCharacteristics = function(deviceUuid, serviceUuid, characteristicUuids) {
  var self = this;
  var peripheral = self._peripherals[deviceUuid];

  if(peripheral){
    
    self._getPrimaryService(peripheral, serviceUuid)
      .then(function(service){
        return service.getCharacteristics();
      })
      .then(function(characteristics) {
        var discoveredCharateristcs = characteristics.map(function(char){
          var charInfo = {uuid: stripDashes(char.uuid), properties: []};
          
          if(char.properties.writeWithoutResponse){
            charInfo.properties.push('writeWithoutResponse');
          }
          
          if(char.properties.write){
            charInfo.properties.push('write');
          }
          
          if(char.properties.read){
            charInfo.properties.push('read');
          }
          
          if(char.properties.notify){
            charInfo.properties.push('notify');
          }
          
          return charInfo;
        });
        
        console.log('discoverCharacteristics', deviceUuid, serviceUuid, discoveredCharateristcs);
        self.emit('characteristicsDiscover', deviceUuid, serviceUuid, discoveredCharateristcs);
        
      });
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
      // console.log('value written', writeResponse);
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
  var self = this;
  var peripheral = this._peripherals[deviceUuid];
  
  console.log('notify not yet implemented', deviceUuid, serviceUuid, characteristicUuid, notify);
  
  self._getPrimaryService(peripheral, serviceUuid)
    .then(function(service){
      return service.getCharacteristic(addDashes(characteristicUuid));
    })
    .then(function(characteristic) {
      //TODO impelment when web API has functionatility then emit response
      console.log('notify characterstic here', characteristic);
      characteristic.oncharacteristicvaluechanged = function(evt){
        console.log('oncharacteristicvaluechanged', evt, characteristic.value);
        self.emit('read', deviceUuid, serviceUuid, characteristicUuid, new Buffer(characteristic.value), true);
      };
      return characteristic.startNotifications();
    })
    .then(function(data){
      console.log('notifications started', data);
      self.emit('notify', deviceUuid, serviceUuid, characteristicUuid, true);
    })
    .catch(function(err) {
      console.log('error enabling notifications on characteristc', err);
    });
  
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
