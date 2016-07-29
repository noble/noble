
var should = require('should');
var sinon = require('sinon');
var bindings = require('../../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');
var a = require('../abstract/common');
var Abstract = require('../abstract/test-bindings-abstract');

Abstract.emitIncludedServicesDiscover(bindings, Mock, function(mock, sandbox)
{
  //stub native
  sandbox.stub(mock.nativeServiceObject, "discoverIncludedServices", function(){
    this.emit('includedServicesDiscover', [mock.nativeIncludedServiceObject], a.mockError);
  });

  //set internal state
  mock.discoverPeripheral();
  mock.discoverServices();
});

Abstract.emitCharacteristicsDiscover(bindings, Mock, function(mock, sandbox)
{
  //stub native
  sandbox.stub(mock.nativeServiceObject, "discoverCharacteristics", function(){
    this.emit('characteristicsDiscover', [mock.nativeCharacteristicObject], a.mockError);
  });

  //set internal state
  mock.discoverPeripheral();
  mock.discoverServices();
});
