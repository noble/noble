var events        = require('events');
var os            = require('os');
var util          = require('util');

var debug         = require('debug')('yosemite-bindings');

var XpcConnection = require('xpc-connection');

var localAddress  = require('./local-address');
var uuidToAddress = require('./uuid-to-address');

/**
 *  NobleBindings for mac
 */
var NobleBindings = function() {
  this._peripherals = {};

  this._xpcConnection = new XpcConnection('com.apple.blued');
  this._xpcConnection.on('error', function(message) {this.emit('xpcError', message);}.bind(this));
  this._xpcConnection.on('event', function(event)   {this.emit('xpcEvent', event);  }.bind(this));
};

util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype.sendXpcMessage = function(message) {
  this._xpcConnection.sendMessage(message);
};

var nobleBindings = new NobleBindings();

// General xpc message handling
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
 * Init xpc connection to blued
 *
 * @discussion tested
 */
nobleBindings.init = function() {
  this._xpcConnection.setup();

  localAddress(function(address) {
    if (address) {
      this.emit('addressChange', address);
    }

    this.sendCBMsg(1, {
      kCBMsgArgName: 'node-' + (new Date()).getTime(),
      kCBMsgArgOptions: {
          kCBInitOptionShowPowerAlert: 0
      },
      kCBMsgArgType: 0
    });
  }.bind(this));
};

nobleBindings.on('kCBMsgId6', function(args) {
  var state = ['unknown', 'resetting', 'unsupported', 'unauthorized', 'poweredOff', 'poweredOn'][args.kCBMsgArgState];
  debug('state change ' + state);
  this.emit('stateChange', state);
});



/**
 * Start scanning
 * @param  {Array} serviceUuids     Scan for these UUIDs, if undefined then scan for all
 * @param  {Bool}  allowDuplicates  Scan can return duplicates
 *
 * @discussion tested
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

/**
 * Response message to start scanning
 *
 * @example
 * // For `TI Sensortag` the message lookes like this:
 * handleMsg: 37, {
 *     kCBMsgArgAdvertisementData =     {
 *         kCBAdvDataIsConnectable = 1;
 *         kCBAdvDataLocalName = SensorTag;
 *         kCBAdvDataTxPowerLevel = 0;
 *     };
 *     kCBMsgArgDeviceUUID = "<__NSConcreteUUID 0x6180000208e0> 53486C7A-DED2-4AA6-8913-387CD22F25D8";
 *     kCBMsgArgName = SensorTag;
 *     kCBMsgArgRssi = "-68";
 * }
 *
 * @discussion tested
 */
nobleBindings.on('kCBMsgId37', function(args) {
  if (Object.keys(args.kCBMsgArgAdvertisementData).length === 0 ||
        (args.kCBMsgArgAdvertisementData.kCBAdvDataIsConnectable !== undefined &&
          Object.keys(args.kCBMsgArgAdvertisementData).length === 1)) {
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
  var connectable = args.kCBMsgArgAdvertisementData.kCBAdvDataIsConnectable ? true : false;
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

  if (!this._peripherals[deviceUuid]) {
    this._peripherals[deviceUuid] = {};
  }

  this._peripherals[deviceUuid].uuid = uuid;
  this._peripherals[deviceUuid].connectable = connectable;
  this._peripherals[deviceUuid].advertisement = advertisement;
  this._peripherals[deviceUuid].rssi = rssi;

  (function(deviceUuid, advertisement, rssi) {
    uuidToAddress(deviceUuid, function(error, address, addressType) {
      address = address || 'unknown';
      addressType = addressType || 'unknown';

      this._peripherals[deviceUuid].address = address;
      this._peripherals[deviceUuid].addressType = addressType;

      this.emit('discover', deviceUuid, address, addressType, connectable, advertisement, rssi);
    }.bind(this));
  }.bind(this))(deviceUuid, advertisement, rssi);
});


/**
 * Stop scanning
 *
 * @discussion tested
 */
nobleBindings.stopScanning = function() {
  this.sendCBMsg(30, null);
  this.emit('scanStop');
};



/**
 * Connect to peripheral
 * @param  {String} deviceUuid    Peripheral uuid to connect to
 *
 * @discussion tested
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
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');

  debug('peripheral ' + deviceUuid + ' connected');

  this.emit('connect', deviceUuid);
});



/**
 * Disconnect
 *
 * @param  {String} deviceUuid    Peripheral uuid to disconnect
 *
 * @discussion tested
 */
nobleBindings.disconnect = function(deviceUuid) {
  this.sendCBMsg(32, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid
  });
};

/**
 * Response to disconnect
 *
 * @discussion tested
 */
nobleBindings.on('kCBMsgId40', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');

  debug('peripheral ' + deviceUuid + ' disconnected');

  this.emit('disconnect', deviceUuid);
});



/**
 * Update RSSI
 *
 * @discussion tested
 */
