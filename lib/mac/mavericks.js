const events = require('events');

const debug = require('debug')('mavericks-bindings');

const XpcConnection = require('xpc-connection');

const localAddress  = require('./local-address');
const uuidToAddress = require('./uuid-to-address');

class NobleBindings extends events.EventEmitter {
  constructor() {
    super();
    this._peripherals = {};

    this._xpcConnection = new XpcConnection('com.apple.blued');

    this._xpcConnection.on('error', (message) => {
      this.emit('xpcError', message);
    });

    this._xpcConnection.on('event', (event) => {
      this.emit('xpcEvent', event);
    });
  }

  init() {
    this._xpcConnection.setup();

    localAddress((address) => {
      if (address) {
        this.emit('addressChange', address);
      }

      this.sendCBMsg(1, {
        kCBMsgArgName: `node-${(new Date()).getTime()}`,
        kCBMsgArgOptions: {
          kCBInitOptionShowPowerAlert: 0
        },
        kCBMsgArgType: 0
      });
    });
  }

  sendCBMsg(id, args) {
    debug(`sendCBMsg: ${id}, ${JSON.stringify(args, undefined, 2)}`);
    this.sendXpcMessage({
      kCBMsgId: id,
      kCBMsgArgs: args
    });
  }

  sendXpcMessage(message) {
    this._xpcConnection.sendMessage(message);
  }

  startScanning(serviceUuids, allowDuplicates) {
    const args = {
      kCBMsgArgOptions: {},
      kCBMsgArgUUIDs: []
    };

    if (serviceUuids) {
      for (const serviceUuid of serviceUuids) {
        args.kCBMsgArgUUIDs.push(Buffer.from(serviceUuid, 'hex'));
      }
    }

    if (allowDuplicates) {
      args.kCBMsgArgOptions.kCBScanOptionAllowDuplicates = 1;
    }

    this.sendCBMsg(29, args);

    this.emit('scanStart');
  }

  stopScanning() {
    this.sendCBMsg(30, null);

    this.emit('scanStop');
  }

  connect(deviceUuid) {
    this.sendCBMsg(31, {
      kCBMsgArgOptions: {
        kCBConnectOptionNotifyOnDisconnection: 1
      },
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid
    });
  }

  disconnect(deviceUuid) {
    this.sendCBMsg(32, {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid
    });
  }

  updateRssi(deviceUuid) {
    this.sendCBMsg(43, {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid
    });
  }

  discoverServices(deviceUuid, uuids) {
    const args = {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgUUIDs: []
    };

    if (uuids) {
      for (const uuid of uuids) {
        args.kCBMsgArgUUIDs.push(Buffer.from(uuid, 'hex'));
      }
    }

    this.sendCBMsg(44, args);
  }

  discoverIncludedServices(deviceUuid, serviceUuid, serviceUuids) {
    const args = {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgServiceStartHandle: this._peripherals[deviceUuid].services[serviceUuid].startHandle,
      kCBMsgArgServiceEndHandle: this._peripherals[deviceUuid].services[serviceUuid].endHandle,
      kCBMsgArgUUIDs: []
    };

    if (serviceUuids) {
      for (const serviceUuid of serviceUuids) {
        args.kCBMsgArgUUIDs.push(Buffer.from(serviceUuid, 'hex'));
      }
    }

    this.sendCBMsg(60, args);
  }

  discoverCharacteristics(deviceUuid, serviceUuid, characteristicUuids) {
    const args = {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgServiceStartHandle: this._peripherals[deviceUuid].services[serviceUuid].startHandle,
      kCBMsgArgServiceEndHandle: this._peripherals[deviceUuid].services[serviceUuid].endHandle,
      kCBMsgArgUUIDs: []
    };

    if (characteristicUuids) {
      for (const characteristicUuid of characteristicUuids) {
        args.kCBMsgArgUUIDs.push(Buffer.from(characteristicUuid, 'hex'));
      }
    }

    this.sendCBMsg(61, args);
  }

