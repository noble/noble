
var should = require('should');
var sinon = require('sinon');
var bindings = require('../../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');
var a = require('../abstract/common');
var Abstract = require('../abstract/test-bindings-abstract');

Abstract.emitRssiUpdate(bindings, Mock, function(mock, sandbox)
{
  //stub native
  mock.nativePeripheralObject.readRSSI = function(){
    this.emit('rssiUpdate', a.rssiNumber, a.mockError);
  };

  //set internal state
  mock.discoverPeripheral();
});

Abstract.emitServicesDiscover(bindings, Mock, function(mock, sandbox)
{
  //stub native
  sandbox.stub(mock.nativePeripheralObject, "discoverServices", function(){
    this.emit('servicesDiscover', [mock.nativeServiceObject], a.mockError);
  });

  //set internal state
  mock.discoverPeripheral();
});
