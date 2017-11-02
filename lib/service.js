var debug = require('debug')('service');

var events = require('events');
var util = require('util');

var services = require('./services.json');

function Service(noble, peripheralId, uuid) {
  this._noble = noble;
  this._peripheralId = peripheralId;

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
  const promise = new Promise((resolve, reject) => {
    this.once('includedServicesDiscover', resolve);

    this._noble.discoverIncludedServices(
      this._peripheralId,
      this.uuid,
      serviceUuids
    );
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

Service.prototype.discoverCharacteristics = function(characteristicUuids, callback) {
  const promise = new Promise((resolve, reject) => {
    this.once('characteristicsDiscover', resolve);

    this._noble.discoverCharacteristics(
      this._peripheralId,
      this.uuid,
      characteristicUuids
    );
  });

  if (callback && typeof callback == 'function') {
    promise.then(callback.bind(null, null), callback);
  }

  return promise;
};

module.exports = Service;
