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

  this.mockHci.addressType = 'public';
  this.mockHci.address = '00:00:00:00:00:00';

  this.bindings.init(this.mockHci, this.mockGap);
}

function MockHci() {}
util.inherits(MockHci, events.EventEmitter);

MockHci.prototype.init = function(){};
MockHci.prototype.mapStatus = function(staus){ return 'Connection Timeout';};
MockHci.prototype.writeAclDataPkt = function(){};
MockHci.prototype.createLeConn = function(){};
MockHci.prototype.disconnect = function(){};

function MockGap() {}
util.inherits(MockGap, events.EventEmitter);

MockGap.prototype.startScanning = function(){};
MockGap.prototype.stopScanning = function(){};

module.exports = Mock;
