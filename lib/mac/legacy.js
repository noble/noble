var events = require('events');
var os = require('os');
var util = require('util');

var debug = require('debug')('legacy-bindings');

var osRelease = os.release();
var isLessThan10_8_5 = (parseFloat(osRelease) < 12.5);

var uuidToAddress = require('./uuid-to-address');

var XpcConnection = require('xpc-connection');

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

/*
  Result codes ...

  CBErrorUnknown,

  CBATTErrorInvalidHandle         = 0x01,
  CBATTErrorReadNotPermitted        = 0x02,
  CBATTErrorWriteNotPermitted       = 0x03,
  CBATTErrorInvalidPdu          = 0x04,
  CBATTErrorInsufficientAuthentication  = 0x05,
  CBATTErrorRequestNotSupported     = 0x06,
  CBATTErrorInvalidOffset         = 0x07,
  CBATTErrorInsufficientAuthorization   = 0x08,
  CBATTErrorPrepareQueueFull        = 0x09,
  CBATTErrorAttributeNotFound       = 0x0A,
  CBATTErrorAttributeNotLong        = 0x0B,
  CBATTErrorInsufficientEncryptionKeySize = 0x0C,
  CBATTErrorInvalidAttributeValueLength = 0x0D,
  CBATTErrorUnlikelyError         = 0x0E,
  CBATTErrorInsufficientEncryption    = 0x0F,
  CBATTErrorUnsupportedGroupType      = 0x10,
  CBATTErrorInsufficientResources     = 0x11,
*/

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
    kCBMsgArgAlert: 1,
    kCBMsgArgName: 'node-' + (new Date()).getTime()
  });
};

nobleBindings.on('kCBMsgId4', function(args) {
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

  this.sendCBMsg(isLessThan10_8_5 ? 7 : 23, args);

  this.emit('scanStart');
};

nobleBindings.stopScanning = function() {
  this.sendCBMsg(isLessThan10_8_5 ? 8 : 24, null);

  this.emit('scanStop');
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId13' : 'kCBMsgId31', function(args) {
  var peripheralUuid = args.kCBMsgArgPeripheral.kCBMsgArgUUID.toString('hex');
  var peripheralHandle = args.kCBMsgArgPeripheral.kCBMsgArgPeripheralHandle;
  var advertisement = {
    localName: args.kCBMsgArgAdvertisementData.kCBAdvDataLocalName,
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

  debug('peripheral ' + peripheralUuid + ' discovered');

  this._peripherals[peripheralUuid] = this._peripherals[peripheralHandle] = {
    uuid: peripheralUuid,
    address: undefined,
    addressType: undefined,
    handle: peripheralHandle,
    advertisement: advertisement,
    rssi: rssi
  };

  (function(peripheralUuid, peripheralHandle, advertisement, rssi) {
    uuidToAddress(peripheralUuid, function(error, address, addressType) {
      address = address || 'unknown';
      addressType = addressType || 'unknown';

      this._peripherals[peripheralUuid].address = this._peripherals[peripheralHandle].address = address;
      this._peripherals[peripheralUuid].addressType = this._peripherals[peripheralHandle].addressType = addressType;

      this.emit('discover', peripheralUuid, address, addressType, undefined, advertisement, rssi);
    }.bind(this));
  }.bind(this))(peripheralUuid, peripheralHandle, advertisement, rssi);
});

nobleBindings.connect = function(peripheralUuid) {
  this.sendCBMsg(isLessThan10_8_5 ? 9 : 25, {
    kCBMsgArgOptions: {
      kCBConnectOptionNotifyOnDisconnection: 1
    },
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle
  });
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId14' : 'kCBMsgId32', function(args) {
  var peripheralUuid = args.kCBMsgArgUUID.toString('hex');
  // var peripheralHandle = args.kCBMsgArgPeripheralHandle;

  debug('peripheral ' + peripheralUuid + ' connected');

  this.emit('connect', peripheralUuid);
});

nobleBindings.disconnect = function(peripheralUuid) {
  this.sendCBMsg(isLessThan10_8_5 ? 10 : 26, {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle
  });
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId15' : 'kCBMsgId33', function(args) {
  var peripheralUuid = args.kCBMsgArgUUID.toString('hex');
  // var peripheralHandle = args.kCBMsgArgPeripheralHandle;

  debug('peripheral ' + peripheralUuid + ' disconnected');

  this.emit('disconnect', peripheralUuid);
});

nobleBindings.updateRssi = function(peripheralUuid) {
  this.sendCBMsg(isLessThan10_8_5 ? 16 : 35, {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle
  });
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId20' : 'kCBMsgId41', function(args) {
  var peripheralHandle = args.kCBMsgArgPeripheralHandle;
  var peripheralUuid = this._peripherals[peripheralHandle].uuid;
  var rssi = args.kCBMsgArgData;

  this._peripherals[peripheralHandle].rssi = rssi;

  debug('peripheral ' + peripheralUuid + ' RSSI update ' + rssi);

  this.emit('rssiUpdate', peripheralUuid, rssi);
});

