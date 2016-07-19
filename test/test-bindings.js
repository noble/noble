var should = require('should');
var sinon = require('sinon');
var bindings = require('../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');

var a = require('./common');



describe('Noble bindings', function() {
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
    var allowDuplicates = true;

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

  it('should emit rssiUpdate', function() {
    var eventSpy = sandbox.spy();
    bindings.once('rssiUpdate', eventSpy);

    //stub native
    mock.nativePeripheralObject.readRSSI = function(){
      this.emit('rssiUpdate', a.rssiNumber, a.mockError);
    };

    //set internal state
    mock.discoverPeripheral();

    //make the call
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

    //set internal state
    mock.discoverPeripheral();

    //make the call
    bindings.discoverServices(a.peripheralUuidString, a.serviceUuidsArray);

    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidsArray).should.equal(true);
  });

  it('should emit includedServicesDiscover', function() {
    var eventSpy = sandbox.spy();
    bindings.once('includedServicesDiscover', eventSpy);

    //stub native
    sandbox.stub(mock.nativeServiceObject, "discoverIncludedServices", function(){
      this.emit('includedServicesDiscover', [mock.nativeIncludedServiceObject], a.mockError);
    });

    //set internal state
    mock.discoverPeripheral();
    mock.discoverServices();

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

    //set internal state
    mock.discoverPeripheral();
    mock.discoverServices();

    //make the call
    bindings.discoverCharacteristics(a.peripheralUuidString, a.serviceUuidString, [a.characteristicUuidString]);

    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, [a.bindingsCharacteristicObject]).should.equal(true);
  });

  it('should emit read', function() {
    var eventSpy = sandbox.spy();
    bindings.once('read', eventSpy);

    //stub native
    sandbox.stub(mock.nativeCharacteristicObject, "readValue", function(){
      this.emit('valueUpdate', a.dataBuffer);
    });

    //set internal state
    mock.discoverPeripheral();
    mock.discoverServices();
    mock.discoverCharacteristics();

    //make the call
    bindings.read(a.peripheralUuidString, a.serviceUuidString,a. characteristicUuidString);

    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.dataBuffer).should.equal(true);
  });

  it('should emit write', function() {
    var eventSpy = sandbox.spy();
    bindings.once('write', eventSpy);

    //set internal state
    mock.discoverPeripheral();
    mock.discoverServices();
    mock.discoverCharacteristics();

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

    //set internal state
    mock.discoverPeripheral();
    mock.discoverServices();
    mock.discoverCharacteristics();

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

    //set internal state
    mock.discoverPeripheral();
    mock.discoverServices();
    mock.discoverCharacteristics();

    //make the call
    bindings.discoverDescriptors(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString);

    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, [a.descriptorUuidString]).should.equal(true);
  });

  it('should emit valueRead', function() {
    var eventSpy = sandbox.spy();
    bindings.once('valueRead', eventSpy);

    //stub native
    sandbox.stub(mock.nativeDescriptorObject, "readValue", function(){
      this.emit('valueUpdate', a.dataBuffer, a.mockError);
    });

    //set internal state
    mock.discoverPeripheral();
    mock.discoverServices();
    mock.discoverCharacteristics();
    mock.discoverDescriptors();

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

    //set internal state
    mock.discoverPeripheral();
    mock.discoverServices();
    mock.discoverCharacteristics();
    mock.discoverDescriptors();

    //make the call
    bindings.writeValue(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.descriptorUuidString, a.dataBuffer);

    eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.descriptorUuidString).should.equal(true);
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
