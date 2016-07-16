var events = require('events');
var util = require('util');

var debug = require('debug')('bindings');

var CoreBluetooth = require('core-bluetooth');

var NobleBindings = function() {
  this._peripherals = {};
};

util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype.startScanning = function(serviceUuids, allowDuplicates) {
  this._centralManager.scanForPeripherals(serviceUuids, allowDuplicates);

  this.emit('scanStart');
};

NobleBindings.prototype.stopScanning = function() {
  this._centralManager.stopScan();

  this.emit('scanStop');
};

NobleBindings.prototype.connect = function(identifier) {
  var peripheral = this._peripheralForIdentifier(identifier);

  peripheral.connect();
};

NobleBindings.prototype.disconnect = function(identifier) {
  var peripheral = this._peripheralForIdentifier(identifier);

  peripheral.cancelConnection();
};

NobleBindings.prototype.updateRssi = function(identifier) {
  var peripheral = this._peripheralForIdentifier(identifier);

  peripheral.once('rssiUpdate', function(rssi, error) {
    this.emit('rssiUpdate', identifier, rssi);
  }.bind(this));

  peripheral.readRSSI();
};

NobleBindings.prototype.discoverServices = function(identifier, uuids) {
  var peripheral = this._peripheralForIdentifier(identifier);

  peripheral.once('servicesDiscover', function(services, error) {
    var serviceUuids = [];

    this._peripherals[identifier]._services = {};

    for (var i = 0; i < services.length; i++) {
      var service = services[i];

      var serviceUuid = convertUuid(service.uuid);
      var serviceIdentifier = serviceUuid;

      serviceUuids.push(serviceUuid);

      this._peripherals[identifier]._services[serviceIdentifier] = service;
    }

    this.emit('servicesDiscover', identifier, serviceUuids);
  }.bind(this));

  peripheral.discoverServices(uuids);
};

NobleBindings.prototype.discoverIncludedServices = function(identifier, serviceIdentifier, serviceUuids) {
  var service = this._serviceForIdentifier(identifier, serviceIdentifier);

  service.once('includedServicesDiscover', function(includedServices, error) {
    var includedServiceUuids = [];

    this._peripherals[identifier]._services[serviceIdentifier]._includedServices = {};

    for (var i = 0; i < includedServices.length; i++) {
      var includedService = includedServices[i];

      var includedServiceUuid = convertUuid(includedServices.uuid);
      var includedServicesIdentifier = includedServiceUuid;

      includedServiceUuids.push(includedServiceUuid);

      this._peripherals[identifier]._services[serviceIdentifier]._includedServices[includedServicesIdentifier] = includedService;
    }

    this.emit('includedServicesDiscover', identifier, serviceIdentifier, includedServiceUuids);
  }.bind(this));

  service.discoverIncludedServices(serviceUuids);
};

NobleBindings.prototype.discoverCharacteristics = function(identifier, serviceIdentifier, characteristicUuids) {
  var service = this._serviceForIdentifier(identifier, serviceIdentifier);

  service.once('characteristicsDiscover', function(characteristics, error) {
    var characteristics_ = [];

    this._peripherals[identifier]._services[serviceIdentifier]._characteristics = {};

    for (var i = 0; i < characteristics.length; i++) {
      var characteristic = characteristics[i];

      var characteristicUuid = convertUuid(characteristic.uuid);
      var characteristicIdentifier = characteristicUuid;
      var characteristicProperties = characteristic.properties;

      var properties = [];

      if (characteristicProperties & 0x01) {
        properties.push('broadcast');
      }

      if (characteristicProperties & 0x02) {
        properties.push('read');
      }

      if (characteristicProperties & 0x04) {
        properties.push('writeWithoutResponse');
      }

      if (characteristicProperties & 0x08) {
        properties.push('write');
      }

      if (characteristicProperties & 0x10) {
        properties.push('notify');
      }

      if (characteristicProperties & 0x20) {
        properties.push('indicate');
      }

      if (characteristicProperties & 0x40) {
        properties.push('authenticatedSignedWrites');
      }

      if (characteristicProperties & 0x80) {
        properties.push('extendedProperties');
      }

      characteristics_.push({
        uuid: characteristicUuid,
        properties: properties
      });

      this._peripherals[identifier]._services[serviceIdentifier]._characteristics[characteristicIdentifier] = characteristic;
    }

    this.emit('characteristicsDiscover', identifier, serviceIdentifier, characteristics_);
  }.bind(this));

  service.discoverCharacteristics(characteristicUuids);
};

