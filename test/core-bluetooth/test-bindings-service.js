
var should = require('should');
var sinon = require('sinon');
var bindings = require('../../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');

var a = require('../abstract/common');

describe('Noble bindings service', function() {
  var sandbox;
  var mock;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    mock = new Mock(bindings, sandbox);

    mock.discoverPeripheral();
    mock.discoverServices();
  });

  afterEach(function () {
    sandbox.restore();
    mock = null;
  });


  it('should emit includedServicesDiscover', function() {
    var eventSpy = sandbox.spy();
    bindings.once('includedServicesDiscover', eventSpy);

    //stub native
    sandbox.stub(mock.nativeServiceObject, "discoverIncludedServices", function(){
      this.emit('includedServicesDiscover', [mock.nativeIncludedServiceObject], a.mockError);
    });

    //make the call
    bindings.discoverIncludedServices(a.peripheralUuidString, a.serviceUuidString, [mock.nativeIncludedServiceUuidString]);
    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, [a.includedServiceUuidString]).should.equal(true);
  });

  it('should emit characteristicsDiscover', function() {
    var eventSpy = sandbox.spy();
    bindings.once('characteristicsDiscover', eventSpy);

    //stub native
    sandbox.stub(mock.nativeServiceObject, "discoverCharacteristics", function(){
      this.emit('characteristicsDiscover', [mock.nativeCharacteristicObject], a.mockError);
    });

    //make the call
    bindings.discoverCharacteristics(a.peripheralUuidString, a.serviceUuidString, [a.characteristicUuidString]);
    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, [a.bindingsCharacteristicObject]).should.equal(true);
  });

});
