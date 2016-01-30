var events = require('events');
var os = require('os');
var util = require('util');

var debug = require('debug')('mavericks-bindings');

var XpcConnection = require('xpc-connection');

var uuidToAddress = require('./uuid-to-address');

var NobleBindings = function() {
  this._peripherals = {};

  this._xpcConnection = new XpcConnection('com.apple.blued');

  this._xpcConnection.on('error', function(message) {
    this.emit('xpcError', message);
  }.bind(this));

  this._xpcConnection.on('event', function(event) {
    this.emit('xpcEvent', event);
  }.bind(this));
};

util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype.sendXpcMessage = function(message) {
  this._xpcConnection.sendMessage(message);
};

var nobleBindings = new NobleBindings();

nobleBindings.on('xpcEvent', function(event) {
  var kCBMsgId = event.kCBMsgId;
  var kCBMsgArgs = event.kCBMsgArgs;

  debug('xpcEvent: ' + JSON.stringify(event, undefined, 2));

  this.emit('kCBMsgId' + kCBMsgId, kCBMsgArgs);
});

nobleBindings.on('xpcError', function(message) {
  console.error('xpcError: ' + message);
});

nobleBindings.sendCBMsg = function(id, args) {
  debug('sendCBMsg: ' + id + ', ' + JSON.stringify(args, undefined, 2));
  this.sendXpcMessage({
    kCBMsgId: id,
    kCBMsgArgs: args
  });
};

nobleBindings.init = function() {
  this._xpcConnection.setup();

  this.sendCBMsg(1, {
    kCBMsgArgName: 'node-' + (new Date()).getTime(),
    kCBMsgArgOptions: {
        kCBInitOptionShowPowerAlert: 0
    },
    kCBMsgArgType: 0
  });
};

nobleBindings.on('kCBMsgId6', function(args) {
  var state = ['unknown', 'resetting', 'unsupported', 'unauthorized', 'poweredOff', 'poweredOn'][args.kCBMsgArgState];
  debug('state change ' + state);
  this.emit('stateChange', state);
});

nobleBindings.startScanning = function(serviceUuids, allowDuplicates) {
  var args = {
    kCBMsgArgOptions: {},
    kCBMsgArgUUIDs: []
  };

  if (serviceUuids) {
    for(var i = 0; i < serviceUuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(serviceUuids[i], 'hex');
    }
  }

  if (allowDuplicates) {
    args.kCBMsgArgOptions.kCBScanOptionAllowDuplicates = 1;
  }

  this.sendCBMsg(29, args);

  this.emit('scanStart');
};

nobleBindings.stopScanning = function() {
  this.sendCBMsg(30, null);

  this.emit('scanStop');
};

nobleBindings.on('kCBMsgId37', function(args) {
  if (Object.keys(args.kCBMsgArgAdvertisementData).length === 0) {
    return;
  }

  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var advertisement = {
    localName: args.kCBMsgArgAdvertisementData.kCBAdvDataLocalName || args.kCBMsgArgName,
    txPowerLevel: args.kCBMsgArgAdvertisementData.kCBAdvDataTxPowerLevel,
    manufacturerData: args.kCBMsgArgAdvertisementData.kCBAdvDataManufacturerData,
    serviceData: [],
    serviceUuids: []
  };
  var rssi = args.kCBMsgArgRssi;
  var i;

  if (args.kCBMsgArgAdvertisementData.kCBAdvDataServiceUUIDs) {
    for(i = 0; i < args.kCBMsgArgAdvertisementData.kCBAdvDataServiceUUIDs.length; i++) {
      advertisement.serviceUuids.push(args.kCBMsgArgAdvertisementData.kCBAdvDataServiceUUIDs[i].toString('hex'));
    }
  }

  var serviceData = args.kCBMsgArgAdvertisementData.kCBAdvDataServiceData;
  if (serviceData) {
    for (i = 0; i < serviceData.length; i += 2) {
      var serviceDataUuid = serviceData[i].toString('hex');
      var data = serviceData[i + 1];

      advertisement.serviceData.push({
        uuid: serviceDataUuid,
        data: data
      });
    }
  }

  debug('peripheral ' + deviceUuid + ' discovered');

  var uuid = new Buffer(deviceUuid, 'hex');
  uuid.isUuid = true;

  if(!this._peripherals[deviceUuid]) {
    this._peripherals[deviceUuid] = {};
  }
  this._peripherals[deviceUuid].uuid = uuid;
  this._peripherals[deviceUuid].advertisement = advertisement;
  this._peripherals[deviceUuid].rssi = rssi;

  (function(deviceUuid, advertisement, rssi) {
    uuidToAddress(deviceUuid, function(error, address, addressType) {
      address = address || 'unknown';
      addressType = addressType || 'unknown';

      this._peripherals[deviceUuid].address = address;
      this._peripherals[deviceUuid].addressType = addressType;

      this.emit('discover', deviceUuid, address, addressType, undefined, advertisement, rssi);
    }.bind(this));
  }.bind(this))(deviceUuid, advertisement, rssi);
});