NobleBindings.prototype.discoverDescriptors = function(identifier, serviceIdentifier, characteristicIdentifier) {
  var characteristic = this._characteristicForIdentifier(identifier, serviceIdentifier, characteristicIdentifier);

  characteristic.once('descriptorsDiscover', function(descriptors, error) {
    var descriptorUuids = [];
    this._peripherals[identifier]._services[serviceIdentifier]._characteristics[characteristicIdentifier]._descriptors = {};

    if (descriptors) {
      for (var i = 0; i < descriptors.length; i++) {
        var descriptor = descriptors[i];

        var descriptorUuid = convertUuid(descriptor.uuid);
        var descriptorIdentifier = descriptorUuid;

        descriptorUuids.push(descriptorUuid);

        this._peripherals[identifier]._services[serviceIdentifier]._characteristics[characteristicIdentifier]._descriptors[descriptorIdentifier] = descriptor;
      }
    }

    this.emit('descriptorsDiscover', identifier, serviceIdentifier, characteristicIdentifier, descriptorUuids);
  }.bind(this));

  characteristic.discoverDescriptors();
};

NobleBindings.prototype.read = function(identifier, serviceIdentifier, characteristicIdentifier) {
  var characteristic = this._characteristicForIdentifier(identifier, serviceIdentifier, characteristicIdentifier);

  characteristic.readValue();

  //can we get isNotification from corebluetooth?
  characteristic.once('valueUpdate', function(value, error) {
    this.emit('read', identifier, serviceIdentifier, characteristicIdentifier, value, null);
  }.bind(this));
};

NobleBindings.prototype.write = function(identifier, serviceIdentifier, characteristicIdentifier, data, withoutResponse) {
  var characteristic = this._characteristicForIdentifier(identifier, serviceIdentifier, characteristicIdentifier);

  // TODO convert type here or in core-bluetooth peripheral?
  characteristic.writeValue(data, type);

  //TODO we do emit for withoutResponse right?
  if (withoutResponse) {
    this.emit('write', identifier, serviceIdentifier, characteristicIdentifier);
  } else {
    characteristic.once('valueWrite', function(error) {
      this.emit('write', identifier, serviceIdentifier, characteristicIdentifier);
    }.bind(this));
  }
};

NobleBindings.prototype.readValue = function(identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier) {
  var descriptor = this._descriptorForIdentifier(identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier);

  descriptor.readValue();

  // TODO this emits the handle right? but we dont have access to those anymore right?
  // this.emit('handleRead', identifier, descriptorHandle, data);

  descriptor.once('valueUpdate', function(value, error) {
    this.emit('valueRead', identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier, value);
  }.bind(this));
}

NobleBindings.prototype.writeValue = function(identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier, data) {
  var descriptor = this._descriptorForIdentifier(identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier);

  descriptor.writeValue(data);

  // TODO this emits the handle right? but we dont have access to those anymore right?
  // this.emit('handleWrite', identifier, descriptorHandle);

  descriptor.once('valueWrite', function(error) {
    this.emit('valueWrite', identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier);
  }.bind(this));
}

