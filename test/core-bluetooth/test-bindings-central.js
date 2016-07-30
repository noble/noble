
var should = require('should');
var sinon = require('sinon');
var bindings = require('../../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');

var a = require('../abstract/common');

var Abstract = require('../abstract/test-bindings-abstract');


//native doesnt need to do any setup on these
Abstract.startScanningEmitScanStart(bindings, Mock);
Abstract.stopScanningEmitScanStop(bindings, Mock);

//we need to stub/emit something for these
Abstract.emitAddressChange(bindings, Mock, function(mock)
{
  mock.mockCentral.emit('address', a.addressString);
});

Abstract.emitStateChange(bindings, Mock, function(mock){
  mock.mockCentral.emit('stateUpdate', a.stateString);
});

Abstract.emitDiscover(bindings, Mock, function(mock){
  mock.mockCentral.emit('peripheralDiscover', mock.nativePeripheralObject, mock.nativeAdvertisementObject, a.rssiNumber);
});

Abstract.emitConnectSuccess(bindings, Mock, function(mock){
  mock.mockCentral.emit('peripheralConnect', mock.nativePeripheralObject, a.mockError);
});

Abstract.emitConnectFail(bindings, Mock, function(mock){
  mock.mockCentral.emit('peripheralConnectFail', mock.nativePeripheralObject, a.mockError);
});

Abstract.emitDisconnect(bindings, Mock, function(mock, sandbox){

  sandbox.stub(mock.nativePeripheralObject, "cancelConnection", function(){
    mock.mockCentral
    .emit('peripheralDisconnect', mock.nativePeripheralObject);
  });

  //set internal state
  mock.discoverPeripheral();
  mock.discoverServices();
  mock.discoverCharacteristics();
  mock.discoverDescriptors();

});
 
//these tests are local to the core-bluetooth binding
describe('Core Bluetooth Bindings Central', function() {
  var sandbox = sinon.sandbox.create();
  var mock;

  beforeEach(function() {
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

  it('stopScanning should call native', function() {
    var calledSpy = sandbox.spy(mock.mockCentral, 'stopScan');

    bindings.stopScanning();

    calledSpy.called.should.equal(true);
  });
});