nobleBindings.connect = function(deviceUuid) {
  this.sendCBMsg(31, {
    kCBMsgArgOptions: {
      kCBConnectOptionNotifyOnDisconnection: 1
    },
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid
  });
};

nobleBindings.on('kCBMsgId38', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');

  debug('peripheral ' + deviceUuid + ' connected');

  this.emit('connect', deviceUuid);
});

nobleBindings.disconnect = function(deviceUuid) {
  this.sendCBMsg(32, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid
  });
};

nobleBindings.on('kCBMsgId40', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');

  debug('peripheral ' + deviceUuid + ' disconnected');

  this.emit('disconnect', deviceUuid);
});

nobleBindings.updateRssi = function(deviceUuid) {
  this.sendCBMsg(43, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid
  });
};

nobleBindings.on('kCBMsgId54', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var rssi = args.kCBMsgArgData;

  this._peripherals[deviceUuid].rssi = rssi;

  debug('peripheral ' + deviceUuid + ' RSSI update ' + rssi);

  this.emit('rssiUpdate', deviceUuid, rssi);
});

nobleBindings.discoverServices = function(deviceUuid, uuids) {
  var args = {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgUUIDs: []
  };

  if (uuids) {
    for(var i = 0; i < uuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(uuids[i], 'hex');
    }
  }

  this.sendCBMsg(44, args);
};

nobleBindings.on('kCBMsgId55', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var services_ = [];

  this._peripherals[deviceUuid].services = {};

  if (args.kCBMsgArgServices) {
    for(var i = 0; i < args.kCBMsgArgServices.length; i++) {
      var service = {
        id: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
        uuid: args.kCBMsgArgServices[i].kCBMsgArgUUID.toString('hex'),
        startHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
        endHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceEndHandle
      };

      this._peripherals[deviceUuid].services[service.startHandle] = service;

      services_.push({
        id: id,
        uuid: service.uuid
      });
    }
  }
  // TODO: result 24 => device not connected

  this.emit('servicesDiscover', deviceUuid, services_);
});

nobleBindings.discoverIncludedServices = function(deviceUuid, serviceId, serviceUuids) {
  var args = {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgServiceStartHandle: this._peripherals[deviceUuid].services[serviceId].startHandle,
    kCBMsgArgServiceEndHandle: this._peripherals[deviceUuid].services[serviceId].endHandle,
    kCBMsgArgUUIDs: []
  };

  if (serviceUuids) {
    for(var i = 0; i < serviceUuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(serviceUuids[i], 'hex');
    }
  }

  this.sendCBMsg(60, args);
};

nobleBindings.on('kCBMsgId62', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var serviceId = args.kCBMsgArgServiceStartHandle;
  var result = args.kCBMsgArgResult;
  var includedServices_ = [];

  this._peripherals[deviceUuid].services[serviceId].includedServices = {};

  for(var i = 0; i < args.kCBMsgArgServices.length; i++) {
    var includedService = {
      id: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
      uuid: args.kCBMsgArgServices[i].kCBMsgArgUUID.toString('hex'),
      startHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
      endHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceEndHandle
    };

    this._peripherals[deviceUuid].services[serviceId].includedServices[includedServices.id] = includedService;

    includedServices_.push({
      id: includedService.id,
      uuid: includedService.uuid
    });
  }

  this.emit('includedServicesDiscover', deviceUuid, serviceId, includedServices_);
});

