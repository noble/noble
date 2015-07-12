var debug = require('debug')('acl-att-stream');

var events = require('events');
var util = require('util');

var AclAttStream = function(hci, handle) {
  this._hci = hci;
  this._handle = handle;
};

util.inherits(AclAttStream, events.EventEmitter);

AclAttStream.prototype.write = function(data) {
  this._hci.writeAclAttDataPkt(this._handle, data);
};

AclAttStream.prototype.push = function(data) {
  if (data) {
    this.emit('data', data);
  } else {
    this.emit('end');
  }
};

module.exports = AclAttStream;
