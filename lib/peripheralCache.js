function PeripheralCache(maxAge){
  this._cache = {};
  this.maxAge = maxAge;
}

PeripheralCache.prototype.getOrAddEntry = function(uuid){
  var entry = this._cache[uuid];
  if (!entry){
    this._cache[uuid] = {
      peripheral: undefined,
      services: {},
      characteristics: {},
      descriptors: {},
      updatedTime: new Date()
    };

      entry = this._cache[uuid];
  }
  return entry;
};

PeripheralCache.prototype.getEntry = function(uuid){
  return this._cache[uuid];
};

PeripheralCache.prototype.getPeripheral = function(uuid){
  var entry = this._cache[uuid];
  if (entry){
    this.touch(uuid);
    return entry.peripheral;
  }
};

PeripheralCache.prototype.getService = function(peripheralUuid, serviceUuid){
  var entry = this._cache[peripheralUuid];
  if (entry){
    this.touch(peripheralUuid);
    return entry.services[serviceUuid];
  }
 };

PeripheralCache.prototype.getCharacteristic = function(peripheralUuid, serviceUuid, characteristicUuid){
  var entry = this._cache[peripheralUuid];
  if (entry){
    this.touch(peripheralUuid);
    return entry.characteristics[serviceUuid][characteristicUuid];
  }
 };

PeripheralCache.prototype.getDescriptor = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid){
  var entry = this._cache[peripheralUuid];
  if (entry){
    this.touch(peripheralUuid);
    return entry.descriptors[serviceUuid][characteristicUuid][descriptorUuid];
  }
 };

PeripheralCache.prototype.addPeripheral = function(peripheral){
  var entry = this.getOrAddEntry(peripheral.uuid);
  entry.peripheral = peripheral;
  this.touch(peripheral.uuid);
};

PeripheralCache.prototype.addService = function(peripheralUuid, service){
  var entry = this.getEntry(peripheralUuid);
  if (entry){
    entry.services[service.uuid] = service;
    entry.characteristics[service.uuid] = {};
    entry.descriptors[service.uuid] = {};
    this.touch(peripheralUuid);
  }
};

PeripheralCache.prototype.addCharacteristic = function(peripheralUuid, serviceUuid, characteristic){
  var entry = this.getEntry(peripheralUuid);
  if(entry){
    entry.characteristics[serviceUuid][characteristic.uuid] = characteristic;
    entry.descriptors[serviceUuid][characteristic.uuid] = {};
    this.touch(peripheralUuid);
  }
};

PeripheralCache.prototype.addDescriptor = function(peripheralUuid, serviceUuid, characteristicUuid, descriptor){
  var entry = this.getEntry(peripheralUuid);
  if(entry){
    entry.descriptors[serviceUuid][characteristicUuid][descriptor.uuid] = descriptor;
    this.touch(peripheralUuid);
  }
};

PeripheralCache.prototype.touch = function(uuid){
  var entry = this.getEntry(uuid);
  if(entry){
    entry.updatedTime = new Date();
  }
};

PeripheralCache.prototype.contains = function(uuid){
  var entry = this.getEntry(uuid);
  return entry !== undefined;
};

PeripheralCache.prototype._checkEntries = function(){
  var now = new Date();
  for (var uuid in this._cache){
    var time = this._cache[uuid].updatedTime;
    if ((time < (now - this.maxAge)) && (!this._cache[uuid].peripheral || this._cache[uuid].peripheral.state != "connected")){
        delete this._cache[uuid];
    }
  }
};

PeripheralCache.prototype.startSweeping = function(){
  this.stopSweeping();
  if(!this.maxAge){
    //we can't sweep if there is no maximum age defined
    return;
  }
  this._sweeperInterval = setInterval(this._checkEntries.bind(this), this.maxAge / 2);
};

PeripheralCache.prototype.stopSweeping = function(){
  if(this._sweeperInterval){
    clearInterval(this._sweeperInterval);
    delete this._sweeperInterval;
  }
};

module.exports = PeripheralCache;