  read(deviceUuid, serviceUuid, characteristicUuid) {
    this.sendCBMsg(64 , {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
      kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle
    });
  }

  write(deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
    this.sendCBMsg(65, {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
      kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
      kCBMsgArgData: data,
      kCBMsgArgType: (withoutResponse ? 1 : 0)
    });

    if (withoutResponse) {
      this.emit('write', deviceUuid, serviceUuid, characteristicUuid);
    }
  }

  broadcast(deviceUuid, serviceUuid, characteristicUuid, broadcast) {
    this.sendCBMsg(66, {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
      kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
      kCBMsgArgState: (broadcast ? 1 : 0)
    });
  }

  notify(deviceUuid, serviceUuid, characteristicUuid, notify) {
    this.sendCBMsg(67, {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
      kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle,
      kCBMsgArgState: (notify ? 1 : 0)
    });
  }

  discoverDescriptors(deviceUuid, serviceUuid, characteristicUuid) {
    this.sendCBMsg(69, {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgCharacteristicHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].handle,
      kCBMsgArgCharacteristicValueHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].valueHandle
    });
  }

  readValue(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid) {
    this.sendCBMsg(76, {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgDescriptorHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].descriptors[descriptorUuid].handle
    });
  }

  writeValue(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
    this.sendCBMsg(77, {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgDescriptorHandle: this._peripherals[deviceUuid].services[serviceUuid].characteristics[characteristicUuid].descriptors[descriptorUuid].handle,
      kCBMsgArgData: data
    });
  }

  readHandle(deviceUuid, handle) {
    this.sendCBMsg(76, {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgDescriptorHandle: handle
    });
  }

  writeHandle(deviceUuid, handle, data, withoutResponse) {
    // TODO: use without response
    this.sendCBMsg(77, {
      kCBMsgArgDeviceUUID: this._peripherals[deviceUuid].uuid,
      kCBMsgArgDescriptorHandle: handle,
      kCBMsgArgData: data
    });
  }
}

const nobleBindings = new NobleBindings();

nobleBindings.on('xpcEvent', function(event) {
  const kCBMsgId = event.kCBMsgId;
  const kCBMsgArgs = event.kCBMsgArgs;

  debug(`xpcEvent: ${JSON.stringify(event, undefined, 2)}`);

  this.emit(`kCBMsgId${kCBMsgId}`, kCBMsgArgs);
});

nobleBindings.on('xpcError', (message) => {
  console.error(`xpcError: ${message}`); // eslint-disable-line no-console
});

nobleBindings.on('kCBMsgId6', function(args) {
  const state = ['unknown', 'resetting', 'unsupported', 'unauthorized', 'poweredOff', 'poweredOn'][args.kCBMsgArgState];
  debug(`state change ${state}`);
  this.emit('stateChange', state);
});

nobleBindings.on('kCBMsgId37', function(args) {
  if (Object.keys(args.kCBMsgArgAdvertisementData).length === 0) {
    return;
  }

  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const advertisement = {
    localName: args.kCBMsgArgAdvertisementData.kCBAdvDataLocalName || args.kCBMsgArgName,
    txPowerLevel: args.kCBMsgArgAdvertisementData.kCBAdvDataTxPowerLevel,
    manufacturerData: args.kCBMsgArgAdvertisementData.kCBAdvDataManufacturerData,
    serviceData: [],
    serviceUuids: []
  };
  const rssi = args.kCBMsgArgRssi;

  if (args.kCBMsgArgAdvertisementData.kCBAdvDataServiceUUIDs) {
    for (const kCBAdvDataServiceUUID of args.kCBMsgArgAdvertisementData.kCBAdvDataServiceUUIDs) {
      advertisement.serviceUuids.push(kCBAdvDataServiceUUID.toString('hex'));
    }
  }

  const serviceData = args.kCBMsgArgAdvertisementData.kCBAdvDataServiceData;
  if (serviceData) {
    for (let i = 0; i < serviceData.length; i += 2) {
      const serviceDataUuid = serviceData[i].toString('hex');
      const data = serviceData[i + 1];

      advertisement.serviceData.push({
        uuid: serviceDataUuid,
        data: data
      });
    }
  }

  debug(`peripheral ${deviceUuid} discovered`);

  const uuid = Buffer.from(deviceUuid, 'hex');
  uuid.isUuid = true;

  if(!this._peripherals[deviceUuid]) {
    this._peripherals[deviceUuid] = {};
  }
  this._peripherals[deviceUuid].uuid = uuid;
  this._peripherals[deviceUuid].advertisement = advertisement;
  this._peripherals[deviceUuid].rssi = rssi;

  (function(deviceUuid, advertisement, rssi) {
    uuidToAddress(deviceUuid, (error, address = 'unknown', addressType = 'unknown') => {
      this._peripherals[deviceUuid].address = address;
      this._peripherals[deviceUuid].addressType = addressType;

      this.emit('discover', deviceUuid, address, addressType, undefined, advertisement, rssi);
    });
  }.bind(this))(deviceUuid, advertisement, rssi);
});

