var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');

var dbus = require('dbus-native');
var systemBus = dbus.systemBus();
var bluezService = systemBus.getService('org.bluez');

systemBus.requestName('node.noble', 0);

var NobleBindings = function() {
  this._adapterInterface = {};
  this._devices = {};
  this._serviceUuids = {};
};

util.inherits(NobleBindings, events.EventEmitter);

var nobleBindings = new NobleBindings();

nobleBindings.init = function() {
  bluezService.getInterface('/', 'org.freedesktop.DBus.ObjectManager', function(error, objectManagerInterface) {
    objectManagerInterface.on('InterfacesAdded', function(object, interfaces) {
      var objectInterface = interfaces[1][0];
      var objectProperties = interfaces[1][1];

      if (objectInterface === 'org.bluez.Device1') {
        var peripheralUuid = null;
        var advertisement = {
          serviceUuids: []
        };
        var rssi = null;

        for (var i in objectProperties) {
          var property = objectProperties[i];
          var key = property[0];
          var value = property[1][1][0];

          if (key === 'Address') {
            peripheralUuid = value;
          } else if (key === 'Name') {
            advertisement.localName = value;
          } else if (key === 'RSSI') {
            rssi = value;
          } else if (key === 'UUIDs') {
            for (var j in value) {
              var uuid = value[j].split('-').join('');

              if (uuid.match(/^0000.{4}00001000800000805f9b34fb$/)) {
                uuid = uuid.substring(4, 8);
              }
              
              advertisement.serviceUuids.push(uuid);
            }
          }
        }

        bluezService.getInterface(object, objectInterface, function(error, deviceInterface) {
          this._devices[peripheralUuid] = deviceInterface;

          this.emit('discover', peripheralUuid, advertisement, rssi);
        }.bind(this));

        bluezService.getInterface(object, 'org.freedesktop.DBus.Properties', function(error, deviceProperties) {
          deviceProperties.on('PropertiesChanged', function(interface, changedProperties, invalidatedPoperties) {
            for (var i in changedProperties) {
              var changedProperty = changedProperties[i];

              var key = changedProperty[0];
              var value = changedProperty[1][1][0];

              if (key === 'Connected') {
                //this.emit('connect', peripheralUuid);
              } else if (key === 'UUIDs') {
                this._serviceUuids[peripheralUuid] = value;

                this.emit('connect', peripheralUuid);
              } else {
                console.log(key);
                console.log(value);
              }
            }
          }.bind(this));
        }.bind(this));
      }
    }.bind(this));

    objectManagerInterface.GetManagedObjects(function(error, objects) {
      for (var i in objects) {
        var object = objects[i];
        var objectPath = object[0];
        var objectInterface = object[1][1][0];

        if (objectInterface === 'org.bluez.Adapter1') {
          bluezService.getInterface(objectPath, objectInterface, function(error, adapterInterface) {
            this._adapterInterface = adapterInterface;

            this._adapterInterface.Powered(function(error, powered) {
              this.emit('stateChange', powered ? 'poweredOn' : 'poweredOff');
            }.bind(this));
          }.bind(this));
        }
      }
    }.bind(this));
  }.bind(this));
};

nobleBindings.startScanning = function(serviceUuids, allowDuplicates) {
  this._adapterInterface.StartDiscovery(function(error) {
    this.emit('scanStart');
  }.bind(this));
};

nobleBindings.stopScanning = function() {
  this._adapterInterface.StopDiscovery(function(error) {
    this.emit('scanStop');
  }.bind(this));
};

nobleBindings.connect = function(peripheralUuid) {
  var deviceInterface = this._devices[peripheralUuid];

  deviceInterface.Connect(function(error) {
    
  }.bind(this));
};

nobleBindings.disconnect = function(peripheralUuid) {
  var deviceInterface = this._devices[peripheralUuid];

  deviceInterface.Disonnect(function(error) {
    //this.emit('disconnect', peripheralUuid);
  }.bind(this));
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
