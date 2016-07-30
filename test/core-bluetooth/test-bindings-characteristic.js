
var should = require('should');
var sinon = require('sinon');
var bindings = require('../../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');

var a = require('../abstract/common');
var Abstract = require('../abstract/test-bindings-abstract');


//we need to stub/emit something for these
Abstract.emitRead(bindings, Mock, function(mock, sandbox)
{
  //stub native
  sandbox.stub(mock.nativeCharacteristicObject, "readValue", function(){
    this.emit('valueUpdate', a.dataBuffer);
  });

  //set internal state
  mock.discoverPeripheral();
  mock.discoverServices();
  mock.discoverCharacteristics();
});

Abstract.emitWrite(bindings, Mock);

Abstract.emitNotify(bindings, Mock, function(mock, sandbox)
{
  //stub native
  sandbox.stub(mock.nativeCharacteristicObject, "setNotifyValue", function(){
    this.emit('notificationStateUpdate', a.notifyBoolean, a.mockError);
  });

  //set internal state
  mock.discoverPeripheral();
  mock.discoverServices();
  mock.discoverCharacteristics();
});

Abstract.emitDescriptorsDiscover(bindings, Mock, function(mock, sandbox)
{
  //stub native
  sandbox.stub(mock.nativeCharacteristicObject, "discoverDescriptors", function(){
    this.emit('descriptorsDiscover', [mock.nativeDescriptorObject], a.mockError);
  });

  //set internal state
  mock.discoverPeripheral();
  mock.discoverServices();
  mock.discoverCharacteristics();
});
