
var should = require('should');
var sinon = require('sinon');
var bindings = require('../../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');

var a = require('../abstract/common');

describe('Noble bindings characteristic', function() {
  var sandbox;
  var mock;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    mock = new Mock(bindings, sandbox);

    //set internal state
    mock.discoverPeripheral();
    mock.discoverServices();
    mock.discoverCharacteristics();
  });

  afterEach(function () {
    sandbox.restore();
    mock = null;
  });

  it('should emit read', function() {
    var eventSpy = sandbox.spy();
    bindings.once('read', eventSpy);

    //stub native
    sandbox.stub(mock.nativeCharacteristicObject, "readValue", function(){
      this.emit('valueUpdate', a.dataBuffer);
    });

    //make the call
    bindings.read(a.peripheralUuidString, a.serviceUuidString,a. characteristicUuidString);
    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.dataBuffer).should.equal(true);
  });

  it('should emit write', function() {
    var eventSpy = sandbox.spy();
    bindings.once('write', eventSpy);

    //make the call
    bindings.write(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.dataBuffer, true);
    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString).should.equal(true);
  });

  it('should emit notify', function() {
    var eventSpy = sandbox.spy();
    bindings.once('notify', eventSpy);

    //stub native
    sandbox.stub(mock.nativeCharacteristicObject, "setNotifyValue", function(){
      this.emit('notificationStateUpdate', a.notifyBoolean, a.mockError);
    });

    //make the call
    bindings.notify(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.notifyBoolean);
    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.notifyBoolean).should.equal(true);
  });

  it('should emit descriptorsDiscover', function() {
    var eventSpy = sandbox.spy();
    bindings.once('descriptorsDiscover', eventSpy);

    //stub native
    sandbox.stub(mock.nativeCharacteristicObject, "discoverDescriptors", function(){
      this.emit('descriptorsDiscover', [mock.nativeDescriptorObject], a.mockError);
    });

    //make the call
    bindings.discoverDescriptors(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString);
    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, [a.descriptorUuidString]).should.equal(true);
  });

});
