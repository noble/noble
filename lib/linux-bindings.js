var debug = require('debug')('bindings');

var events = require('events');
var util = require('util');

var dbus = require('dbus-native');
var systemBus = dbus.systemBus();
var bluezService = systemBus.getService('org.bluez');

systemBus.requestName('node.noble', 0);

var NobleBindings = function() {
  this._devicesDiscovered = {};
  this._devices = {};
  this._services = {};
  this._characteristics = {};
};

util.inherits(NobleBindings, events.EventEmitter);

var nobleBindings = new NobleBindings();

nobleBindings.init = function() {
  bluezService.getInterface('/', 'org.bluez.Manager', function(error, managerInterface) {
    managerInterface.DefaultAdapter(function(error, defaultAdapter) {
      bluezService.getInterface(defaultAdapter, 'org.bluez.Adapter', function(error, defaultAdapterInterface) {
        this._defaultAdapterInterface = defaultAdapterInterface;

        this._defaultAdapterInterface.GetProperties(function(error, properties) {
          for (var i in properties) {
            var property = properties[i];

            var key = property[0];
            var value = property[1][1][0];

            if (key === 'Powered') {
              this.emit('stateChange', value ? 'poweredOn' : 'poweredOff');
            }
          }
        }.bind(this));

        this._defaultAdapterInterface.on('DeviceFound', function(address, values) {
          if (!this._devicesDiscovered[address]) {
            this._devicesDiscovered[address] = true;

            var advertisement = {
              uuid: address,
              serviceUuids: []
            };
            var rssi = null;

            for (var i in values) {
              var property = values[i];

              var key = property[0];
              var value = property[1][1][0];

              if (key === 'Name') {
                advertisement.localName = value;
              } else if (key === 'RSSI') {
                rssi = value;
              } else if (key === 'UUIDs') {
                for (var j in value) {
                  var uuid = value[j].split('-').join('');

                  if (uuid.match(/^0000.{4}00001000800000805f9b/)) { //0000.{4}00001000800000805f9b34fb$
                    uuid = uuid.substring(4, 8);
                  }

                  advertisement.serviceUuids.push(uuid);
                }
              }
            }

            this._defaultAdapterInterface.FindDevice(address, function(error, device) {
              if (device) {
                this._defaultAdapterInterface.RemoveDevice(device, function(error, device) {
                  this.emit('discover', address, advertisement, rssi);
                }.bind(this));
              } else {
                this.emit('discover', address, advertisement, rssi);
              }
            }.bind(this));
          }
        }.bind(this));
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

nobleBindings.startScanning = function(serviceUuids, allowDuplicates) {
  this._defaultAdapterInterface.StartDiscovery(function() {
    this.emit('scanStart');
  }.bind(this));
};

nobleBindings.stopScanning = function() {
  this._defaultAdapterInterface.StopDiscovery(function() {
    this.emit('scanStop');
  }.bind(this));
};

nobleBindings.connect = function(peripheralUuid) {
  var address = peripheralUuid;

  this._defaultAdapterInterface.CreateDevice(address, function(error, device) {
    bluezService.getInterface(device, 'org.bluez.Device', function(error, deviceInterface) {
      this._devices[address] = deviceInterface;

      this.emit('connect', address);
    }.bind(this));
  }.bind(this));
};

nobleBindings.disconnect = function(peripheralUuid) {
  var address = peripheralUuid;

  this._devices[address].Disconnect(function(error) {
    this.emit('disconnect', address);
  }.bind(this));
};

nobleBindings.updateRssi = function(peripheralUuid) {
  var address = peripheralUuid;

  var rssi = 127;
  this.emit('rssiUpdate', address, rssi);
};

nobleBindings.discoverServices = function(peripheralUuid, uuids) {
  var address = peripheralUuid;

  this._devices[address].GetProperties(function(error, properties) {
    var serviceUuids = null;
    var serviceObjectPaths = null;

    for (var i in properties) {
      var property = properties[i];

      var key = property[0];
      var value = property[1][1][0];

      if (key === 'UUIDs') {
        serviceUuids = value;
      } else if (key === 'Services') {
        serviceObjectPaths = value;
      }
    }

    this._services[address] = {};
    this._characteristics[address] = {};
    var discoveredUuids = [];

    for (var i in serviceUuids) {
      var serviceUuid = serviceUuids[i].split('-').join('');

      if (serviceUuid.match(/^0000.{4}00001000800000805f9b/)) { //0000.{4}00001000800000805f9b34fb$
        serviceUuid = serviceUuid.substring(4, 8);
      }

      (function(serviceUuid) {
        bluezService.getInterface(serviceObjectPaths[i], 'org.bluez.Characteristic', function(error, serviceInterface) {
          discoveredUuids.push(serviceUuid);
          this._services[address][serviceUuid] = serviceInterface;
          this._characteristics[address][serviceUuid] = {};

          if (discoveredUuids.length === serviceUuids.length) {
            this.emit('servicesDiscover', peripheralUuid, discoveredUuids);
          }
        }.bind(this));
      }.bind(this))(serviceUuid);
    }
  }.bind(this));
};

nobleBindings.discoverIncludedServices = function(peripheralUuid, serviceUuid, serviceUuids) {
  var address = peripheralUuid;

  this._services[address][serviceUuid].GetProperties(function(error, properties) {
    // for (var i in properties) {
    //   var property = properties[i];

    //   var key = property[0];
    //   var value = property[1][1][0];

    //   // console.log(key + ' = ' + value);
    // }

    var includedServiceUuids = [];

    this.emit('includedServicesDiscover', peripheralUuid, serviceUuid, includedServiceUuids);
  }.bind(this));
};


nobleBindings.discoverCharacteristics = function(peripheralUuid, serviceUuid, characteristicUuids) {
  var address = peripheralUuid;

  this._services[address][serviceUuid].DiscoverCharacteristics(function(error, characteristics) {

    var discoveredCharacteristics = [];

    for (var i in characteristics) {
      var characteristic = characteristics[i];

      bluezService.getInterface(characteristic, 'org.bluez.Characteristic', function(error, characteristicInterface) {
        characteristicInterface.GetProperties(function(error, properties) {
          for (var j in properties) {
            var property = properties[j];

            var key = property[0];
            var value = property[1][1][0];

            if (key === 'UUID') {
              var uuid = value.split('-').join('');

              if (uuid.match(/^0000.{4}00001000800000805f9b/)) { //0000.{4}00001000800000805f9b34fb$
                uuid = uuid.substring(4, 8);
              }

              this._characteristics[address][serviceUuid][uuid] = characteristicInterface;
              discoveredCharacteristics.push({
                uuid: uuid,
                properties: []
              });

              if (discoveredCharacteristics.length === characteristics.length) {
                this.emit('characteristicsDiscover', peripheralUuid, serviceUuid, discoveredCharacteristics);
              }
            }
          }
        }.bind(this));
      }.bind(this));
    } 
  }.bind(this));
};

nobleBindings.read = function(peripheralUuid, serviceUuid, characteristicUuid) {
  var address = peripheralUuid;

  var interval = setInterval(function() {
    this._characteristics[address][serviceUuid][characteristicUuid].GetProperties(function(error, properties) {
      for (var j in properties) {
        var property = properties[j];

        var key = property[0];
        var value = property[1][1][0];

        if (key === 'Value') {
          console.log(property[1][0][0]);
          var data = new Buffer(value);

          clearInterval(interval);

          var isNotification = false;
          this.emit('read', peripheralUuid, serviceUuid, characteristicUuid, data, isNotification);
        }
      }
    }.bind(this));

  }.bind(this), 200);
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
