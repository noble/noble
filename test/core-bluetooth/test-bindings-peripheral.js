
var should = require('should');
var sinon = require('sinon');
var bindings = require('../../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');

var a = require('../abstract/common');

describe('Noble bindings peripheral', function() {
  var sandbox;
  var mock;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    mock = new Mock(bindings, sandbox);

    //set internal state
    mock.discoverPeripheral();
  });

  afterEach(function () {
    sandbox.restore();
    mock = null;
  });

  it('should emit rssiUpdate', function() {
    var eventSpy = sandbox.spy();
    bindings.once('rssiUpdate', eventSpy);

    //stub native
    mock.nativePeripheralObject.readRSSI = function(){
      this.emit('rssiUpdate', a.rssiNumber, a.mockError);
    };

    //dont touch
    bindings.updateRssi(a.peripheralUuidString);
    eventSpy.calledWithExactly(a.peripheralUuidString, a.rssiNumber).should.equal(true);
  });

  it('should emit servicesDiscover', function() {
    var eventSpy = sandbox.spy();
    bindings.once('servicesDiscover', eventSpy);

    //stub native
    sandbox.stub(mock.nativePeripheralObject, "discoverServices", function(){
      this.emit('servicesDiscover', [mock.nativeServiceObject], a.mockError);
    });

    //make the call
    bindings.discoverServices(a.peripheralUuidString, a.serviceUuidsArray);
    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidsArray).should.equal(true);
  });

});
