
var should = require('should');
var sinon = require('sinon');
var bindings = require('../../lib/hci-socket/bindings');
var Mock = require('./hci-socket-mock');

var a = require('../abstract/common');

var Abstract = require('../abstract/test-bindings-abstract');


Abstract.startScanningEmitScanStart(bindings, Mock, function(mock){
  mock.mockGap.emit('scanStart');
});

Abstract.stopScanningEmitScanStop(bindings, Mock, function(mock){
  mock.mockGap.emit('scanStop');
});

Abstract.emitAddressChange(bindings, Mock, function(mock){
  mock.mockHci.emit('addressChange', a.addressString);
});

Abstract.emitStateChange(bindings, Mock, function(mock){
  mock.mockHci.emit('stateChange', a.stateString);
});

Abstract.emitDiscover(bindings, Mock, function(mock){
  console.log(a.addressString, a.addressTypeString, a.connectableBoolean, mock.gapAdvertisementObject, a.rssiNumber);
  mock.mockGap.emit('discover', 0, a.addressString, a.addressTypeString, a.connectableBoolean, mock.gapAdvertisementObject, a.rssiNumber);
});

