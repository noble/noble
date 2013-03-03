var debug = require('debug')('descriptor');

var events = require('events');
var util = require('util');

function Descriptor(characteristic, uuid) {
  this._characteristic = characteristic;
  this.uuid = uuid;
}

util.inherits(Descriptor, events.EventEmitter);

Descriptor.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid
  });
};

Descriptor.prototype.readValue = function() {
  this._characteristic.readDescriptorValue(this.uuid);
};

Descriptor.prototype.writeValue = function(data) {
  this._characteristic.writeDescriptorValue(this.uuid, data);
};

module.exports = Descriptor;