NobleBindings.prototype.init = function() {
  this._centralManager = new CoreBluetooth.CentralManager();

  this._centralManager.on('address', this._onAddress.bind(this));
  this._centralManager.on('stateUpdate', this._onStateUpdate.bind(this));
  this._centralManager.on('peripheralDiscover', this._onPeripheralDiscover.bind(this));
  this._centralManager.on('peripheralConnect', this._onPeripheralConnect.bind(this));
  this._centralManager.on('peripheralConnectFail', this._onPeripheralConnect.bind(this));
  this._centralManager.on('peripheralDisconnect', this._onPeripheralDisconnect.bind(this));
};

NobleBindings.prototype._peripheralForIdentifier = function(identifier) {
  return this._peripherals[identifier].peripheral;
};

NobleBindings.prototype._serviceForIdentifier = function(identifier, serviceIdentifier) {
  return this._peripherals[identifier]._services[serviceIdentifier];
};

NobleBindings.prototype._characteristicForIdentifier = function(identifier, serviceIdentifier, characteristicIdentifier) {
  return this._peripherals[identifier]._services[serviceIdentifier]._characteristics[characteristicIdentifier];
};

NobleBindings.prototype._descriptorForIdentifier = function(identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier) {
  return this._peripherals[identifier]._services[serviceIdentifier]._characteristics[characteristicIdentifier]._descriptors[descriptorIdentifier];
};

NobleBindings.prototype._onAddress = function(addresss) {
  this.emit('addressChange', addresss);
};

NobleBindings.prototype._onStateUpdate = function(state) {
  this.emit('stateChange', state);
};

NobleBindings.prototype._onPeripheralDiscover = function(peripheral, advertisementData, rssi) {
  var identifier = convertUuid(peripheral.identifier);
  var address = peripheral.address || 'unknown';
  var connectable = advertisementData.connectable;
  var advertisement = {
    localName: advertisementData.localName,
    txPowerLevel: advertisementData.txPowerLevel,
    manufacturerData: advertisementData.manufacturerData,
    serviceData: advertisementData.serviceData,
    serviceUuids: convertUuids(advertisementData.serviceUuids)
  };

  this._peripherals[identifier] = {
    peripheral: peripheral,
    identifier: identifier,
    address: address,
    connectable: connectable,
    advertisement: advertisement,
    rssi: rssi
  };

  this.emit('discover', identifier, address, 'unknown', connectable, advertisement, rssi);
};

NobleBindings.prototype._onPeripheralConnect = function(peripheral, error) {
  var identifier = convertUuid(peripheral.identifier);

  this.emit('connect', identifier, error);
};

NobleBindings.prototype._onPeripheralDisconnect = function(peripheral) {
  var identifier = convertUuid(peripheral.identifier);

  this.emit('disconnect', identifier);
};

function convertUuid(uuid) {
  return uuid.replace(/-/g, '').toLowerCase();
}

function convertUuids(uuids) {
  var convertedUuids;

  if (uuids) {
    convertedUuids = [];

    uuids.forEach(function(uuid) {
      convertedUuids.push(convertUuid(uuid));
    });
  }

  return convertedUuids;
}

module.exports = new NobleBindings();

// /**
//  * Read value
//  *
//  * @param  {[type]} deviceUuid         [description]
//  * @param  {[type]} serviceUuid        [description]
//  * @param  {[type]} characteristicUuid [description]
//  *
//  * @discussion tested
//  */
// nobleBindings.read = function(deviceUuid, serviceUuid, characteristicUuid) {
//   this.sendCBMsg(65 , {
//     kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
//     kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
//     kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle
//   });
// };

// /**
//  * Response to read value
//  *
//  * @discussion tested
//  */
// nobleBindings.on('kCBMsgId71', function(args) {
//   var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
//   var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
//   var isNotification = args.kCBMsgArgIsNotification ? true : false;
//   var data = args.kCBMsgArgData;

//   var peripheral = this._peripherals[deviceUuid];

