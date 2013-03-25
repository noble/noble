var debug = require('debug')('nobleBindings');

var events = require('events');
var util = require('util');

var bindings = require('../build/Release/binding.node');
var NobleBindings = bindings.Noble;

inherits(NobleBindings, events.EventEmitter);

// extend prototype
function inherits(target, source) {
  for (var k in source.prototype) {
    target.prototype[k] = source.prototype[k];
  }
}

var nobleBindings = new NobleBindings();

nobleBindings.peripherals = {};

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
  this.sendXpcMessage({
    kCBMsgId: id,
    kCBMsgArgs: args
  });
};

nobleBindings.init = function() {
  this.timer = setTimeout(function(){}, 2147483647); // TODO: add worker in bindings instead

  this.sendCBMsg(1, {
    kCBMsgArgAlert: 1,
    kCBMsgArgName: 'node'
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

  this.sendCBMsg(7, args);

  this.emit('scanStart');
};

nobleBindings.stopScanning = function() {
  this.sendCBMsg(8, null);

  this.emit('scanStop');
};

nobleBindings.on('kCBMsgId13', function(args) {
  var uuid = args.kCBMsgArgPeripheral.kCBMsgArgUUID.toString('hex');
  var handle = args.kCBMsgArgPeripheral.kCBMsgArgPeripheralHandle;
  var advertisement = {
    localName: args.kCBMsgArgAdvertisementData.kCBAdvDataLocalName,
    serviceData: args.kCBMsgArgAdvertisementData.kCBAdvDataServiceData,
    txPowerLevel: args.kCBMsgArgAdvertisementData.kCBAdvDataTxPowerLevel,
    serviceUuids: []
  };
  var rssi = args.kCBMsgArgRssi;

  if (args.kCBMsgArgAdvertisementData.kCBAdvDataServiceUUIDs) {
    for(var i = 0; i < args.kCBMsgArgAdvertisementData.kCBAdvDataServiceUUIDs.length; i++) {
      advertisement.serviceUuids.push(args.kCBMsgArgAdvertisementData.kCBAdvDataServiceUUIDs[i].toString('hex'));
    } 
  } 

  debug('peripheral ' + uuid + ' discovered');

  this.peripherals[uuid] = this.peripherals[handle] = {
    uuid: uuid,
    handle: handle,
    advertisement: advertisement,
    rssi: rssi
  };

  this.emit('peripheralDiscover', uuid, advertisement, rssi);
});

nobleBindings.connectPeripheral = function(uuid) {
  this.sendCBMsg(9, {
    kCBMsgArgOptions: {
      kCBConnectOptionNotifyOnDisconnection: 1
    },
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle
  });
};

nobleBindings.on('kCBMsgId14', function(args) {
  var uuid = args.kCBMsgArgUUID.toString('hex');
  var handle = args.kCBMsgArgPeripheralHandle;

  debug('peripheral ' + uuid + ' connected');

  this.emit('peripheralConnect', uuid);
});

nobleBindings.disconnectPeripheral = function(uuid) {
  this.sendCBMsg(10, {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle
  });
};

nobleBindings.on('kCBMsgId15', function(args) {
  var uuid = args.kCBMsgArgUUID.toString('hex');
  var handle = args.kCBMsgArgPeripheralHandle;

  debug('peripheral ' + uuid + ' disconnected');

  this.emit('peripheralDisconnect', uuid);
});

nobleBindings.updatePeripheralRssi = function(uuid) {
  this.sendCBMsg(16, {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle
  });
};

nobleBindings.on('kCBMsgId20', function(args) {
  var handle = args.kCBMsgArgPeripheralHandle;
  var uuid = this.peripherals[handle].uuid;
  var rssi = args.kCBMsgArgData;

  this.peripherals[handle].rssi = rssi;

  debug('peripheral ' + uuid + ' RSSI update ' + rssi);

  this.emit('peripheralRssiUpdate', uuid, rssi);
});

nobleBindings.discoverPeripheralServices = function(uuid, uuids) {
  var args = {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle,
    kCBMsgArgUUIDs: []
  };

  if (uuids) {
    for(var i = 0; i < uuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(uuids[i], 'hex');
    }
  }

  this.sendCBMsg(17, args);
};

nobleBindings.on('kCBMsgId21', function(args) {
  var handle = args.kCBMsgArgPeripheralHandle;
  var uuid = this.peripherals[handle].uuid;
  var serviceUuids = [];

  this.peripherals[handle].services = {};

  for(var i = 0; i < args.kCBMsgArgServices.length; i++) {
    var service = {
      uuid: args.kCBMsgArgServices[i].kCBMsgArgUUID.toString('hex'),
      startHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
      endHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceEndHandle
    };

    this.peripherals[handle].services[service.uuid] = this.peripherals[handle].services[service.startHandle] = service;

    serviceUuids.push(service.uuid);
  }

  this.emit('peripheralServicesDiscover', uuid, serviceUuids);
});

nobleBindings.discoverPeripheralServiceIncludedServices = function(uuid, serviceUuid, serviceUuids) {
  var args = {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle,
    kCBMsgArgServiceStartHandle: this.peripherals[uuid].services[serviceUuid].startHandle,
    kCBMsgArgServiceEndHandle: this.peripherals[uuid].services[serviceUuid].endHandle,
    kCBMsgArgUUIDs: []
  };

  if (serviceUuids) {
    for(var i = 0; i < serviceUuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(serviceUuids[i], 'hex');
    }
  }

  this.sendCBMsg(25, args);
};

nobleBindings.on('kCBMsgId27', function(args) {
  var handle = args.kCBMsgArgPeripheralHandle;
  var uuid = this.peripherals[handle].uuid;
  var serviceStartHandle = args.kCBMsgArgServiceStartHandle;
  var serviceUuid = this.peripherals[handle].services[serviceStartHandle].uuid;
  var result = args.kCBMsgArgResult;
  var includedServiceUuids = [];

  this.peripherals[handle].services[serviceStartHandle].includedServices = {};

  for(var i = 0; i < args.kCBMsgArgServices.length; i++) {
    var includedService = {
      uuid: args.kCBMsgArgServices[i].kCBMsgArgUUID.toString('hex'),
      startHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
      endHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceEndHandle
    };

    this.peripherals[handle].services[serviceStartHandle].includedServices[includedServices.uuid] = 
      this.peripherals[handle].services[serviceStartHandle].includedServices[includedServices.startHandle] = includedService;

    includedServiceUuids.push(includedService.uuid);
  }
  
  this.emit('peripheralServiceIncludedServicesDiscover', uuid, serviceUuid, includedServiceUuids);
});

nobleBindings.discoverPeripheralServiceCharacteristics = function(uuid, serviceUuid, characteristicUuids) {
  var args = {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle,
    kCBMsgArgServiceStartHandle: this.peripherals[uuid].services[serviceUuid].startHandle,
    kCBMsgArgServiceEndHandle: this.peripherals[uuid].services[serviceUuid].endHandle,
    kCBMsgArgUUIDs: []
  };

  if (characteristicUuids) {
    for(var i = 0; i < characteristicUuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(characteristicUuids[i], 'hex');
    }
  }

  this.sendCBMsg(26, args);
};

nobleBindings.on('kCBMsgId28', function(args) {
  var handle = args.kCBMsgArgPeripheralHandle;
  var uuid = this.peripherals[handle].uuid;
  var serviceStartHandle = args.kCBMsgArgServiceStartHandle;
  var serviceUuid = this.peripherals[handle].services[serviceStartHandle].uuid;
  var result = args.kCBMsgArgResult;
  var characteristics = [];

  this.peripherals[handle].services[serviceStartHandle].characteristics = {};

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

    this.peripherals[handle].services[serviceStartHandle].characteristics[characteristic.uuid] = 
      this.peripherals[handle].services[serviceStartHandle].characteristics[characteristic.handle] = 
      this.peripherals[handle].services[serviceStartHandle].characteristics[characteristic.valueHandle] = characteristic;

    characteristics.push({
      uuid: characteristic.uuid,
      properties: characteristic.properties
    });
  }

  this.emit('peripheralServiceCharacteristicsDiscover', uuid, serviceUuid, characteristics);
});

nobleBindings.readPeripheralServiceCharacteristic = function(uuid, serviceUuid, characteristicUuid) {
  this.sendCBMsg(29, {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle,
    kCBMsgArgCharacteristicHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle
  });
};

nobleBindings.on('kCBMsgId35', function(args) {
  var handle = args.kCBMsgArgPeripheralHandle;
  var uuid = this.peripherals[handle].uuid;
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var isNotification = args.kCBMsgArgIsNotification;
  var data = args.kCBMsgArgData;

  for(var i in this.peripherals[handle].services) {
    if (this.peripherals[handle].services[i].characteristics &&
        this.peripherals[handle].services[i].characteristics[characteristicHandle]) {

      this.emit('peripheralServiceCharacteristicRead', uuid, this.peripherals[handle].services[i].uuid,
        this.peripherals[handle].services[i].characteristics[characteristicHandle].uuid, data, isNotification);
      break;
    }
  }
});

nobleBindings.writePeripheralServiceCharacteristic = function(uuid, serviceUuid, characteristicUuid, data, notify) {
  this.sendCBMsg(30, {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle,
    kCBMsgArgCharacteristicHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
    kCBMsgArgData: data,
    kCBMsgArgType: (notify ? 1 : 0)
  });
};

nobleBindings.on('kCBMsgId36', function(args) {
  var handle = args.kCBMsgArgPeripheralHandle;
  var uuid = this.peripherals[handle].uuid;
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;

  for(var i in this.peripherals[handle].services) {
    if (this.peripherals[handle].services[i].characteristics &&
        this.peripherals[handle].services[i].characteristics[characteristicHandle]) {
      this.emit('peripheralServiceCharacteristicWrite', uuid, this.peripherals[handle].services[i].uuid,
        this.peripherals[handle].services[i].characteristics[characteristicHandle].uuid);
      break;
    }
  }
});

nobleBindings.broadcastPeripheralServiceCharacteristic = function(uuid, serviceUuid, characteristicUuid, broadcast) {
  this.sendCBMsg(31, {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle,
    kCBMsgArgCharacteristicHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
    kCBMsgArgState: (broadcast ? 1 : 0)
  });
};

nobleBindings.on('kCBMsgId37', function(args) {
  var handle = args.kCBMsgArgPeripheralHandle;
  var uuid = this.peripherals[handle].uuid;
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;
  var state = args.kCBMsgArgState;

  for(var i in this.peripherals[handle].services) {
    if (this.peripherals[handle].services[i].characteristics &&
        this.peripherals[handle].services[i].characteristics[characteristicHandle]) {
      this.emit('peripheralServiceCharacteristicBroadcast', uuid, this.peripherals[handle].services[i].uuid,
        this.peripherals[handle].services[i].characteristics[characteristicHandle].uuid, state);
      break;
    }
  }
});

nobleBindings.notifyPeripheralServiceCharacteristic = function(uuid, serviceUuid, characteristicUuid, notify) {
  this.sendCBMsg(32, {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle,
    kCBMsgArgCharacteristicHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
    kCBMsgArgState: (notify ? 1 : 0)
  });
};

nobleBindings.on('kCBMsgId38', function(args) {
  var handle = args.kCBMsgArgPeripheralHandle;
  var uuid = this.peripherals[handle].uuid;
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;
  var state = args.kCBMsgArgState;

  for(var i in this.peripherals[handle].services) {
    if (this.peripherals[handle].services[i].characteristics &&
        this.peripherals[handle].services[i].characteristics[characteristicHandle]) {
      this.emit('peripheralServiceCharacteristicNotify', uuid, this.peripherals[handle].services[i].uuid,
        this.peripherals[handle].services[i].characteristics[characteristicHandle].uuid, state);
      break;
    }
  }
});

nobleBindings.discoverPeripheralServiceCharacteristicDescriptors = function(uuid, serviceUuid, characteristicUuid) {
  this.sendCBMsg(34, {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle,
    kCBMsgArgCharacteristicHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle
  });
};

nobleBindings.on('kCBMsgId39', function(args) {
  var handle = args.kCBMsgArgPeripheralHandle;
  var uuid = this.peripherals[handle].uuid;
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;
  var descriptors = []; //args.kCBMsgArgDescriptors;

  for(var i in this.peripherals[handle].services) {
    if (this.peripherals[handle].services[i].characteristics &&
        this.peripherals[handle].services[i].characteristics[characteristicHandle]) {

      this.peripherals[handle].services[i].characteristics[characteristicHandle].descriptors = {};

      for(var j = 0; j < args.kCBMsgArgDescriptors.length; j++) {
        var descriptor = {
          uuid: args.kCBMsgArgDescriptors[j].kCBMsgArgUUID.toString('hex'),
          handle: args.kCBMsgArgDescriptors[j].kCBMsgArgDescriptorHandle
        };

        this.peripherals[handle].services[i].characteristics[characteristicHandle].descriptors[descriptor.uuid] =
          this.peripherals[handle].services[i].characteristics[characteristicHandle].descriptors[descriptor.handle] = descriptor;

        descriptors.push(descriptor.uuid);
      }

      this.emit('peripheralServiceCharacteristicDescriptorsDiscover', uuid, this.peripherals[handle].services[i].uuid,
        this.peripherals[handle].services[i].characteristics[characteristicHandle].uuid, descriptors);
      break;
    }
  }
});

nobleBindings.readServiceCharacteristicDescriptorValue = function(uuid, serviceUuid, characteristicUuid, descriptorUuid) {
  this.sendCBMsg(40, {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle,
    kCBMsgArgDescriptorHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].descriptors[descriptorUuid].handle
  });
};

