var debug = require('debug')('service');

var events = require('events');
var util = require('util');

var services = require('./services.json');

function Service(noble, peripheralUuid, uuid) {
  this._noble = noble;
  this._peripheralUuid = peripheralUuid;

  this.uuid = uuid;
  this.name = null;
  this.type = null;
  this.includedServiceUuids = null;
  this.characteristics = null;

  var service = services[uuid];
  if (service) {
    this.name = service.name;
    this.type = service.type;
  }
}

util.inherits(Service, events.EventEmitter);

Service.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    name: this.name,
    type: this.type,
    includedServiceUuids: this.includedServiceUuids
  });
};

Service.prototype.discoverIncludedServices = function(serviceUuids, callback) {
  this.once('_includedServicesDiscover', function(error, includedServiceUuids) {
    if (typeof(callback) === 'function') {
      callback(error, includedServiceUuids);
    }

    if (!error) {
      this.emit('includedServicesDiscover', includedServiceUuids);
    }
  }.bind(this));

  this._noble.discoverIncludedServices(
    this._peripheralUuid,
    this.uuid,
    serviceUuids
  );
};

Service.prototype.discoverCharacteristics = function(characteristicUuids, callback) {
  this.once('_characteristicsDiscover', function(error, characteristics) {
    if (typeof(callback) === 'function') {
      callback(error, characteristics);
    }

    if (!error) {
      this.emit('characteristicsDiscover', characteristics);
    }
  }.bind(this));

  this._noble.discoverCharacteristics(
    this._peripheralUuid,
    this.uuid,
    characteristicUuids
  );
};

module.exports = Service;
