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

function NoblePeripheral(uuid, localName, services, rssi) {
  this.uuid = uuid;
  this.localName = localName;
  this.services = services;
  this.rssi = rssi;
}

function Noble() {
  this.bindings = new NobleBindings();
  var _this = this;

  this.bindings.on('stateChange', function(state) {
    _this.emit('stateChange', state);
  });

  this.bindings.on('scanStart', function(state) {
    _this.emit('scanStart');
  });

  this.bindings.on('scanStop', function(state) {
    _this.emit('scanStop');
  });

  this.bindings.on('peripheralDiscovered', function(uuid, localName, services, rssi) {
    _this.emit('peripheralDiscovered', new NoblePeripheral(uuid, localName, services, rssi));
  });
}

util.inherits(Noble, events.EventEmitter);

Noble.prototype.startScanning = function(serviceUUIDs, allowDuplicates) {
  this.bindings.startScanning(serviceUUIDs, allowDuplicates);
};

Noble.prototype.stopScanning = function(serviceUUIDs, allowDuplicates) {
  this.bindings.stopScanning();
};

module.exports = new Noble();
