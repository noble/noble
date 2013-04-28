var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');

var dbus = require('dbus');

var NobleBindings = function() {
  this._adapterInterface = {};
  this._devices = {};
  this._serviceUuids = {};
};

util.inherits(NobleBindings, events.EventEmitter);

var nobleBindings = new NobleBindings();

nobleBindings.init = function() {
   dbus.start(function() {
    this._systemBus = dbus.system_bus();
    this._objectManager = dbus.get_interface(this._systemBus, 'org.bluez', '/', 'org.freedesktop.DBus.ObjectManager');

    this._objectManager.InterfacesAdded.onemit = function(object, interfaces) {
      for(var interface in interfaces) {
        var properties = interfaces[interface];

        if (interface === 'org.bluez.Device1') {
          var address = properties.Address;
          var advertisement = {
            localName: properties.Name,
            serviceUuids: []
          };
          var rssi = ((properties.RSSI ^ 0xFFFF) + 1) * -1;

          var uuids = properties.UUIDs || [];
          for (var i in uuids) {
            var uuid = uuids[i].split('-').join('');

            if (uuid.match(/^0000.{4}00001000800000805f9b/)) {
              uuid = uuid.substring(4, 8);
            }
            advertisement.serviceUuids.push(uuid);
          }

          this._devices[address] = dbus.get_interface(this._systemBus, 'org.bluez', object, interface);
          this.emit('discover', address, advertisement, rssi);

          var propertiesInterface = dbus.get_interface(this._systemBus, 'org.bluez', object, 'org.freedesktop.DBus.Properties');
          propertiesInterface.PropertiesChanged.onemit = function(interface, changedProperties, invalidatedProperties) {
            if (interface === 'org.bluez.Device1') {
              for(var key in changedProperties) {
                var value = changedProperties[key];

                if (key === 'Connected') {
                  // this.emit(value ? 'connect' : 'disconnect', address);
                } else if (key === 'UUIDs') {
                  this._serviceUuids[address] = value;

                  this.emit('connect', address);
                }
              }
            }
          }.bind(this);
          propertiesInterface.PropertiesChanged.enabled = true;
        }
      }
    }.bind(this);
    this._objectManager.InterfacesAdded.enabled = true;

    var managedObjects = this._objectManager.GetManagedObjects();
    for(var object in managedObjects) {
      var interfaces = managedObjects[object];

      for(var interface in interfaces) {
        var properties = interfaces[interface];

        if (interface === 'org.bluez.Adapter1') {
          this._adapterInterface = dbus.get_interface(this._systemBus, 'org.bluez', object, interface);

          this.emit('stateChange', properties.Powered ? 'poweredOn' : 'poweredOff');
        } else if (interface === 'org.bluez.Device1') {
          this._adapterInterface.RemoveDevice(object);
        }
      }
    }
  }.bind(this));
};

nobleBindings.startScanning = function(serviceUuids, allowDuplicates) {
  this._adapterInterface.StartDiscovery();

  this.emit('scanStart');
};

nobleBindings.stopScanning = function() {
  this._adapterInterface.StopDiscovery();

  this.emit('scanStop');
};

nobleBindings.connect = function(peripheralUuid) {
  var deviceInterface = this._devices[peripheralUuid];

  deviceInterface.Connect();
};

nobleBindings.disconnect = function(peripheralUuid) {
  var deviceInterface = this._devices[peripheralUuid];

  deviceInterface.Disonnect();
};

nobleBindings.updateRssi = function(peripheralUuid) {
  // not implemented
  var rssi = 127;

  this.emit('rssiUpdate', peripheralUuid, rssi);
};

nobleBindings.discoverServices = function(peripheralUuid, uuids) {
  var uuids = this._serviceUuids[peripheralUuid];
  var serviceUuids = [];

  for (var i in uuids) {
    var uuid = uuids[i].split('-').join('');

    if (uuid.match(/^0000.{4}00001000800000805f9b34fb$/)) {
      uuid = uuid.substring(4, 8);
    }
    
    serviceUuids.push(uuid);
  }

  this.emit('servicesDiscover', peripheralUuid, serviceUuids);
};

nobleBindings.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  // not implemented
  var includedServiceUuids = [];

  this.emit('includedServicesDiscover', peripheralUuid, serviceUuid, includedServiceUuids);
};

nobleBindings.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {

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
