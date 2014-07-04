var debug         = require('debug')('yosemite-bindings');
var events        = require('events');
var os            = require('os');
var util          = require('util');
var XpcConnection = require('xpc-connection');



/**
 * [NobleBindings description]
 */
var NobleBindings = function() {
  this._xpcConnection = new XpcConnection('com.apple.blued');
  this._xpcConnection.on('error', function(message) {this.emit('xpcError', message);}.bind(this));
  this._xpcConnection.on('event', function(event)   {this.emit('xpcEvent', event);  }.bind(this));
};

util.inherits(NobleBindings, events.EventEmitter);
NobleBindings.prototype.setupXpcConnection = function() {this._xpcConnection.setup();};
NobleBindings.prototype.sendXpcMessage = function(message) {this._xpcConnection.sendMessage(message);};




/**
 * [nobleBindings description]
 * @type {NobleBindings}
 */
var nobleBindings = new NobleBindings();
nobleBindings._peripherals = {};



// Handle xpc messages
nobleBindings.on('xpcEvent', function(event) {
  debug('xpcEvent: ' + JSON.stringify(event, undefined, 2));

  var kCBMsgId   = event.kCBMsgId;
  var kCBMsgArgs = event.kCBMsgArgs;
  this.emit('kCBMsgId' + kCBMsgId, kCBMsgArgs);
});

nobleBindings.on('xpcError', function(message) {
  console.error('xpcError: ' + message);
});

nobleBindings.sendCBMsg = function(id, args) {
  debug('sendCBMsg: ' + id + ', ' + JSON.stringify(args, undefined, 2));
  this.sendXpcMessage({kCBMsgId: id,kCBMsgArgs: args});
};




/**
 * [init description]
 * @return {[type]} [description]
 */
nobleBindings.init = function() {
  this.timer = setTimeout(function(){}, 2147483647); // TODO: add worker in bindings instead

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



/**
 * [startScanning description]
 * @param  {[type]} serviceUuids    [description]
 * @param  {[type]} allowDuplicates [description]
 * @return {[type]}                 [description]
 */
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

  this._peripherals[deviceUuid] = {
    uuid: uuid,
    advertisement: advertisement,
    rssi: rssi
  };

  this.emit('discover', deviceUuid, advertisement, rssi);
});



/**
 * [stopScanning description]
 * @return {[type]} [description]
 */
nobleBindings.stopScanning = function() {
  this.sendCBMsg(30, null);
  this.emit('scanStop');
};



/**
 * [connect description]
 * @param  {[type]} deviceUuid [description]
 * @return {[type]}            [description]
 */
nobleBindings.connect = function(deviceUuid) {
  this.sendCBMsg(31, {
    kCBMsgArgOptions: {
      kCBConnectOptionNotifyOnDisconnection: 1
    },
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid
  });
};

nobleBindings.on('kCBMsgId38', function(args) {
  debug('peripheral ' + deviceUuid + ' connected');

  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  this.emit('connect', deviceUuid);
});



/**
 * [disconnect description]
 * @param  {[type]} deviceUuid [description]
 * @return {[type]}            [description]
 */
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



/**
 * [updateRssi description]
 * @param  {[type]} deviceUuid [description]
 * @return {[type]}            [description]
 */
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



/**
 * [discoverServices description]
 * @param  {[type]} deviceUuid [description]
 * @param  {[type]} uuids      [description]
 * @return {[type]}            [description]
 */
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

  this.sendCBMsg(45, args);
};

nobleBindings.on('kCBMsgId56', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var serviceUuids = [];

  this._peripherals[deviceUuid].services = {};

  if (args.kCBMsgArgServices) {
    for(var i = 0; i < args.kCBMsgArgServices.length; i++) {
      var service = {
        uuid: args.kCBMsgArgServices[i].kCBMsgArgUUID.toString('hex'),
        startHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
        endHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceEndHandle
      };

      this._peripherals[deviceUuid].services[service.uuid] = this._peripherals[deviceUuid].services[service.startHandle] = service;

      serviceUuids.push(service.uuid);
    }
  }
  // TODO: result 24 => device not connected

  this.emit('servicesDiscover', deviceUuid, serviceUuids);
});



/**
 * [discoverIncludedServices description]
 * @param  {[type]} deviceUuid   [description]
 * @param  {[type]} serviceUuid  [description]
 * @param  {[type]} serviceUuids [description]
 * @return {[type]}              [description]
 */
nobleBindings.discoverIncludedServices = function(deviceUuid, serviceUuid, serviceUuids) {
  var args = {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgServiceStartHandle: this._peripherals[deviceUuid].services[serviceUuid].startHandle,
    kCBMsgArgServiceEndHandle: this._peripherals[deviceUuid].services[serviceUuid].endHandle,
    kCBMsgArgUUIDs: []
  };

  if (serviceUuids) {
    for(var i = 0; i < serviceUuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(serviceUuids[i], 'hex');
    }
  }

  this.sendCBMsg(61, args);
};