nobleBindings.discoverCharacteristics = function(deviceUuid, serviceId, characteristicUuids) {
  var args = {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgServiceStartHandle: this._peripherals[deviceUuid].services[serviceId].startHandle,
    kCBMsgArgServiceEndHandle: this._peripherals[deviceUuid].services[serviceId].endHandle,
    kCBMsgArgUUIDs: []
  };

  if (characteristicUuids) {
    for(var i = 0; i < characteristicUuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(characteristicUuids[i], 'hex');
    }
  }

  this.sendCBMsg(61, args);
};

nobleBindings.on('kCBMsgId63', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var serviceId = args.kCBMsgArgServiceStartHandle;
  var result = args.kCBMsgArgResult;
  var characteristics = [];

  this._peripherals[deviceUuid].services[serviceId].characteristics = {};

  for(var i = 0; i < args.kCBMsgArgCharacteristics.length; i++) {
    var properties = args.kCBMsgArgCharacteristics[i].kCBMsgArgCharacteristicProperties;

    var characteristic = {
      id: args.kCBMsgArgCharacteristics[i].kCBMsgArgCharacteristicHandle,
      uuid: args.kCBMsgArgCharacteristics[i].kCBMsgArgUUID.toString('hex'),
      handle: args.kCBMsgArgCharacteristics[i].kCBMsgArgCharacteristicHandle,
      valueHandle: args.kCBMsgArgCharacteristics[i].kCBMsgArgCharacteristicValueHandle,
      properties: []
    };

    if (properties & 0x01) {
      characteristic.properties.push('broadcast');
    }

    if (properties & 0x02) {
      characteristic.properties.push('read');
    }

    if (properties & 0x04) {
      characteristic.properties.push('writeWithoutResponse');
    }

    if (properties & 0x08) {
      characteristic.properties.push('write');
    }

    if (properties & 0x10) {
      characteristic.properties.push('notify');
    }

    if (properties & 0x20) {
      characteristic.properties.push('indicate');
    }

    if (properties & 0x40) {
      characteristic.properties.push('authenticatedSignedWrites');
    }

    if (properties & 0x80) {
      characteristic.properties.push('extendedProperties');
    }

    this._peripherals[deviceUuid].services[serviceStartHandle].characteristics[characteristic.handle] =
      this._peripherals[deviceUuid].services[serviceStartHandle].characteristics[characteristic.valueHandle] = characteristic;

    characteristics.push({
      id: characteristic.id,
      uuid: characteristic.uuid,
      properties: characteristic.properties
    });
  }

  this.emit('characteristicsDiscover', deviceUuid, serviceUuid, characteristics);
});

nobleBindings.read = function(deviceUuid, serviceUuid, characteristicUuid) {
  this.sendCBMsg(64 , {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle
  });
};

nobleBindings.on('kCBMsgId70', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var isNotification = args.kCBMsgArgIsNotification ? true : false;
  var data = args.kCBMsgArgData;

  var peripheral = this._peripherals[deviceUuid];

  if (peripheral) {
    for(var i in peripheral.services) {
      if (peripheral.services[i].characteristics &&
          peripheral.services[i].characteristics[characteristicHandle]) {

        this.emit('read', deviceUuid, peripheral.services[i].uuid,
          peripheral.services[i].characteristics[characteristicHandle].uuid, data, isNotification);
        break;
      }
    }
  } else {
    console.warn('noble (mac mavericks): received read event from unknown peripheral: ' + deviceUuid + ' !');
  }
});

nobleBindings.write = function(deviceUuid, serviceId, characteristicId, data, withoutResponse) {
  this.sendCBMsg(65, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].valueHandle,
    kCBMsgArgData: data,
    kCBMsgArgType: (withoutResponse ? 1 : 0)
  });

  if (withoutResponse) {
    this.emit('write', deviceUuid, serviceId, characteristicId);
  }
};

nobleBindings.on('kCBMsgId71', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;

  for(var i in this._peripherals[deviceUuid].services) {
    if (this._peripherals[deviceUuid].services[i].characteristics &&
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {
      this.emit('write', deviceUuid, this._peripherals[deviceUuid].services[i].id,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].id);
      break;
    }
  }
});

nobleBindings.broadcast = function(deviceUuid, serviceId, characteristicId, broadcast) {
  this.sendCBMsg(66, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].valueHandle,
    kCBMsgArgState: (broadcast ? 1 : 0)
  });
};

