var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');

var dbus = require('dbus');

var NobleBindings = function() {
  this._devicesDiscovered = {};
  this._devices = {};
  this._services = {};
  this._characteristics = {};
};

util.inherits(NobleBindings, events.EventEmitter);

var nobleBindings = new NobleBindings();

nobleBindings.init = function() {
  dbus.start(function() {
    this._systemBus = dbus.system_bus();
    this._managerInterface = dbus.get_interface(this._systemBus, 'org.bluez', '/', 'org.bluez.Manager');
    
    var defaultAdapter = this._managerInterface.DefaultAdapter();

    this._defaultAdapterInterface = dbus.get_interface(this._systemBus, 'org.bluez', defaultAdapter, 'org.bluez.Adapter');

    this._defaultAdapterInterface.PropertyChanged.onemit = function(name, value) {
      console.log('PropertyChange: ' + name + ' = ' + value);
    }.bind(this);
    this._defaultAdapterInterface.PropertyChanged.enabled = true;

    this._defaultAdapterInterface.DeviceFound.onemit = function(address, values) {
      if (!this._devicesDiscovered[address]) {
        this._devicesDiscovered[address] = true;

        var advertisement = {
          localName: values.Name,
          serviceUuids: []
        };
        var rssi = ((values.RSSI ^ 0xFFFF) + 1) * -1;

        var uuids = values.UUIDs || [];
        for (var i in uuids) {
          var uuid = uuids[i].split('-').join('');

          if (uuid.match(/^0000.{4}00001000800000805f9b/)) {
            uuid = uuid.substring(4, 8);
          }
          advertisement.serviceUuids.push(uuid);
        }

        var device = this._defaultAdapterInterface.FindDevice(address);
        if (device) {
          this._defaultAdapterInterface.RemoveDevice(device);
        }
        this.emit('discover', address, advertisement, rssi);
      }
    }.bind(this);
    this._defaultAdapterInterface.DeviceFound.enabled = true;

    var properties = this._defaultAdapterInterface.GetProperties();

    for (var i in properties.Devices) {
      this._defaultAdapterInterface.RemoveDevice(properties.Devices[i]);
    }

    this.emit('stateChange', properties.Powered ? 'poweredOn' : 'poweredOff');

  }.bind(this));
};

nobleBindings.startScanning = function(serviceUuids, allowDuplicates) {
  this._defaultAdapterInterface.StartDiscovery();

  this.emit('scanStart');
};

nobleBindings.stopScanning = function() {
  this._defaultAdapterInterface.StopDiscovery();

  this.emit('scanStop');
};

nobleBindings.connect = function(peripheralUuid) {
  var address = peripheralUuid;

  var device = this._defaultAdapterInterface.CreateDevice(address);
  this._devices[address] = dbus.get_interface(this._systemBus, 'org.bluez', device, 'org.bluez.Device');

  this.emit('connect', address);
};

nobleBindings.disconnect = function(peripheralUuid) {
  var address = peripheralUuid;

  this._devices[address].Disconnect();

  this.emit('disconnect', address);
};

nobleBindings.updateRssi = function(peripheralUuid) {
  var address = peripheralUuid;

  // TODO: not implemented, might be able to call gatttool ...
  var rssi = 127;
  this.emit('rssiUpdate', address, rssi);
};

nobleBindings.discoverServices = function(peripheralUuid, uuids) {
  var address = peripheralUuid;

  var properties = this._devices[address].GetProperties();

  this._services[address] = {};
  this._characteristics[address] = {};
  var discoveredUuids = [];

  var serviceUuids = properties.UUIDs;
  var serviceObjectPaths = properties.Services;

  for (var i in serviceUuids) {
    var serviceUuid = serviceUuids[i].split('-').join('');

    if (serviceUuid.match(/^0000.{4}00001000800000805f9b/)) {
      serviceUuid = serviceUuid.substring(4, 8);
    }

    discoveredUuids.push(serviceUuid);
    this._services[address][serviceUuid] = dbus.get_interface(this._systemBus, 'org.bluez', serviceObjectPaths[i], 'org.bluez.Characteristic');
    this._characteristics[address][serviceUuid] = {};
  }

  this.emit('servicesDiscover', peripheralUuid, discoveredUuids);
};

nobleBindings.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  var address = peripheralUuid;

  // TODO: not implemented, might be able to call gatttool ...
  var includedServiceUuids = [];
  this.emit('includedServicesDiscover', peripheralUuid, serviceUuid, includedServiceUuids);
};


nobleBindings.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {
  var address = peripheralUuid;

  var characteristics = this._services[address][serviceUuid].DiscoverCharacteristics();
  var discoveredCharacteristics = [];

  for (var i in characteristics) {
    var characteristic = dbus.get_interface(this._systemBus, 'org.bluez', characteristics[i], 'org.bluez.Characteristic');
    var properties = characteristic.GetProperties();

    var uuid = properties.UUID.split('-').join('');
    if (uuid.match(/^0000.{4}00001000800000805f9b/)) { //0000.{4}00001000800000805f9b34fb$
      uuid = uuid.substring(4, 8);
    }

    this._characteristics[address][serviceUuid][uuid] = characteristic;

    discoveredCharacteristics.push({
      uuid: uuid,
      properties: [] // TODO: not implemented ... could use gatttool
    });
  }

  this.emit('characteristicsDiscover', peripheralUuid, serviceUuid, discoveredCharacteristics);
};

nobleBindings.read = function(peripheralUuid, serviceUuid, characteristicUuid) {

};

nobleBindings.write = function(peripheralUuid, serviceUuid, characteristicUuid, data, notify) {

};

nobleBindings.broadcast = function(peripheralUuid, serviceUuid, characteristicUuid, broadcast) {

};

nobleBindings.notify = function(peripheralUuid, serviceUuid, characteristicUuid, notify) {

};

nobleBindings.discoverDescriptors = function(peripheralUuid, serviceUuid, characteristicUuid) {

};

nobleBindings.readValue = function(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid) {

};

nobleBindings.writeValue = function(uuid, serviceUuid, characteristicUuid, descriptorUuid, data) {

};

nobleBindings.init();

module.exports = nobleBindings;