nobleBindings.on('kCBMsgId38', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');

  debug(`peripheral ${deviceUuid} connected`);

  this.emit('connect', deviceUuid);
});

nobleBindings.on('kCBMsgId40', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');

  debug(`peripheral ${deviceUuid} disconnected`);

  this.emit('disconnect', deviceUuid);
});

nobleBindings.on('kCBMsgId54', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const rssi = args.kCBMsgArgData;

  this._peripherals[deviceUuid].rssi = rssi;

  debug(`peripheral ${deviceUuid} RSSI update ${rssi}`);

  this.emit('rssiUpdate', deviceUuid, rssi);
});

nobleBindings.on('kCBMsgId55', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const serviceUuids = [];

  this._peripherals[deviceUuid].services = this._peripherals[deviceUuid].services || {};

  if (args.kCBMsgArgServices) {
    for (const kCBMsgArgService of args.kCBMsgArgServices) {
      const service = {
        uuid: kCBMsgArgService.kCBMsgArgUUID.toString('hex'),
        startHandle: kCBMsgArgService.kCBMsgArgServiceStartHandle,
        endHandle: kCBMsgArgService.kCBMsgArgServiceEndHandle
      };

      this._peripherals[deviceUuid].services[service.uuid] = this._peripherals[deviceUuid].services[service.startHandle] = service;

      serviceUuids.push(service.uuid);
    }
  }
  // TODO: result 24 => device not connected

  this.emit('servicesDiscover', deviceUuid, serviceUuids);
});

nobleBindings.on('kCBMsgId62', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const serviceStartHandle = args.kCBMsgArgServiceStartHandle;
  const serviceUuid = this._peripherals[deviceUuid].services[serviceStartHandle].uuid;
  const includedServiceUuids = [];

  this._peripherals[deviceUuid].services[serviceStartHandle].includedServices =
    this._peripherals[deviceUuid].services[serviceStartHandle].includedServices || {};

  for (const kCBMsgArgService of args.kCBMsgArgServices) {
    const includedService = {
      uuid: kCBMsgArgService.kCBMsgArgUUID.toString('hex'),
      startHandle: kCBMsgArgService.kCBMsgArgServiceStartHandle,
      endHandle: kCBMsgArgService.kCBMsgArgServiceEndHandle
    };

    if (! this._peripherals[deviceUuid].services[serviceStartHandle].includedServices[includedService.uuid]) {
      this._peripherals[deviceUuid].services[serviceStartHandle].includedServices[includedService.uuid] =
        this._peripherals[deviceUuid].services[serviceStartHandle].includedServices[includedService.startHandle] = includedService;
    }

    includedServiceUuids.push(includedService.uuid);
  }

  this.emit('includedServicesDiscover', deviceUuid, serviceUuid, includedServiceUuids);
});