nobleBindings.on('kCBMsgId72', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;
  var state = args.kCBMsgArgState ? true : false;

  for(var i in this._peripherals[deviceUuid].services) {
    if (this._peripherals[deviceUuid].services[i].characteristics &&
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {
      this.emit('broadcast', deviceUuid, this._peripherals[deviceUuid].services[i].id,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].id, state);
      break;
    }
  }
});

nobleBindings.notify = function(deviceUuid, serviceId, characteristicId, notify) {
  this.sendCBMsg(67, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].valueHandle,
    kCBMsgArgState: (notify ? 1 : 0)
  });
};

nobleBindings.on('kCBMsgId73', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;
  var state = args.kCBMsgArgState ? true : false;

  for(var i in this._peripherals[deviceUuid].services) {
    if (this._peripherals[deviceUuid].services[i].characteristics &&
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {
      this.emit('notify', deviceUuid, this._peripherals[deviceUuid].services[i].id,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].id, state);
      break;
    }
  }
});

nobleBindings.discoverDescriptors = function(deviceUuid, serviceId, characteristicId) {
  this.sendCBMsg(69, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].valueHandle
  });
};

nobleBindings.on('kCBMsgId75', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;
  var descriptors = []; //args.kCBMsgArgDescriptors;

  for(var i in this._peripherals[deviceUuid].services) {
    if (this._peripherals[deviceUuid].services[i].characteristics &&
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {

      this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].descriptors = {};

      for(var j = 0; j < args.kCBMsgArgDescriptors.length; j++) {
        var descriptor = {
          id: args.kCBMsgArgDescriptors[j].kCBMsgArgDescriptorHandle,
          uuid: args.kCBMsgArgDescriptors[j].kCBMsgArgUUID.toString('hex'),
          handle: args.kCBMsgArgDescriptors[j].kCBMsgArgDescriptorHandle
        };

        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].descriptors[descriptor.handle] = descriptor;

        descriptors.push({
          id: descriptor.id,
          uuid: descriptor.uuid
        });
      }

      this.emit('descriptorsDiscover', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid, descriptors);
      break;
    }
  }
});

nobleBindings.readValue = function(deviceUuid, serviceId, characteristicId, descriptorId) {
  this.sendCBMsg(76, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].descriptors[descriptorId].handle
  });
};

nobleBindings.on('kCBMsgId78', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var descriptorHandle = args.kCBMsgArgDescriptorHandle;
  var result = args.kCBMsgArgResult;
  var data = args.kCBMsgArgData;

  this.emit('handleRead', deviceUuid, descriptorHandle, data);

  for(var i in this._peripherals[deviceUuid].services) {
    for(var j in this._peripherals[deviceUuid].services[i].characteristics) {
      if (this._peripherals[deviceUuid].services[i].characteristics[j].descriptors &&
        this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle]) {

        this.emit('valueRead', deviceUuid, this._peripherals[deviceUuid].services[i].id,
          this._peripherals[deviceUuid].services[i].characteristics[j].id,
          this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle].id, data);
        return; // break;
      }
    }
  }
});

nobleBindings.writeValue = function(deviceUuid, serviceId, characteristicId, descriptorId, data) {
  this.sendCBMsg(77, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].descriptors[descriptorId].handle,
    kCBMsgArgData: data
  });
};

nobleBindings.on('kCBMsgId79', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var descriptorHandle = args.kCBMsgArgDescriptorHandle;
  var result = args.kCBMsgArgResult;

  this.emit('handleWrite', deviceUuid, descriptorHandle);

  for(var i in this._peripherals[deviceUuid].services) {
    for(var j in this._peripherals[deviceUuid].services[i].characteristics) {
      if (this._peripherals[deviceUuid].services[i].characteristics[j].descriptors &&
        this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle]) {

        this.emit('valueWrite', deviceUuid, this._peripherals[deviceUuid].services[i].id,
          this._peripherals[deviceUuid].services[i].characteristics[j].id,
          this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle].id);
        return; // break;
      }
    }
  }
});

nobleBindings.readHandle = function(deviceUuid, handle) {
  this.sendCBMsg(76, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: handle
  });
};

nobleBindings.writeHandle = function(deviceUuid, handle, data, withoutResponse) {
  // TODO: use without response
  this.sendCBMsg(77, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: handle,
    kCBMsgArgData: data
  });
};

module.exports = nobleBindings;
