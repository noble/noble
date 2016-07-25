var events = require('events');
var util = require('util');

var a = require('../abstract/common');

function Mock(bindings, sandbox){
  this.sandbox = sandbox;

  this.gapAdvertisementObject = { localName: a.localNameString,
                                  txPowerLevel: a.txPowerLevelNumber,
                                  manufacturerData: a.dataBuffer,
                                  serviceData: a.mockServiceData,
                                  serviceUuids: a.serviceUuidsArray };

  this.bindings = bindings;
  this.mockHci = new MockHci();
  this.mockGap = new MockGap();
  this.bindings.init(this.mockHci, this.mockGap);
}

function MockHci() {}
util.inherits(MockHci, events.EventEmitter);

MockHci.prototype.init = function(){};

function MockGap() {}
util.inherits(MockGap, events.EventEmitter);

MockGap.prototype.startScanning = function(){};
MockGap.prototype.stopScanning = function(){};

module.exports = Mock;