nobleBindings.on('kCBMsgId63', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var serviceStartHandle = args.kCBMsgArgServiceStartHandle;
  var serviceUuid = this._peripherals[deviceUuid].services[serviceStartHandle].uuid;
  var result = args.kCBMsgArgResult;
  var includedServiceUuids = [];

  this._peripherals[deviceUuid].services[serviceStartHandle].includedServices = {};

  for(var i = 0; i < args.kCBMsgArgServices.length; i++) {
    var includedService = {
      uuid: args.kCBMsgArgServices[i].kCBMsgArgUUID.toString('hex'),
      startHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
      endHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceEndHandle
    };

    this._peripherals[deviceUuid].services[serviceStartHandle].includedServices[includedServices.uuid] =
      this._peripherals[deviceUuid].services[serviceStartHandle].includedServices[includedServices.startHandle] = includedService;

    includedServiceUuids.push(includedService.uuid);
  }

  this.emit('includedServicesDiscover', deviceUuid, serviceUuid, includedServiceUuids);
});



/**
 * [discoverCharacteristics description]
 * @param  {[type]} deviceUuid          [description]
 * @param  {[type]} serviceUuid         [description]
 * @param  {[type]} characteristicUuids [description]
 * @return {[type]}                     [description]
 */
nobleBindings.discoverCharacteristics = function(deviceUuid, serviceUuid, characteristicUuids) {
  var args = {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgServiceStartHandle: this._peripherals[deviceUuid].services[serviceUuid].startHandle,
    kCBMsgArgServiceEndHandle: this._peripherals[deviceUuid].services[serviceUuid].endHandle,
    kCBMsgArgUUIDs: []
  };

  if (characteristicUuids) {
    for(var i = 0; i < characteristicUuids.length; i++) {
      args.kCBMsgArgUUIDs[i] = new Buffer(characteristicUuids[i], 'hex');
    }
  }

  this.sendCBMsg(62, args);
};

nobleBindings.on('kCBMsgId64', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var serviceStartHandle = args.kCBMsgArgServiceStartHandle;
  var serviceUuid = this._peripherals[deviceUuid].services[serviceStartHandle].uuid;
  var result = args.kCBMsgArgResult;
  var characteristics = [];

  this._peripherals[deviceUuid].services[serviceStartHandle].characteristics = {};

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

    this._peripherals[deviceUuid].services[serviceStartHandle].characteristics[characteristic.uuid] =
      this._peripherals[deviceUuid].services[serviceStartHandle].characteristics[characteristic.handle] =
      this._peripherals[deviceUuid].services[serviceStartHandle].characteristics[characteristic.valueHandle] = characteristic;

    characteristics.push({
      uuid: characteristic.uuid,
      properties: characteristic.properties
    });
  }

  this.emit('characteristicsDiscover', deviceUuid, serviceUuid, characteristics);
});



/**
 * [read description]
 * @param  {[type]} deviceUuid         [description]
 * @param  {[type]} serviceUuid        [description]
 * @param  {[type]} characteristicUuid [description]
 * @return {[type]}                    [description]
 */
nobleBindings.read = function(deviceUuid, serviceUuid, characteristicUuid) {
  this.sendCBMsg(65 , {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle
  });
};

nobleBindings.on('kCBMsgId71', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var isNotification = args.kCBMsgArgIsNotification ? true : false;
  var data = args.kCBMsgArgData;

  for(var i in this._peripherals[deviceUuid].services) {
    if (this._peripherals[deviceUuid].services[i].characteristics &&
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {

      this.emit('read', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid, data, isNotification);
      break;
    }
  }
});



/**
 * [write description]
 * @param  {[type]} deviceUuid         [description]
 * @param  {[type]} serviceUuid        [description]
 * @param  {[type]} characteristicUuid [description]
 * @param  {[type]} data               [description]
 * @param  {[type]} withoutResponse    [description]
 * @return {[type]}                    [description]
 */
nobleBindings.write = function(deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  this.sendCBMsg(66, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
    kCBMsgArgData: data,
    kCBMsgArgType: (withoutResponse ? 1 : 0)
  });
};

nobleBindings.on('kCBMsgId72', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;

  for(var i in this._peripherals[deviceUuid].services) {
    if (this._peripherals[deviceUuid].services[i].characteristics &&
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {
      this.emit('write', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid);
      break;
    }
  }
});



/**
 * [broadcast description]
 * @param  {[type]} deviceUuid         [description]
 * @param  {[type]} serviceUuid        [description]
 * @param  {[type]} characteristicUuid [description]
 * @param  {[type]} broadcast          [description]
 * @return {[type]}                    [description]
 */
nobleBindings.broadcast = function(deviceUuid, serviceUuid, characteristicUuid, broadcast) {
  this.sendCBMsg(67, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
    kCBMsgArgState: (broadcast ? 1 : 0)
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
      this.emit('broadcast', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid, state);
      break;
    }
  }
});



