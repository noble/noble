var util = require('util');

var debug = require('debug')('bindings');

var CoreBluetooth = require('core-bluetooth');
var Implementation = require('../../test/abstract/noble-bindings');

var NobleBindings = function() {

  Implementation.call(this);

  this._peripherals = {};
};
util.inherits(NobleBindings, Implementation);

NobleBindings.prototype._startScanning = function(serviceUuids, allowDuplicates) {
  this._centralManager.scanForPeripherals(serviceUuids, allowDuplicates);

  this.emit('scanStart');
};

NobleBindings.prototype._stopScanning = function() {
  this._centralManager.stopScan();

  this.emit('scanStop');
};

NobleBindings.prototype._connect = function(identifier) {
  var peripheral = this._peripheralForIdentifier(identifier);

  peripheral.connect();
};

NobleBindings.prototype._disconnect = function(identifier) {
  var peripheral = this._peripheralForIdentifier(identifier);

  peripheral.cancelConnection();
};

NobleBindings.prototype._updateRssi = function(identifier) {
  var peripheral = this._peripheralForIdentifier(identifier);

  peripheral.once('rssiUpdate', function(rssi, error) {
    this.emit('rssiUpdate', identifier, rssi);
  }.bind(this));

  peripheral.readRSSI();
};

NobleBindings.prototype._discoverServices = function(identifier, uuids) {
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

NobleBindings.prototype._discoverIncludedServices = function(identifier, serviceIdentifier, serviceUuids) {
  var service = this._serviceForIdentifier(identifier, serviceIdentifier);

  service.once('includedServicesDiscover', function(includedServices, error) {
    var includedServiceUuids = [];

    this._peripherals[identifier]._services[serviceIdentifier]._includedServices = {};

    for (var i = 0; i < includedServices.length; i++) {
      var includedService = includedServices[i];

      var includedServiceUuid = convertUuid(includedService.uuid);
      var includedServicesIdentifier = includedServiceUuid;

      includedServiceUuids.push(includedServiceUuid);

      this._peripherals[identifier]._services[serviceIdentifier]._includedServices[includedServicesIdentifier] = includedService;
    }

    this.emit('includedServicesDiscover', identifier, serviceIdentifier, includedServiceUuids);
  }.bind(this));

  service.discoverIncludedServices(serviceUuids);
};

NobleBindings.prototype._discoverCharacteristics = function(identifier, serviceIdentifier, characteristicUuids) {
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

      // add listener for value updates (read responses, notification, and indications)
      characteristic._valueUpdateListener = this._onPeripheralCharacteristicValueUpdate.bind(this, identifier, serviceIdentifier, characteristicIdentifier);
      characteristic.on('valueUpdate', characteristic._valueUpdateListener);
    }

    this.emit('characteristicsDiscover', identifier, serviceIdentifier, characteristics_);
  }.bind(this));

  service.discoverCharacteristics(characteristicUuids);
};

NobleBindings.prototype._discoverDescriptors = function(identifier, serviceIdentifier, characteristicIdentifier) {
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

NobleBindings.prototype._read = function(identifier, serviceIdentifier, characteristicIdentifier) {
  var characteristic = this._characteristicForIdentifier(identifier, serviceIdentifier, characteristicIdentifier);

  characteristic.readValue();

  // no 'valueUpdate' listener needed here, _onPeripheralCharacteristicValueUpdate will handle it
};

NobleBindings.prototype._write = function(identifier, serviceIdentifier, characteristicIdentifier, data, withoutResponse) {
  var characteristic = this._characteristicForIdentifier(identifier, serviceIdentifier, characteristicIdentifier);

  if (withoutResponse) {
    this.emit('write', identifier, serviceIdentifier, characteristicIdentifier);
  } else {
    characteristic.once('valueWrite', function(error) {
      this.emit('write', identifier, serviceIdentifier, characteristicIdentifier);
    }.bind(this));
  }

  characteristic.writeValue(data, withoutResponse);
};

NobleBindings.prototype._readValue = function(identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier) {
  var descriptor = this._descriptorForIdentifier(identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier);

  descriptor.once('valueUpdate', function(value, error) {
    this.emit('valueRead', identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier, value);
  }.bind(this));

  descriptor.readValue();
};

NobleBindings.prototype._writeValue = function(identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier, data) {
  var descriptor = this._descriptorForIdentifier(identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier);
  descriptor.once('valueWrite', function(error) {
    this.emit('valueWrite', identifier, serviceIdentifier, characteristicIdentifier, descriptorIdentifier);
  }.bind(this));

  descriptor.writeValue(data);
};

NobleBindings.prototype._notify = function(identifier, serviceIdentifier, characteristicIdentifier, notify) {
  var characteristic = this._characteristicForIdentifier(identifier, serviceIdentifier, characteristicIdentifier);

  characteristic.once('notificationStateUpdate', function(state, error) {
    this.emit('notify', identifier, serviceIdentifier, characteristicIdentifier, state);
  }.bind(this));

  characteristic.setNotifyValue(notify);
};

NobleBindings.prototype._init = function(centralManager) {
  if(centralManager) {
    this._centralManager = centralManager;
  }else {
    this._centralManager = new CoreBluetooth.CentralManager();
  }

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
    serviceData: advertisementData.serviceData ? advertisementData.serviceData : [],
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

  // remove the value update listeners added to characteristics
  peripheral.services.forEach(function(service) {
    service.characteristics.forEach(function(characteristic) {
      characteristic.removeListener('valueUpdate', characteristic._valueUpdateListener);
    });
  });

  this.emit('disconnect', identifier);
};

NobleBindings.prototype._onPeripheralCharacteristicValueUpdate = function(identifier, serviceIdentifier, characteristicIdentifier, value) {
  this.emit('read', identifier, serviceIdentifier, characteristicIdentifier, value);
};

function convertUuid(uuid) {
  return uuid.replace(/-/g, '').toLowerCase();
}

function convertUuids(uuids) {
  var convertedUuids = [];

  if (uuids) {
    uuids.forEach(function(uuid) {
      convertedUuids.push(convertUuid(uuid));
    });
  }

  return convertedUuids;
}

module.exports = new NobleBindings();
