const events = require('events');
const util = require('util');

const services = require('./services.json');

function Service (noble, peripheralId, uuid) {
  this._noble = noble;
  this._peripheralId = peripheralId;

  this.uuid = uuid;
  this.name = null;
  this.type = null;
  this.includedServiceUuids = null;
  this.characteristics = null;

  const service = services[uuid];
  if (service) {
    this.name = service.name;
    this.type = service.type;
  }
}

util.inherits(Service, events.EventEmitter);

Service.prototype.toString = function () {
  return JSON.stringify({
    uuid: this.uuid,
    name: this.name,
    type: this.type,
    includedServiceUuids: this.includedServiceUuids
  });
};

const discoverIncludedServices = function (serviceUuids, callback) {
  if (callback) {
    this.once('includedServicesDiscover', includedServiceUuids => {
      callback(null, includedServiceUuids);
    });
  }

  this._noble.discoverIncludedServices(
    this._peripheralId,
    this.uuid,
    serviceUuids
  );
};

Service.prototype.discoverIncludedServices = discoverIncludedServices;
Service.prototype.discoverIncludedServicesAsync = function (serviceUuids) {
  return util.promisify((callback) => this.discoverIncludedServices(serviceUuids, callback))();
};

const discoverCharacteristics = function (characteristicUuids, callback) {
  if (callback) {
    this.once('characteristicsDiscover', characteristics => {
      callback(null, characteristics);
    });
  }

  this._noble.discoverCharacteristics(
    this._peripheralId,
    this.uuid,
    characteristicUuids
  );
};

Service.prototype.discoverCharacteristics = discoverCharacteristics;
Service.prototype.discoverCharacteristicsAsync = function (characteristicUuids) {
  return util.promisify((callback) => this.discoverCharacteristics(characteristicUuids, callback))();
};

module.exports = Service;
