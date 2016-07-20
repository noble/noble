
var should = require('should');
var sinon = require('sinon');
var bindings = require('../../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');

var a = require('../abstract/common');

describe('Noble bindings descriptor', function() {
  var sandbox;
  var mock;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    mock = new Mock(bindings, sandbox);
    
    //set internal state
    mock.discoverPeripheral();
    mock.discoverServices();
    mock.discoverCharacteristics();
    mock.discoverDescriptors();
  });

  afterEach(function () {
    sandbox.restore();
    mock = null;
  });

  it('should emit valueRead', function() {
    var eventSpy = sandbox.spy();
    bindings.once('valueRead', eventSpy);
    
    //stub native
    sandbox.stub(mock.nativeDescriptorObject, "readValue", function(){
      this.emit('valueUpdate', a.dataBuffer, a.mockError);
    });

    //make the call
    bindings.readValue(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.descriptorUuidString);
    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.descriptorUuidString, a.dataBuffer).should.equal(true);
  });

  it('should emit valueWrite', function() {
    var eventSpy = sandbox.spy();
    bindings.once('valueWrite', eventSpy);

    //stub native
    sandbox.stub(mock.nativeDescriptorObject, "writeValue", function(){
      this.emit('valueWrite', a.mockError);
    });

    //make the call
    bindings.writeValue(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.descriptorUuidString, a.dataBuffer);
    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.descriptorUuidString).should.equal(true);
  });

});