//   if (peripheral) {
//     for(var i in peripheral.services) {
//       if (peripheral.services[i].characteristics &&
//           peripheral.services[i].characteristics[characteristicHandle]) {

//         this.emit('read', deviceUuid, peripheral.services[i].uuid,
//           peripheral.services[i].characteristics[characteristicHandle].uuid, data, isNotification);
//         break;
//       }
//     }
//   } else {
//     console.warn('noble (mac yosemite): received read event from unknown peripheral: ' + deviceUuid + ' !');
//   }
// });



// /**
//  * Write value
//  * @param  {String} deviceUuid
//  * @param  {String} serviceUuid
//  * @param  {String} characteristicUuid
//  * @param  {[Type]} data
//  * @param  {Bool} withoutResponse
//  *
//  * @discussion tested
//  */
// nobleBindings.write = function(deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
//   this.sendCBMsg(66, {
//     kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
//     kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
//     kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
//     kCBMsgArgData: data,
//     kCBMsgArgType: (withoutResponse ? 1 : 0)
//   });

//   if (withoutResponse) {
//     this.emit('write', deviceUuid, serviceUuid, characteristicUuid);
//   }
// };

// /**
//  * Response to write
//  *
//  * @discussion tested
//  */
// nobleBindings.on('kCBMsgId72', function(args) {
//   var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
//   var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
//   var result = args.kCBMsgArgResult;

//   for(var i in this._peripherals[deviceUuid].services) {
//     if (this._peripherals[deviceUuid].services[i].characteristics &&
//         this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {
//       this.emit('write', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
//         this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid);
//       break;
//     }
//   }
// });



// /**
//  * Broadcast
//  *
//  * @param  {[type]} deviceUuid         [description]
//  * @param  {[type]} serviceUuid        [description]
//  * @param  {[type]} characteristicUuid [description]
//  * @param  {[type]} broadcast          [description]
//  * @return {[type]}                    [description]
//  *
//  * @discussion The ids were incemented but there seems to be no CoreBluetooth function to call/verify this.
//  */
// nobleBindings.broadcast = function(deviceUuid, serviceUuid, characteristicUuid, broadcast) {
//   this.sendCBMsg(67, {
//     kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
//     kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
//     kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
//     kCBMsgArgState: (broadcast ? 1 : 0)
//   });
// };

// /**
//  * Response to broadcast
//  *
//  * @discussion The ids were incemented but there seems to be no CoreBluetooth function to call/verify this.
//  */
// nobleBindings.on('kCBMsgId73', function(args) {
//   var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
//   var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
//   var result = args.kCBMsgArgResult;
//   var state = args.kCBMsgArgState ? true : false;

//   for(var i in this._peripherals[deviceUuid].services) {
//     if (this._peripherals[deviceUuid].services[i].characteristics &&
//         this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {
//       this.emit('broadcast', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
//         this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid, state);
//       break;
//     }
//   }
// });



// /**
//  * Register notification hanlder
//  *
//  * @param  {String} deviceUuid            Peripheral UUID
//  * @param  {String} serviceUuid           Service UUID
//  * @param  {String} characteristicUuid    Charactereistic UUID
//  * @param  {Bool}   notify                If want to get notification
//  *
//  * @discussion tested
//  */
// nobleBindings.notify = function(deviceUuid, serviceUuid, characteristicUuid, notify) {
//   this.sendCBMsg(68, {
//     kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
//     kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
//     kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
//     kCBMsgArgState: (notify ? 1 : 0)
//   });
// };

// /**
//  * Response notification
//  *
//  * @discussion tested
//  */
// nobleBindings.on('kCBMsgId74', function(args) {
//   var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
//   var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
//   var result = args.kCBMsgArgResult;
//   var state = args.kCBMsgArgState ? true : false;

//   for(var i in this._peripherals[deviceUuid].services) {
//     if (this._peripherals[deviceUuid].services[i].characteristics &&
//         this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {
//       this.emit('notify', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
//         this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid, state);
//       break;
//     }
//   }
// });



