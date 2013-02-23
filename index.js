var events = require('events');
var util = require('util');

var bindings = require('./build/Release/binding.node');
var NobleBindings = bindings.Noble;

inherits(NobleBindings, events.EventEmitter);

// extend prototype
function inherits(target, source) {
  for (var k in source.prototype) {
    target.prototype[k] = source.prototype[k];
  }
}

function Noble() {
  this._bindings = new NobleBindings();
  this._peripherals = {};

  var self = this;

  this._bindings.on('stateChange', function(state) {
    self.emit('stateChange', state);
  });

  this._bindings.on('scanStart', function(state) {
    self.emit('scanStart');
  });

  this._bindings.on('scanStop', function(state) {
    self.emit('scanStop');
  });

  this._bindings.on('peripheralDiscover', function(uuid, localName, services, rssi) {
    var peripheral = self._peripherals[uuid] = new NoblePeripheral(uuid, localName, services, rssi);

    self.emit('peripheralDiscover', peripheral);
  });

  this._bindings.on('peripheralConnect', function(uuid) {
    var peripheral = self._peripherals[uuid];

    self.emit('peripheralConnect', peripheral);
    peripheral.emit('connect');
  });

  this._bindings.on('peripheralConnectFailure', function(uuid, reason) {
    var peripheral = self._peripherals[uuid];

    self.emit('peripheralConnectFailure', peripheral, reason);
    peripheral.emit('connectFailure', reason);
  });

  this._bindings.on('peripheralDisonnect', function(uuid) {
    var peripheral = self._peripherals[uuid];

    self.emit('peripheralDisconnect', peripheral);
    peripheral.emit('disconnect');
  });
}

util.inherits(Noble, events.EventEmitter);

Noble.prototype.startScanning = function(serviceUUIDs, allowDuplicates) {
  this._bindings.startScanning(serviceUUIDs, allowDuplicates);
};

Noble.prototype.stopScanning = function(serviceUUIDs, allowDuplicates) {
  this._bindings.stopScanning();
};

Noble.prototype.connectPeripheral = function(uuid) {
  this._bindings.connectPeripheral(uuid);
};

Noble.prototype.disconnectPeripheral = function(uuid) {
  this._bindings.disconnectPeripheral(uuid);
};

var noble = new Noble();
module.exports = noble;

function NoblePeripheral(uuid, localName, services, rssi) {
  this.uuid = uuid;
  this.localName = localName;
  this.services = services;
  this.rssi = rssi;
}

util.inherits(NoblePeripheral, events.EventEmitter);

NoblePeripheral.prototype.connect = function() {
  noble.connectPeripheral(this.uuid);
};

NoblePeripheral.prototype.disconnect = function() {
  noble.disconnectPeripheral(this.uuid);
};