nobleBindings.discoverServices = function(peripheralUuid, uuids) {
  var args = {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgUUIDs: []
  };

  if (uuids) {
    for(var i = 0; i < uuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(uuids[i], 'hex');
    }
  }

  this.sendCBMsg(isLessThan10_8_5 ? 17 : 36, args);
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId21' : 'kCBMsgId42', function(args) {
  var peripheralHandle = args.kCBMsgArgPeripheralHandle;
  var peripheralUuid = this._peripherals[peripheralHandle].uuid;
  var serviceUuids = [];

  this._peripherals[peripheralHandle].services = {};

  for(var i = 0; i < args.kCBMsgArgServices.length; i++) {
    var service = {
      uuid: args.kCBMsgArgServices[i].kCBMsgArgUUID.toString('hex'),
      startHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
      endHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceEndHandle
    };

    this._peripherals[peripheralHandle].services[service.uuid] = this._peripherals[peripheralHandle].services[service.startHandle] = service;

    serviceUuids.push(service.uuid);
  }

  this.emit('servicesDiscover', peripheralUuid, serviceUuids);
});

nobleBindings.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  var args = {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgServiceStartHandle: this._peripherals[peripheralUuid].services[serviceUuid].startHandle,
    kCBMsgArgServiceEndHandle: this._peripherals[peripheralUuid].services[serviceUuid].endHandle,
    kCBMsgArgUUIDs: []
  };

  if (serviceUuids) {
    for(var i = 0; i < serviceUuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(serviceUuids[i], 'hex');
    }
  }

  this.sendCBMsg(isLessThan10_8_5 ? 25 : 46, args);
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId27' : 'kCBMsgId48', function(args) {
  var peripheralUuidHandle = args.kCBMsgArgPeripheralHandle;
  var peripheralUuid = this._peripherals[peripheralUuidHandle].uuid;
  var serviceStartHandle = args.kCBMsgArgServiceStartHandle;
  var serviceUuid = this._peripherals[peripheralUuidHandle].services[serviceStartHandle].uuid;
  var result = args.kCBMsgArgResult;
  var includedServiceUuids = [];

  this._peripherals[peripheralUuidHandle].services[serviceStartHandle].includedServices = {};

  for(var i = 0; i < args.kCBMsgArgServices.length; i++) {
    var includedService = {
      uuid: args.kCBMsgArgServices[i].kCBMsgArgUUID.toString('hex'),
      startHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
      endHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceEndHandle
    };

    this._peripherals[peripheralUuidHandle].services[serviceStartHandle].includedServices[includedServices.uuid] =
      this._peripherals[peripheralUuidHandle].services[serviceStartHandle].includedServices[includedServices.startHandle] = includedService;

    includedServiceUuids.push(includedService.uuid);
  }

  this.emit('includedServicesDiscover', peripheralUuid, serviceUuid, includedServiceUuids);
});

nobleBindings.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {
  var args = {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgServiceStartHandle: this._peripherals[peripheralUuid].services[serviceUuid].startHandle,
    kCBMsgArgServiceEndHandle: this._peripherals[peripheralUuid].services[serviceUuid].endHandle,
    kCBMsgArgUUIDs: []
  };

  if (characteristicUuids) {
    for(var i = 0; i < characteristicUuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(characteristicUuids[i], 'hex');
    }
  }

  this.sendCBMsg(isLessThan10_8_5 ? 26 : 47, args);
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId28' : 'kCBMsgId49', function(args) {
  var peripheralHandle = args.kCBMsgArgPeripheralHandle;
  var peripheralUuid = this._peripherals[peripheralHandle].uuid;
  var serviceStartHandle = args.kCBMsgArgServiceStartHandle;
  var serviceUuid = this._peripherals[peripheralHandle].services[serviceStartHandle].uuid;
  var result = args.kCBMsgArgResult;
  var characteristics = [];

  this._peripherals[peripheralHandle].services[serviceStartHandle].characteristics = {};

  for(var i = 0; i < args.kCBMsgArgCharacteristics.length; i++) {
    var properties = args.kCBMsgArgCharacteristics[i].kCBMsgArgCharacteristicProperties;

    var characteristic = {
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

    this._peripherals[peripheralHandle].services[serviceStartHandle].characteristics[characteristic.uuid] =
      this._peripherals[peripheralHandle].services[serviceStartHandle].characteristics[characteristic.handle] =
      this._peripherals[peripheralHandle].services[serviceStartHandle].characteristics[characteristic.valueHandle] = characteristic;

    characteristics.push({
      uuid: characteristic.uuid,
      properties: characteristic.properties
    });
  }

  this.emit('characteristicsDiscover', peripheralUuid, serviceUuid, characteristics);
});