// /**
//  * Read value
//  *
//  * @param  {[type]} deviceUuid         [description]
//  * @param  {[type]} serviceUuid        [description]
//  * @param  {[type]} characteristicUuid [description]
//  * @param  {[type]} descriptorUuid     [description]
//  *
//  * @discussion tested
//  */
// nobleBindings.readValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid) {
//   this.sendCBMsg(77, {
//     kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
//     kCBMsgArgDescriptorHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].descriptors[descriptorUuid].handle
//   });
// };

// /**
//  * Response to read value
//  *
//  * @discussion tested
//  */
// nobleBindings.on('kCBMsgId79', function(args) {
//   var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
//   var descriptorHandle = args.kCBMsgArgDescriptorHandle;
//   var result = args.kCBMsgArgResult;
//   var data = args.kCBMsgArgData;

//   this.emit('handleRead', deviceUuid, descriptorHandle, data);

//   for(var i in this._peripherals[deviceUuid].services) {
//     for(var j in this._peripherals[deviceUuid].services[i].characteristics) {
//       if (this._peripherals[deviceUuid].services[i].characteristics[j].descriptors &&
//         this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle]) {

//         this.emit('valueRead', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
//           this._peripherals[deviceUuid].services[i].characteristics[j].uuid,
//           this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle].uuid, data);
//         return; // break;
//       }
//     }
//   }
// });



// /**
//  * Write value
//  *
//  * @param  {[type]} deviceUuid         [description]
//  * @param  {[type]} serviceUuid        [description]
//  * @param  {[type]} characteristicUuid [description]
//  * @param  {[type]} descriptorUuid     [description]
//  * @param  {[type]} data               [description]
//  *
//  * @discussion tested
//  */
// nobleBindings.writeValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
//   this.sendCBMsg(78, {
//     kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
//     kCBMsgArgDescriptorHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].descriptors[descriptorUuid].handle,
//     kCBMsgArgData: data
//   });
// };

// /**
//  * Response to write value
//  *
//  * @discussion tested
//  */
// nobleBindings.on('kCBMsgId80', function(args) {
//   var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
//   var descriptorHandle = args.kCBMsgArgDescriptorHandle;
//   var result = args.kCBMsgArgResult;

//   this.emit('handleWrite', deviceUuid, descriptorHandle);

//   for(var i in this._peripherals[deviceUuid].services) {
//     for(var j in this._peripherals[deviceUuid].services[i].characteristics) {
//       if (this._peripherals[deviceUuid].services[i].characteristics[j].descriptors &&
//         this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle]) {

//         this.emit('valueWrite', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
//           this._peripherals[deviceUuid].services[i].characteristics[j].uuid,
//           this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle].uuid);
//         return; // break;
//       }
//     }
//   }
// });



// /**
//  * Reade value directly from handle
//  *
//  * @param  {[type]} deviceUuid [description]
//  * @param  {[type]} handle     [description]
//  *
//  * @discussion tested
//  */
// nobleBindings.readHandle = function(deviceUuid, handle) {
//   this.sendCBMsg(77, {
//     kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
//     kCBMsgArgDescriptorHandle: handle
//   });
// };



// /**
//  * Write value directly to handle
//  *
//  * @param  {[type]} deviceUuid      [description]
//  * @param  {[type]} handle          [description]
//  * @param  {[type]} data            [description]
//  * @param  {[type]} withoutResponse [description]
//  *
//  * @discussion tested
//  */
// nobleBindings.writeHandle = function(deviceUuid, handle, data, withoutResponse) {
//   // TODO: use without response
//   this.sendCBMsg(78, {
//     kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
//     kCBMsgArgDescriptorHandle: handle,
//     kCBMsgArgData: data
//   });
// };


// // Exports
// module.exports = nobleBindings;