nobleBindings.on('kCBMsgId42', function(args) {
  var handle = args.kCBMsgArgPeripheralHandle;
  var uuid = this.peripherals[handle].uuid;
  var descriptorHandle = args.kCBMsgArgDescriptorHandle;
  var result = args.kCBMsgArgResult;
  var data = args.kCBMsgArgData;

  for(var i in this.peripherals[handle].services) {
    for(var j in this.peripherals[handle].services[i].characteristics) {
      if (this.peripherals[handle].services[i].characteristics[j].descriptors &&
        this.peripherals[handle].services[i].characteristics[j].descriptors[descriptorHandle]) {

        this.emit('peripheralServiceCharacteristicDescriptorRead', uuid, this.peripherals[handle].services[i].uuid,
          this.peripherals[handle].services[i].characteristics[j].uuid,
          this.peripherals[handle].services[i].characteristics[j].descriptors[descriptorHandle].uuid, data);
        break;
      }
    }
  }
});

nobleBindings.writeServiceCharacteristicDescriptorValue = function(uuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  this.sendCBMsg(41, {
    kCBMsgArgPeripheralHandle: this.peripherals[uuid].handle,
    kCBMsgArgDescriptorHandle: this.peripherals[uuid].services[serviceUuid].characteristics[characteristicUuid].descriptors[descriptorUuid].handle,
    kCBMsgArgData: data
  });
};

nobleBindings.on('kCBMsgId43', function(args) {
  var handle = args.kCBMsgArgPeripheralHandle;
  var uuid = this.peripherals[handle].uuid;
  var descriptorHandle = args.kCBMsgArgDescriptorHandle;
  var result = args.kCBMsgArgResult;

  for(var i in this.peripherals[handle].services) {
    for(var j in this.peripherals[handle].services[i].characteristics) {
      if (this.peripherals[handle].services[i].characteristics[j].descriptors &&
        this.peripherals[handle].services[i].characteristics[j].descriptors[descriptorHandle]) {

        this.emit('peripheralServiceCharacteristicDescriptorWrite', uuid, this.peripherals[handle].services[i].uuid,
          this.peripherals[handle].services[i].characteristics[j].uuid,
          this.peripherals[handle].services[i].characteristics[j].descriptors[descriptorHandle].uuid);
        break;
      }
    }
  }
});

nobleBindings.setupXpcConnection();
nobleBindings.init();

module.exports = nobleBindings;