nobleBindings.on('kCBMsgId63', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const serviceStartHandle = args.kCBMsgArgServiceStartHandle;
  const serviceUuid = this._peripherals[deviceUuid].services[serviceStartHandle].uuid;
  const characteristics = [];

  this._peripherals[deviceUuid].services[serviceStartHandle].characteristics =
    this._peripherals[deviceUuid].services[serviceStartHandle].characteristics || {};

  for (const kCBMsgArgCharacteristic of args.kCBMsgArgCharacteristics) {
    const properties = kCBMsgArgCharacteristic.kCBMsgArgCharacteristicProperties;

    const characteristic = {
      uuid: kCBMsgArgCharacteristic.kCBMsgArgUUID.toString('hex'),
      handle: kCBMsgArgCharacteristic.kCBMsgArgCharacteristicHandle,
      valueHandle: kCBMsgArgCharacteristic.kCBMsgArgCharacteristicValueHandle,
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

nobleBindings.on('kCBMsgId70', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  const isNotification = !!args.kCBMsgArgIsNotification;
  const data = args.kCBMsgArgData;

  const peripheral = this._peripherals[deviceUuid];

  if (peripheral) {
    for(const i in peripheral.services) {
      if (peripheral.services[i].characteristics &&
          peripheral.services[i].characteristics[characteristicHandle]) {

        this.emit('read', deviceUuid, peripheral.services[i].uuid,
          peripheral.services[i].characteristics[characteristicHandle].uuid, data, isNotification);
        break;
      }
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(`noble (mac mavericks): received read event from unknown peripheral: ${deviceUuid} !`);
  }
});

nobleBindings.on('kCBMsgId71', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const characteristicHandle = args.kCBMsgArgCharacteristicHandle;

  for(const i in this._peripherals[deviceUuid].services) {
    if (this._peripherals[deviceUuid].services[i].characteristics &&
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {
      this.emit('write', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid);
      break;
    }
  }
});

nobleBindings.on('kCBMsgId72', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  const state = !!args.kCBMsgArgState;

  for(const i in this._peripherals[deviceUuid].services) {
    if (this._peripherals[deviceUuid].services[i].characteristics &&
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {
      this.emit('broadcast', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid, state);
      break;
    }
  }
});

nobleBindings.on('kCBMsgId73', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  const state = !!args.kCBMsgArgState;

  for(const i in this._peripherals[deviceUuid].services) {
    if (this._peripherals[deviceUuid].services[i].characteristics &&
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {
      this.emit('notify', deviceUuid, this._peripherals[deviceUuid].services[i].uuid,
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].uuid, state);
      break;
    }
  }
});

nobleBindings.on('kCBMsgId75', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const characteristicHandle = args.kCBMsgArgCharacteristicHandle;
  const descriptors = []; //args.kCBMsgArgDescriptors;

  for(const i in this._peripherals[deviceUuid].services) {
    if (this._peripherals[deviceUuid].services[i].characteristics &&
        this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle]) {

      this._peripherals[deviceUuid].services[i].characteristics[characteristicHandle].descriptors = {};

      for (const kCBMsgArgDescriptor of args.kCBMsgArgDescriptors) {
        const descriptor = {
          uuid: kCBMsgArgDescriptor.kCBMsgArgUUID.toString('hex'),
          handle: kCBMsgArgDescriptor.kCBMsgArgDescriptorHandle
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

nobleBindings.on('kCBMsgId78', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const descriptorHandle = args.kCBMsgArgDescriptorHandle;
  const data = args.kCBMsgArgData;

  this.emit('handleRead', deviceUuid, descriptorHandle, data);

  for(const i in this._peripherals[deviceUuid].services) {
    for(const j in this._peripherals[deviceUuid].services[i].characteristics) {
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

nobleBindings.on('kCBMsgId79', function(args) {
  const deviceUuid = args.kCBMsgArgDeviceUUID.toString('hex');
  const descriptorHandle = args.kCBMsgArgDescriptorHandle;

  this.emit('handleWrite', deviceUuid, descriptorHandle);

  for(const i in this._peripherals[deviceUuid].services) {
    for(const j in this._peripherals[deviceUuid].services[i].characteristics) {
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

module.exports = nobleBindings;