nobleBindings.read = function(peripheralUuid, serviceUuid, characteristicUuid) {
  this.sendCBMsg(isLessThan10_8_5 ? 29 : 50 , {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgCharacteristicHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle
  });
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId35' : 'kCBMsgId56', function(args) {
  var peripheralHandle = args.kCBMsgArgPeripheralHandle;
  var peripheral = this._peripherals[peripheralHandle];

  if (peripheral) {
    var peripheralUuid = peripheral.uuid;
    var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
    var isNotification = args.kCBMsgArgIsNotification ? true : false;
    var data = args.kCBMsgArgData;

    for(var i in peripheral.services) {
      if (peripheral.services[i].characteristics &&
          peripheral.services[i].characteristics[characteristicHandle]) {

        this.emit('read', peripheralUuid, peripheral.services[i].uuid,
          peripheral.services[i].characteristics[characteristicHandle].uuid, data, isNotification);
        break;
      }
    }
  } else {
    console.warn('noble (mac legacy): received read event from unknown peripheral: ' + peripheralHandle + ' !');
  }
});

nobleBindings.write = function(peripheralUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  this.sendCBMsg(isLessThan10_8_5 ? 30 : 51, {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgCharacteristicHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
    kCBMsgArgData: data,
    kCBMsgArgType: (withoutResponse ? 1 : 0)
  });

  if (withoutResponse) {
    this.emit('write', peripheralUuid, serviceUuid, characteristicUuid);
  }
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId36' : 'kCBMsgId57', function(args) {
  var peripheralHandle = args.kCBMsgArgPeripheralHandle;
  var peripheralUuid = this._peripherals[peripheralHandle].uuid;
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;

  for(var i in this._peripherals[peripheralHandle].services) {
    if (this._peripherals[peripheralHandle].services[i].characteristics &&
        this._peripherals[peripheralHandle].services[i].characteristics[characteristicHandle]) {
      this.emit('write', peripheralUuid, this._peripherals[peripheralHandle].services[i].uuid,
        this._peripherals[peripheralHandle].services[i].characteristics[characteristicHandle].uuid);
      break;
    }
  }
});

nobleBindings.broadcast = function(peripheralUuid, serviceUuid, characteristicUuid, broadcast) {
  this.sendCBMsg(isLessThan10_8_5 ? 31 : 52, {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgCharacteristicHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
    kCBMsgArgState: (broadcast ? 1 : 0)
  });
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId37' : 'kCBMsgId58', function(args) {
  var peripheralHandle = args.kCBMsgArgPeripheralHandle;
  var peripheralUuid = this._peripherals[peripheralHandle].uuid;
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;
  var state = args.kCBMsgArgState ? true : false;

  for(var i in this._peripherals[peripheralHandle].services) {
    if (this._peripherals[peripheralHandle].services[i].characteristics &&
        this._peripherals[peripheralHandle].services[i].characteristics[characteristicHandle]) {
      this.emit('broadcast', peripheralUuid, this._peripherals[peripheralHandle].services[i].uuid,
        this._peripherals[peripheralHandle].services[i].characteristics[characteristicHandle].uuid, state);
      break;
    }
  }
});

nobleBindings.notify = function(peripheralUuid, serviceUuid, characteristicUuid, notify) {
  this.sendCBMsg(isLessThan10_8_5 ? 32 : 53, {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgCharacteristicHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
    kCBMsgArgState: (notify ? 1 : 0)
  });
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId38' : 'kCBMsgId59', function(args) {
  var peripheralHandle = args.kCBMsgArgPeripheralHandle;
  var peripheralUuid = this._peripherals[peripheralHandle].uuid;
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;
  var state = args.kCBMsgArgState ? true : false;

  for(var i in this._peripherals[peripheralHandle].services) {
    if (this._peripherals[peripheralHandle].services[i].characteristics &&
        this._peripherals[peripheralHandle].services[i].characteristics[characteristicHandle]) {
      this.emit('notify', peripheralUuid, this._peripherals[peripheralHandle].services[i].uuid,
        this._peripherals[peripheralHandle].services[i].characteristics[characteristicHandle].uuid, state);
      break;
    }
  }
});