nobleBindings.updateRssi = function(deviceUuid) {
  this.sendCBMsg(44, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid
  });
};

/**
 * Response to RSSI update
 *
 * @discussion tested
 */
nobleBindings.on('kCBMsgId55', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var rssi = args.kCBMsgArgData;

  this._peripherals[deviceUuid].rssi = rssi;

  debug('peripheral ' + deviceUuid + ' RSSI update ' + rssi);

  this.emit('rssiUpdate', deviceUuid, rssi);
});



/**
 * Discover services
 *
 * @param  {String} deviceUuid  Device UUID
 * @param  {Array} uuids        Services to discover, if undefined then all
 *
 * @discussion tested
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

/**
 * Response to discover service
 *
 * @discussion tested
 */
nobleBindings.on('kCBMsgId56', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var serviceIds = [];

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

      serviceIds.push({ uuid: service.uuid, id: service.id });
    }
  }
  // TODO: result 24 => device not connected

  this.emit('servicesDiscover', deviceUuid, serviceIds);
});



/**
 * [discoverIncludedServices description]
 *
 * @param  {String} deviceUuid
 * @param  {String} serviceUuid
 * @param  {String} serviceUuids
 *
 * @dicussion tested
 */
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

  this.sendCBMsg(61, args);
};

/**
 * Response to dicover included services
 *
 * @dicussion tested
 */
nobleBindings.on('kCBMsgId63', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var serviceStartHandle = args.kCBMsgArgServiceStartHandle;
  var result = args.kCBMsgArgResult;
  var includedServiceIds = [];

  this._peripherals[deviceUuid].services[serviceStartHandle].includedServices = {};

  for(var i = 0; i < args.kCBMsgArgServices.length; i++) {
    var includedService = {
      id: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
      uuid: args.kCBMsgArgServices[i].kCBMsgArgUUID.toString('hex'),
      startHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceStartHandle,
      endHandle: args.kCBMsgArgServices[i].kCBMsgArgServiceEndHandle
    };

    this._peripherals[deviceUuid].services[serviceStartHandle].includedServices[includedServices.startHandle] = includedService;

    includedServiceIds.push({ uuid: includedService.uuid, id: includedService.id });
  }

  this.emit('includedServicesDiscover', deviceUuid, serviceStartHandle, includedServiceIds);
});



/**
 * Discover characteristic
 *
 * @param  {String} deviceUuid          Peripheral UUID
 * @param  {String} serviceUuid         Service UUID
 * @param  {Array} characteristicUuids  Characteristics to discover, all if empty
 *
 * @discussion tested
 */
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

  this.sendCBMsg(62, args);
};

/**
 * Response to characteristic discovery
 *
 * @discussion tested
 */
nobleBindings.on('kCBMsgId64', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var serviceStartHandle = args.kCBMsgArgServiceStartHandle;
  var result = args.kCBMsgArgResult;
  var characteristics = [];

  this._peripherals[deviceUuid].services[serviceStartHandle].characteristics = {};

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

  this.emit('characteristicsDiscover', deviceUuid, serviceStartHandle, characteristics);
});



/**
 * Read value
 *
 * @param  {[type]} deviceUuid         [description]
 * @param  {[type]} serviceUuid        [description]
 * @param  {[type]} characteristicUuid [description]
 *
 * @discussion tested
 */
nobleBindings.read = function(deviceUuid, serviceId, characteristicId) {
  this.sendCBMsg(65 , {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].valueHandle
  });
};

/**
 * Response to read value
 *
 * @discussion tested
 */
nobleBindings.on('kCBMsgId71', function(args) {
  var deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  var characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  var isNotification = args.kCBMsgArgIsNotification ? true : false;
  var data = args.kCBMsgArgData;

  var peripheral = this._peripherals[deviceUuid];

  if (peripheral) {
    for(var i in peripheral.services) {
      if (peripheral.services[i].characteristics &&
          peripheral.services[i].characteristics[characteristicHandle]) {

        this.emit('read', deviceUuid, peripheral.services[i].id,
          peripheral.services[i].characteristics[characteristicHandle].id, data, isNotification);
        break;
      }
    }
  } else {
    console.warn('noble (mac yosemite): received read event from unknown peripheral: ' + deviceUuid + ' !');
  }
});



/**
 * Write value
 * @param  {String} deviceUuid
 * @param  {String} serviceUuid
 * @param  {String} characteristicUuid
 * @param  {[Type]} data
 * @param  {Bool} withoutResponse
 *
 * @discussion tested
 */
