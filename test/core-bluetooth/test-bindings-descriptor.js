
var should = require('should');
var sinon = require('sinon');
var bindings = require('../../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');

var a = require('../abstract/common');
var Abstract = require('../abstract/test-bindings-abstract');

Abstract.emitValueRead(bindings, Mock, function(mock, sandbox)
{
  //stub native
  sandbox.stub(mock.nativeDescriptorObject, "readValue", function(){
    this.emit('valueUpdate', a.dataBuffer, a.mockError);
  });

  //set internal state
  mock.discoverPeripheral();
  mock.discoverServices();
  mock.discoverCharacteristics();
  mock.discoverDescriptors();
});

Abstract.emitValueWrite(bindings, Mock, function(mock, sandbox)
{
  //stub native
  sandbox.stub(mock.nativeDescriptorObject, "writeValue", function(){
    this.emit('valueWrite', a.mockError);
  });

  //set internal state
  mock.discoverPeripheral();
  mock.discoverServices();
  mock.discoverCharacteristics();
  mock.discoverDescriptors();
});
