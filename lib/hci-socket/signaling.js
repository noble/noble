var debug = require('debug')('signaling');

var events = require('events');
var os = require('os');
var util = require('util');

var CONNECTION_PARAMETER_UPDATE_REQUEST  = 0x12;
var CONNECTION_PARAMETER_UPDATE_RESPONSE = 0x13;

var SIGNALING_CID = 0x0005;

var Signaling = function(handle, aclStream) {
  this._handle = handle;
  this._aclStream = aclStream;

  this.onAclStreamDataBinded = this.onAclStreamData.bind(this);
  this.onAclStreamEndBinded = this.onAclStreamEnd.bind(this);

  this._aclStream.on('data', this.onAclStreamDataBinded);
  this._aclStream.on('end', this.onAclStreamEndBinded);
};

util.inherits(Signaling, events.EventEmitter);

Signaling.prototype.onAclStreamData = function(cid, data) {
  if (cid !== SIGNALING_CID) {
    return;
  }

  debug('onAclStreamData: ' + data.toString('hex'));

  var code = data.readUInt8(0);
  var identifier = data.readUInt8(1);
  var length = data.readUInt16LE(2);
  var signalingData = data.slice(4);

  debug('\tcode = ' + code);
  debug('\tidentifier = ' + identifier);
  debug('\tlength = ' + length);

  if (code === CONNECTION_PARAMETER_UPDATE_REQUEST) {
    this.processConnectionParameterUpdateRequest(identifier, signalingData);
  }
};

Signaling.prototype.onAclStreamEnd = function() {
  this._aclStream.removeListener('data', this.onAclStreamDataBinded);
  this._aclStream.removeListener('end', this.onAclStreamEndBinded);
};

Signaling.prototype.processConnectionParameterUpdateRequest = function(identifier, data) {
  var minInterval = data.readUInt16LE(0) * 1.25;
  var maxInterval = data.readUInt16LE(2) * 1.25;
  var latency = data.readUInt16LE(4);
  var supervisionTimeout = data.readUInt16LE(6) * 10;

  debug('\t\tmin interval = ', minInterval);
  debug('\t\tmax interval = ', maxInterval);
  debug('\t\tlatency = ', latency);
  debug('\t\tsupervision timeout = ', supervisionTimeout);

  if (os.platform() !== 'linux' || process.env.HCI_CHANNEL_USER) {
    var response = new Buffer(6);

    response.writeUInt8(CONNECTION_PARAMETER_UPDATE_RESPONSE, 0); // code
    response.writeUInt8(identifier, 1); // identifier
    response.writeUInt16LE(2, 2); // length
    response.writeUInt16LE(0, 4);

    this._aclStream.write(SIGNALING_CID, response);

    this.emit('connectionParameterUpdateRequest', this._handle, minInterval, maxInterval, latency, supervisionTimeout);
  }
};

module.exports = Signaling;