nobleBindings.discoverDescriptors = function(peripheralUuid, serviceUuid, characteristicUuid) {
  this.sendCBMsg(isLessThan10_8_5 ? 34 : 55, {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgCharacteristicHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle
  });
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId39' : 'kCBMsgId60', function(args) {
  var peripheralHandle = args.kCBMsgArgPeripheralHandle;
  var peripheralUuid = this._peripherals[peripheralHandle].uuid;
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;
  var descriptors = []; //args.kCBMsgArgDescriptors;

  for(var i in this._peripherals[peripheralHandle].services) {
    if (this._peripherals[peripheralHandle].services[i].characteristics &&
        this._peripherals[peripheralHandle].services[i].characteristics[characteristicHandle]) {

      this._peripherals[peripheralHandle].services[i].characteristics[characteristicHandle].descriptors = {};

      for(var j = 0; j < args.kCBMsgArgDescriptors.length; j++) {
        var descriptor = {
          uuid: args.kCBMsgArgDescriptors[j].kCBMsgArgUUID.toString('hex'),
          handle: args.kCBMsgArgDescriptors[j].kCBMsgArgDescriptorHandle
        };

        this._peripherals[peripheralHandle].services[i].characteristics[characteristicHandle].descriptors[descriptor.uuid] =
          this._peripherals[peripheralHandle].services[i].characteristics[characteristicHandle].descriptors[descriptor.handle] = descriptor;

        descriptors.push(descriptor.uuid);
      }

      this.emit('descriptorsDiscover', peripheralUuid, this._peripherals[peripheralHandle].services[i].uuid,
        this._peripherals[peripheralHandle].services[i].characteristics[characteristicHandle].uuid, descriptors);
      break;
    }
  }
});

nobleBindings.readValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  this.sendCBMsg(isLessThan10_8_5 ? 40 : 61, {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgDescriptorHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].descriptors[descriptorUuid].handle
  });
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId42' : 'kCBMsgId63', function(args) {
  var peripheralHandle = args.kCBMsgArgPeripheralHandle;
  var peripheralUuid = this._peripherals[peripheralHandle].uuid;
  var descriptorHandle = args.kCBMsgArgDescriptorHandle;
  var result = args.kCBMsgArgResult;
  var data = args.kCBMsgArgData;

  this.emit('handleRead', peripheralUuid, descriptorHandle, data);

  for(var i in this._peripherals[peripheralHandle].services) {
    for(var j in this._peripherals[peripheralHandle].services[i].characteristics) {
      if (this._peripherals[peripheralHandle].services[i].characteristics[j].descriptors &&
        this._peripherals[peripheralHandle].services[i].characteristics[j].descriptors[descriptorHandle]) {

        this.emit('valueRead', peripheralUuid, this._peripherals[peripheralHandle].services[i].uuid,
          this._peripherals[peripheralHandle].services[i].characteristics[j].uuid,
          this._peripherals[peripheralHandle].services[i].characteristics[j].descriptors[descriptorHandle].uuid, data);
        return; // break;
      }
    }
  }
});

nobleBindings.writeValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  this.sendCBMsg(isLessThan10_8_5 ? 41 : 62, {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgDescriptorHandle: this._peripherals[peripheralUuid].services[serviceUuid].characteristics[characteristicUuid].descriptors[descriptorUuid].handle,
    kCBMsgArgData: data
  });
};

nobleBindings.on(isLessThan10_8_5 ? 'kCBMsgId43' : 'kCBMsgId64', function(args) {
  var peripheralHandle = args.kCBMsgArgPeripheralHandle;
  var peripheralUuid = this._peripherals[peripheralHandle].uuid;
  var descriptorHandle = args.kCBMsgArgDescriptorHandle;
  var result = args.kCBMsgArgResult;

  this.emit('handleWrite', peripheralUuid, descriptorHandle);

  for(var i in this._peripherals[peripheralHandle].services) {
    for(var j in this._peripherals[peripheralHandle].services[i].characteristics) {
      if (this._peripherals[peripheralHandle].services[i].characteristics[j].descriptors &&
        this._peripherals[peripheralHandle].services[i].characteristics[j].descriptors[descriptorHandle]) {

        this.emit('valueWrite', peripheralUuid, this._peripherals[peripheralHandle].services[i].uuid,
          this._peripherals[peripheralHandle].services[i].characteristics[j].uuid,
          this._peripherals[peripheralHandle].services[i].characteristics[j].descriptors[descriptorHandle].uuid);
        return; // break;
      }
    }
  }
});

nobleBindings.readHandle = function(peripheralUuid, handle) {
  this.sendCBMsg(isLessThan10_8_5 ? 40 : 61, {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgDescriptorHandle: handle
  });
};

nobleBindings.writeHandle = function(peripheralUuid, handle, data, withoutResponse) {
  // TODO: use without response
  this.sendCBMsg(isLessThan10_8_5 ? 41 : 62, {
    kCBMsgArgPeripheralHandle: this._peripherals[peripheralUuid].handle,
    kCBMsgArgDescriptorHandle: handle,
    kCBMsgArgData: data
  });
};

module.exports = nobleBindings;
