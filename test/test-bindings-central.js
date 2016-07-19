
var should = require('should');
var sinon = require('sinon');
var bindings = require('../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');

var a = require('./common');

describe('Noble bindings central', function() {
  var sandbox;
  var mock;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    mock = new Mock(bindings, sandbox);
  });

  afterEach(function () {
    sandbox.restore();
    mock = null;
  });

  it('startScanning should call native', function() {
    var calledSpy = sandbox.spy(mock.mockCentral, 'scanForPeripherals');

    bindings.startScanning(a.serviceUuidsArray, a.allowDuplicates);

    calledSpy.calledWithExactly(a.serviceUuidsArray, a.allowDuplicates).should.equal(true);
  });

  it('startScanning should emit scanStart', function() {
    var eventSpy = sandbox.spy();
    bindings.on('scanStart', eventSpy);

    bindings.startScanning();

    eventSpy.called.should.equal(true);
  });

  it('stopScanning should call native', function() {
    var calledSpy = sandbox.spy(mock.mockCentral, 'stopScan');

    bindings.stopScanning();

    calledSpy.called.should.equal(true);
  });

  it('stopScanning should emit scanStop', function() {
    var eventSpy = sandbox.spy();
    bindings.on('scanStop', eventSpy);

    bindings.stopScanning();

    eventSpy.called.should.equal(true);
  });

  it('should emit addressChange', function() {
    var eventSpy = sandbox.spy();
    bindings.once('addressChange', eventSpy);

    mock.mockCentral.emit('address', a.addressString);

    eventSpy.calledWithExactly(a.addressString).should.equal(true);
  });


  it('should emit stateChange', function() {
    var eventSpy = sandbox.spy();
    bindings.once('stateChange', eventSpy);

    mock.mockCentral.emit('stateUpdate', a.stateString);

    eventSpy.calledWithExactly(a.stateString).should.equal(true);
  });

  it('should emit discover', function() {
    var eventSpy = sandbox.spy();
    bindings.once('discover', eventSpy);

    mock.mockCentral.emit('peripheralDiscover', mock.nativePeripheralObject, mock.nativeAdvertisementObject, a.rssiNumber);

    eventSpy.calledWithExactly(a.peripheralUuidString, a.addressString, a.addressTypeString, a.connectableBoolean, a.advertisementObject, a.rssiNumber).should.equal(true);
  });

  it('should emit connect on success', function() {
    var eventSpy = sandbox.spy();
    bindings.once('connect', eventSpy);

    mock.mockCentral.emit('peripheralConnect', mock.nativePeripheralObject, a.mockError);

    eventSpy.calledWithExactly(a.peripheralUuidString, a.mockError).should.equal(true);
  });

  it('should emit connect on fail', function() {
    var eventSpy = sandbox.spy();
    bindings.once('connect', eventSpy);

    mock.mockCentral.emit('peripheralConnectFail', mock.nativePeripheralObject, a.mockError);

    eventSpy.calledWithExactly(a.peripheralUuidString, a.mockError).should.equal(true);
  });

  it('should emit disconnect', function() {
    var eventSpy = sandbox.spy();
    bindings.once('disconnect', eventSpy);

    //stub native
    sandbox.stub(mock.nativePeripheralObject, "cancelConnection", function(){
      mock.mockCentral
      .emit('peripheralDisconnect', mock.nativePeripheralObject);
    });

    //set internal state
    mock.discoverPeripheral();
    mock.discoverServices();
    mock.discoverCharacteristics();
    mock.discoverDescriptors();

    //make the call
    bindings.disconnect(a.peripheralUuidString);

    eventSpy.calledWithExactly(a.peripheralUuidString).should.equal(true);
  });


});