nobleBindings.write = function(deviceUuid, serviceId, characteristicId, data, withoutResponse) {
  this.sendCBMsg(66, {
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

/**
 * Response to write
 *
 * @discussion tested
 */
nobleBindings.on('kCBMsgId72', function(args) {
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



/**
 * Broadcast
 *
 * @param  {[type]} deviceUuid         [description]
 * @param  {[type]} serviceUuid        [description]
 * @param  {[type]} characteristicUuid [description]
 * @param  {[type]} broadcast          [description]
 * @return {[type]}                    [description]
 *
 * @discussion The ids were incemented but there seems to be no CoreBluetooth function to call/verify this.
 */
nobleBindings.broadcast = function(deviceUuid, serviceId, characteristicId, broadcast) {
  this.sendCBMsg(67, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].valueHandle,
    kCBMsgArgState: (broadcast ? 1 : 0)
  });
};

/**
 * Response to broadcast
 *
 * @discussion The ids were incemented but there seems to be no CoreBluetooth function to call/verify this.
 */
nobleBindings.on('kCBMsgId73', function(args) {
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



/**
 * Register notification hanlder
 *
 * @param  {String} deviceUuid            Peripheral UUID
 * @param  {String} serviceUuid           Service UUID
 * @param  {String} characteristicUuid    Charactereistic UUID
 * @param  {Bool}   notify                If want to get notification
 *
 * @discussion tested
 */
nobleBindings.notify = function(deviceUuid, serviceId, characteristicId, notify) {
  this.sendCBMsg(68, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].valueHandle,
    kCBMsgArgState: (notify ? 1 : 0)
  });
};

/**
 * Response notification
 *
 * @discussion tested
 */
nobleBindings.on('kCBMsgId74', function(args) {
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



/**
 * Discover service descriptors
 *
 * @param  {String} deviceUuid
 * @param  {String} serviceUuid
 * @param  {String} characteristicUuid
 *
 * @discussion tested
 */
nobleBindings.discoverDescriptors = function(deviceUuid, serviceId, characteristicId) {
  this.sendCBMsg(70, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].handle,
    kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].valueHandle
  });
};

/**
 * Response to descriptor discovery
 *
 * @discussion tested
 */
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
          id: args.kCBMsgArgDescriptors[j].kCBMsgArgDescriptorHandle,
          uuid: args.kCBMsgArgDescriptors[j].kCBMsgArgUUID.toString('hex'),
          handle: args.kCBMsgArgDescriptors[j].kCBMsgArgDescriptorHandle
        };

        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].descriptors[descriptor.handle] = descriptor;

        descriptors.push({ uuid: descriptor.uuid, id: descriptor.id });
      }

      this.emit('descriptorsDiscover', deviceUuid, this._peripherals[deviceUuid].services[i].id,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].id, descriptors);
      break;
    }
  }
});



/**
 * Read value
 *
 * @param  {[type]} deviceUuid         [description]
 * @param  {[type]} serviceUuid        [description]
 * @param  {[type]} characteristicUuid [description]
 * @param  {[type]} descriptorUuid     [description]
 *
 * @discussion tested
 */
nobleBindings.readValue = function(deviceUuid, serviceId, characteristicId, descriptorId) {
  this.sendCBMsg(77, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].descriptors[descriptorId].handle
  });
};

/**
 * Response to read value
 *
 * @discussion tested
 */
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

        this.emit('valueRead', deviceUuid, this._peripherals[deviceUuid].services[i].id,
          this._peripherals[deviceUuid].services[i].characteristics[j].id,
          this._peripherals[deviceUuid].services[i].characteristics[j].descriptors[descriptorHandle].id, data);
        return; // break;
      }
    }
  }
});



/**
 * Write value
 *
 * @param  {[type]} deviceUuid         [description]
 * @param  {[type]} serviceUuid        [description]
 * @param  {[type]} characteristicUuid [description]
 * @param  {[type]} descriptorUuid     [description]
 * @param  {[type]} data               [description]
 *
 * @discussion tested
 */
nobleBindings.writeValue = function(deviceUuid, serviceId, characteristicId, descriptorId, data) {
  this.sendCBMsg(78, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: this._peripherals[deviceUuid].services[serviceId].characteristics[characteristicId].descriptors[descriptorId].handle,
    kCBMsgArgData: data
  });
};

/**
 * Response to write value
 *
 * @discussion tested
 */
nobleBindings.on('kCBMsgId80', function(args) {
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



/**
 * Reade value directly from handle
 *
 * @param  {[type]} deviceUuid [description]
 * @param  {[type]} handle     [description]
 *
 * @discussion tested
 */
nobleBindings.readHandle = function(deviceUuid, handle) {
  this.sendCBMsg(77, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: handle
  });
};



/**
 * Write value directly to handle
 *
 * @param  {[type]} deviceUuid      [description]
 * @param  {[type]} handle          [description]
 * @param  {[type]} data            [description]
 * @param  {[type]} withoutResponse [description]
 *
 * @discussion tested
 */
nobleBindings.writeHandle = function(deviceUuid, handle, data, withoutResponse) {
  // TODO: use without response
  this.sendCBMsg(78, {
    kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
    kCBMsgArgDescriptorHandle: handle,
    kCBMsgArgData: data
  });
};


// Exports
module.exports = nobleBindings;
