var debug = require('debug')('service');

var events = require('events');
var util = require('util');

var services = require('./services.json');

function Service(noble, peripheralId, id, uuid) {
  this._noble = noble;
  this._peripheralId = peripheralId;

  this.id = id;
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
    id: this.id,
    uuid: this.uuid,
    name: this.name,
    type: this.type,
    includedServiceUuids: this.includedServiceUuids
  });
};

Service.prototype.discoverIncludedServices = function(serviceUuids, callback) {
  if (callback) {
    this.once('includedServicesDiscover', function(includedServiceUuids) {
      callback(null, includedServiceUuids);
    });
  }

  this._noble.discoverIncludedServices(
    this._peripheralId,
    this.id,
    serviceUuids
  );
};

Service.prototype.discoverCharacteristics = function(characteristicUuids, callback) {
  if (callback) {
    this.once('characteristicsDiscover', function(characteristics) {
      callback(null, characteristics);
    });
  }

  this._noble.discoverCharacteristics(
    this._peripheralId,
    this.id,
    characteristicUuids
  );
};

module.exports = Service;
