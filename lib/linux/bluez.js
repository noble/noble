var debug = require('debug')('bluez');

var events = require('events');
var util = require('util');

var dbus = require('dbus');

var BlueZ = function() {
};

util.inherits(BlueZ, events.EventEmitter);

BlueZ.prototype.init = function() {
  dbus.start(function() {
    this._systemBus = dbus.system_bus();
    this._objectManager = dbus.get_interface(this._systemBus, 'org.bluez', '/', 'org.freedesktop.DBus.ObjectManager');

    this._objectManager.InterfacesAdded.onemit = this.onInterfacesAdded.bind(this);
    this._objectManager.InterfacesAdded.enabled = true;

    this.setupManagedObjects();
  }.bind(this));
};

BlueZ.prototype.setupManagedObjects = function() {
  var managedObjects = this._objectManager.GetManagedObjects();
  for(var object in managedObjects) {
    var interfaces = managedObjects[object];

    for(var interface in interfaces) {
      var properties = interfaces[interface];

      if (interface === 'org.bluez.Adapter1') {
        this._adapter = dbus.get_interface(this._systemBus, 'org.bluez', object, interface);
        this._adapterProperties = dbus.get_interface(this._systemBus, 'org.bluez', object, 'org.freedesktop.DBus.Properties');

        this._adapterProperties.PropertiesChanged.onemit = this.onAdapterPropertiesChanged.bind(this);
        this._adapterProperties.PropertiesChanged.enabled = true;

        var powered = properties.Powered;

        process.nextTick(function() {
          this.emit('stateChange', powered ? 'poweredOn' : 'poweredOff');
        }.bind(this));
      } else if (interface === 'org.bluez.Device1') {
        this._adapter.RemoveDevice(object);
      }
    }
  }
};

BlueZ.prototype.startScanning = function() {
  this._adapter.StartDiscovery();

  this.emit('scanStart');
};

BlueZ.prototype.stopScanning = function() {
  this._adapter.StopDiscovery();

  this.emit('scanStop');
};

BlueZ.prototype.onInterfacesAdded = function(object, interfaces) {
  for(var interface in interfaces) {
    var properties = interfaces[interface];

    if (interface === 'org.bluez.Device1') {
      var address = properties.Address;
      var advertisement = {
        localName: properties.Name,
        serviceData: null,
        txPowerLevel: null,
        manufacturerData: null,
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

      process.nextTick(function() {
        this.emit('discover', address, advertisement, rssi);
      }.bind(this));
    }
  }
};

BlueZ.prototype.onAdapterPropertiesChanged = function(interface, changedProperties, invalidatedProperties) {
  for(var key in changedProperties) {
    var value = changedProperties[key];

    if (key === 'Powered') {
      process.nextTick(function() {
        this.emit('stateChange', value ? 'poweredOn' : 'poweredOff');
      }.bind(this));
    }
  }
};

module.exports = BlueZ;