/**
 * [notify description]
 * @param  {[type]} deviceUuid         [description]
 * @param  {[type]} serviceUuid        [description]
 * @param  {[type]} characteristicUuid [description]
 * @param  {[type]} notify             [description]
 * @return {[type]}                    [description]
 */
nobleBindings.notify = function(deviceUuid, serviceUuid, characteristicUuid, notify) {
  this.sendCBMsg(68, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
    kCBMsgArgState: (notify ? 1 : 0)
  });
};

nobleBindings.on('kCBMsgId74', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var result = args.kCBMsgArgResult;
  var state = args.kCBMsgArgState ? true : false;

  for(var i in this._peripherals[deviceUuid].services) {
    if (this._peripherals[deviceUuid].services[i].characteristics &&
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {
      this.emit('notify', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid, state);
      break;
    }
  }
});



/**
 * [discoverDescriptors description]
 * @param  {[type]} deviceUuid         [description]
 * @param  {[type]} serviceUuid        [description]
 * @param  {[type]} characteristicUuid [description]
 * @return {[type]}                    [description]
 */
nobleBindings.discoverDescriptors = function(deviceUuid, serviceUuid, characteristicUuid) {
  this.sendCBMsg(70, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle
  });
};

nobleBindings.on('kCBMsgId76', function(args) {
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
          uuid: args.kCBMsgArgDescriptors[j].kCBMsgArgUUID.toString('hex'),
          handle: args.kCBMsgArgDescriptors[j].kCBMsgArgDescriptorHandle
        };

        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].descriptors[descriptor.uuid] =
          this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].descriptors[descriptor.handle] = descriptor;

        descriptors.push(descriptor.uuid);
      }

      this.emit('descriptorsDiscover', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid, descriptors);
      break;
    }
  }
});



/**
 * [readValue description]
 * @param  {[type]} deviceUuid         [description]
 * @param  {[type]} serviceUuid        [description]
 * @param  {[type]} characteristicUuid [description]
 * @param  {[type]} descriptorUuid     [description]
 * @return {[type]}                    [description]
 */
nobleBindings.readValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  this.sendCBMsg(77, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].descriptors[descriptorUuid].handle
  });
};

nobleBindings.on('kCBMsgId79', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var descriptorHandle = args.kCBMsgArgDescriptorHandle;
  var result = args.kCBMsgArgResult;
  var data = args.kCBMsgArgData;

  this.emit('handleRead', deviceUuid, descriptorHandle, data);

  for(var i in this._peripherals[deviceUuid].services) {
    for(var j in this._peripherals[deviceUuid].services[i].characteristics) {
      if (this._peripherals[deviceUuid].services[i].characteristics[j].descriptors &&
        this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle]) {

        this.emit('valueRead', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
          this._peripherals[deviceUuid].services[i].characteristics[j].uuid,
          this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle].uuid, data);
        return; // break;
      }
    }
  }
});



/**
 * [writeValue description]
 * @param  {[type]} deviceUuid         [description]
 * @param  {[type]} serviceUuid        [description]
 * @param  {[type]} characteristicUuid [description]
 * @param  {[type]} descriptorUuid     [description]
 * @param  {[type]} data               [description]
 * @return {[type]}                    [description]
 */
nobleBindings.writeValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  this.sendCBMsg(78, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].descriptors[descriptorUuid].handle,
    kCBMsgArgData: data
  });
};

nobleBindings.on('kCBMsgId80', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var descriptorHandle = args.kCBMsgArgDescriptorHandle;
  var result = args.kCBMsgArgResult;

  this.emit('handleWrite', deviceUuid, descriptorHandle);

  for(var i in this._peripherals[deviceUuid].services) {
    for(var j in this._peripherals[deviceUuid].services[i].characteristics) {
      if (this._peripherals[deviceUuid].services[i].characteristics[j].descriptors &&
        this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle]) {

        this.emit('valueWrite', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
          this._peripherals[deviceUuid].services[i].characteristics[j].uuid,
          this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle].uuid);
        return; // break;
      }
    }
  }
});



/**
 * [readHandle description]
 * @param  {[type]} deviceUuid [description]
 * @param  {[type]} handle     [description]
 * @return {[type]}            [description]
 */
nobleBindings.readHandle = function(deviceUuid, handle) {
  this.sendCBMsg(77, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: handle
  });
};



/**
 * [writeHandle description]
 * @param  {[type]} deviceUuid      [description]
 * @param  {[type]} handle          [description]
 * @param  {[type]} data            [description]
 * @param  {[type]} withoutResponse [description]
 * @return {[type]}                 [description]
 */
nobleBindings.writeHandle = function(deviceUuid, handle, data, withoutResponse) {
  // TODO: use without response
  this.sendCBMsg(78, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: handle,
    kCBMsgArgData: data
  });
};

nobleBindings.setupXpcConnection();
nobleBindings.init();

module.exports = nobleBindings;
