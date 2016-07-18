var should = require('should');
var sinon = require('sinon');
var bindings = require('../lib/mac/bindings');
var Mock = require('./core-bluetooth-mock');

describe('Noble bindings', function() {
  var sandbox;
  var mockNative;
  var nativePeripheralObject;
  var nativeServiceObject;
  var nativeIncludedServiceObject;
  var nativeCharacteristicObject;
  var nativeDescriptorObject;
  var bindingsPeripheralObject;
  var bindingsCharacteristicObject;

  var nativePeripheralUuidString = 'DFE12BB4-4E7F-460D-8C1D-112914E21D9E';
  var nativeServiceUuidString = 'A90F0252-4CA8-48BB-AE90-6BC8F541CF8C';
  var nativeIncludedServiceUuidString = '2D0F40D7-6C81-4336-A1AA-60CBD111317E';
  var nativeCharacteristicUuidString = 'E365F8C8-A49D-4B30-8547-FCC791860697';
  var nativeDescriptorUuidString = '7DE1AEC6-D5FB-433B-A3D0-77B4E4845CA4';

  var peripheralUuidString = 'dfe12bb44e7f460d8c1d112914e21d9e';
  var serviceUuidString = 'a90f02524ca848bbae906bc8f541cf8c';
  var includedServiceUuidString = '2d0f40d76c814336a1aa60cbd111317e';
  var characteristicUuidString = 'e365f8c8a49d4b308547fcc791860697';
  var descriptorUuidString = '7de1aec6d5fb433ba3d077b4e4845ca4';

  var serviceUuidsArray = [serviceUuidString];

  var addressString = 'd0:03:4b:31:75:f2';
  var addressTypeString = 'unknown';
  var connectableBoolean = true;
  var notifyBoolean = false;
  var rssiNumber = -47;
  var stateString = 'public';
  var mockError = new Error('mock-error');
  var localNameString = 'mock-name';
  var mockServiceData = {};
  var txPowerLevelNumber = 0;
  var dataBuffer = new Buffer([0x02, 0x01, 0x00]);

  var nativeAdvertisementObject = { connectable: connectableBoolean,
                                    localName: localNameString,
                                    txPowerLevel: txPowerLevelNumber,
                                    manufacturerData: dataBuffer,
                                    serviceData: mockServiceData,
                                    serviceUuids: serviceUuidsArray };

  var advertisementObject = { localName: localNameString,
                              txPowerLevel: txPowerLevelNumber,
                              manufacturerData: dataBuffer,
                              serviceData: mockServiceData,
                              serviceUuids: serviceUuidsArray };

  beforeEach(function() {

    sandbox = sinon.sandbox.create();

    mockNative = new Mock.NativeCentral();
    bindings.init(mockNative);

    nativePeripheralObject = new Mock.NativePeripheral();
    nativePeripheralObject.identifier = nativePeripheralUuidString;
    nativePeripheralObject.address = addressString;
    nativePeripheralObject.services = [];

    bindingsPeripheralObject = {  peripheral: nativePeripheralObject,
                                      identifier: peripheralUuidString,
                                      address: addressString,
                                      connectable: connectableBoolean,
                                      advertisement: advertisementObject,
                                      rssi: rssiNumber };

    bindingsCharacteristicObject = {  uuid: characteristicUuidString,
                                      properties: [] };

    nativeServiceObject = new Mock.NativeService();
    nativeServiceObject.uuid = nativeServiceUuidString;

    nativeIncludedServiceObject = new Mock.NativeService();
    nativeIncludedServiceObject.uuid = nativeIncludedServiceUuidString;

    nativeCharacteristicObject = new Mock.NativeCharacteristic();
    nativeCharacteristicObject.uuid = nativeCharacteristicUuidString;
    nativeCharacteristicObject.properties = [];

    nativeDescriptorObject = new Mock.NativeDescriptor();
    nativeDescriptorObject.uuid = nativeDescriptorUuidString;
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('startScanning should call native', function() {
    var calledSpy = sandbox.spy(mockNative, 'scanForPeripherals');
    var allowDuplicates = true;

    bindings.startScanning(serviceUuidsArray, allowDuplicates);

    calledSpy.calledWithExactly(serviceUuidsArray, allowDuplicates).should.equal(true);
  });

  it('startScanning should emit scanStart', function() {
    var eventSpy = sandbox.spy();
    bindings.on('scanStart', eventSpy);

    bindings.startScanning();

    eventSpy.called.should.equal(true);
  });

  it('stopScanning should call native', function() {
    var calledSpy = sandbox.spy(mockNative, 'stopScan');

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

    mockNative.emit('address', addressString);

    eventSpy.calledWithExactly(addressString).should.equal(true);
  });


  it('should emit stateChange', function() {
    var eventSpy = sandbox.spy();
    bindings.once('stateChange', eventSpy);

    mockNative.emit('stateUpdate', stateString);

    eventSpy.calledWithExactly(stateString).should.equal(true);
  });

  it('should emit discover', function() {
    var eventSpy = sandbox.spy();
    bindings.once('discover', eventSpy);

    bindings._onPeripheralDiscover(nativePeripheralObject, nativeAdvertisementObject, rssiNumber);

    eventSpy.calledWithExactly(peripheralUuidString, addressString, addressTypeString, connectableBoolean, advertisementObject, rssiNumber).should.equal(true);
  });

  it('should emit connect on success', function() {
    var eventSpy = sandbox.spy();
    bindings.once('connect', eventSpy);

    mockNative.emit('peripheralConnect', nativePeripheralObject, mockError);

    eventSpy.calledWithExactly(peripheralUuidString, mockError).should.equal(true);
  });

  it('should emit connect on fail', function() {
    var eventSpy = sandbox.spy();
    bindings.once('connect', eventSpy);

    mockNative.emit('peripheralConnectFail', nativePeripheralObject, mockError);

    eventSpy.calledWithExactly(peripheralUuidString, mockError).should.equal(true);
  });

  it('should emit rssiUpdate', function() {
    var eventSpy = sandbox.spy();
    bindings.once('rssiUpdate', eventSpy);

    //stub native
    nativePeripheralObject.readRSSI = function(){
      this.emit('rssiUpdate', rssiNumber, mockError);
    };

    //set internal state
    bindings._peripherals[peripheralUuidString] = bindingsPeripheralObject;

    //make the call
    bindings.updateRssi(peripheralUuidString);

    eventSpy.calledWithExactly(peripheralUuidString, rssiNumber).should.equal(true);
  });

  it('should emit servicesDiscover', function() {
    var eventSpy = sandbox.spy();
    bindings.once('servicesDiscover', eventSpy);

    //stub native
    nativePeripheralObject.discoverServices = function(){
      this.emit('servicesDiscover', [nativeServiceObject], mockError);
    };

    //set internal state
    bindings._peripherals[peripheralUuidString] = bindingsPeripheralObject;

    //make the call
    bindings.discoverServices(peripheralUuidString, serviceUuidsArray);

    eventSpy.calledWithExactly(peripheralUuidString, serviceUuidsArray).should.equal(true);
  });

  it('should emit includedServicesDiscover', function() {
    var eventSpy = sandbox.spy();
    bindings.once('includedServicesDiscover', eventSpy);

    //stub native
    nativeServiceObject.discoverIncludedServices = function(){
      this.emit('includedServicesDiscover', [nativeIncludedServiceObject], mockError);
    };

    //set internal state
    bindings._peripherals[peripheralUuidString] = bindingsPeripheralObject;
    bindings._peripherals[peripheralUuidString]._services = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString] = nativeServiceObject;

    //make the call
    bindings.discoverIncludedServices(peripheralUuidString, serviceUuidString, [nativeIncludedServiceUuidString]);

    eventSpy.calledWithExactly(peripheralUuidString, serviceUuidString, [includedServiceUuidString]).should.equal(true);
  });

  it('should emit characteristicsDiscover', function() {
    var eventSpy = sandbox.spy();
    bindings.once('characteristicsDiscover', eventSpy);

    //stub native
    nativeServiceObject.discoverCharacteristics = function(){
      this.emit('characteristicsDiscover', [nativeCharacteristicObject], mockError);
    };

    //set internal state
    bindings._peripherals[peripheralUuidString] = bindingsPeripheralObject;
    bindings._peripherals[peripheralUuidString]._services = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString] = nativeServiceObject;

    //make the call
    bindings.discoverCharacteristics(peripheralUuidString, serviceUuidString, [characteristicUuidString]);

    eventSpy.calledWithExactly(peripheralUuidString, serviceUuidString, [bindingsCharacteristicObject]).should.equal(true);
  });

  it('should emit read', function() {
    var eventSpy = sandbox.spy();
    bindings.once('read', eventSpy);

    //make the call
    bindings._onPeripheralCharacteristicValueUpdate(peripheralUuidString, serviceUuidString, characteristicUuidString, dataBuffer);

    eventSpy.calledWithExactly(peripheralUuidString, serviceUuidString, characteristicUuidString, dataBuffer).should.equal(true);
  });

  it('should emit write', function() {
    var eventSpy = sandbox.spy();
    bindings.once('write', eventSpy);

    //stub native
    nativeCharacteristicObject.writeValue = function(){};

    //set internal state
    bindings._peripherals[peripheralUuidString] = bindingsPeripheralObject;
    bindings._peripherals[peripheralUuidString]._services = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString] = nativeServiceObject;
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString] = nativeCharacteristicObject;

    //make the call
    bindings.write(peripheralUuidString, serviceUuidString, characteristicUuidString, dataBuffer, true);

    eventSpy.calledWithExactly(peripheralUuidString, serviceUuidString, characteristicUuidString).should.equal(true);
  });

  it('should emit notify', function() {
    var eventSpy = sandbox.spy();
    bindings.once('notify', eventSpy);

    //stub native
    nativeCharacteristicObject.setNotifyValue = function(){
      this.emit('notificationStateUpdate', notifyBoolean, mockError);
    };

    //set internal state
    bindings._peripherals[peripheralUuidString] = bindingsPeripheralObject;
    bindings._peripherals[peripheralUuidString]._services = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString] = nativeServiceObject;
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString] = nativeCharacteristicObject;

    //make the call
    bindings.notify(peripheralUuidString, serviceUuidString, characteristicUuidString, notifyBoolean);

    eventSpy.calledWithExactly(peripheralUuidString, serviceUuidString, characteristicUuidString, notifyBoolean).should.equal(true);
  });

  it('should emit descriptorsDiscover', function() {
    var eventSpy = sandbox.spy();
    bindings.once('descriptorsDiscover', eventSpy);

    //stub native
    nativeCharacteristicObject.discoverDescriptors = function(){
      this.emit('descriptorsDiscover', [nativeDescriptorObject], mockError);
    };

    //set internal state
    bindings._peripherals[peripheralUuidString] = bindingsPeripheralObject;
    bindings._peripherals[peripheralUuidString]._services = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString] = nativeServiceObject;
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString] = nativeCharacteristicObject;

    //make the call
    bindings.discoverDescriptors(peripheralUuidString, serviceUuidString, characteristicUuidString);

    eventSpy.calledWithExactly(peripheralUuidString, serviceUuidString, characteristicUuidString, [descriptorUuidString]).should.equal(true);
  });

  it('should emit valueRead', function() {
    var eventSpy = sandbox.spy();
    bindings.once('valueRead', eventSpy);

    nativeDescriptorObject.readValue = function() {
      this.emit('valueUpdate', dataBuffer, mockError);
    };

    //set internal state
    bindings._peripherals[peripheralUuidString] = bindingsPeripheralObject;
    bindings._peripherals[peripheralUuidString]._services = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString] = nativeServiceObject;
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString] = nativeCharacteristicObject;
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString]._descriptors = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString]._descriptors[descriptorUuidString] = nativeDescriptorObject;

    //make the call
    bindings.readValue(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString);

    eventSpy.calledWithExactly(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString, dataBuffer).should.equal(true);
  });

  it('should emit valueWrite', function() {
    var eventSpy = sandbox.spy();
    bindings.once('valueWrite', eventSpy);

    nativeDescriptorObject.writeValue = function() {
      this.emit('valueWrite', mockError);
    };

    //set internal state
    bindings._peripherals[peripheralUuidString] = bindingsPeripheralObject;
    bindings._peripherals[peripheralUuidString]._services = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString] = nativeServiceObject;
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString] = nativeCharacteristicObject;
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString]._descriptors = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString]._descriptors[descriptorUuidString] = nativeDescriptorObject;

    //make the call
    bindings.writeValue(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString, dataBuffer);

    eventSpy.calledWithExactly(peripheralUuidString, serviceUuidString, characteristicUuidString, descriptorUuidString).should.equal(true);
  });

  it('should emit disconnect', function() {
    var eventSpy = sandbox.spy();
    bindings.once('disconnect', eventSpy);

    nativePeripheralObject.cancelConnection = function(){
      mockNative.emit('peripheralDisconnect', nativePeripheralObject);
    };

    //set internal state
    bindings._peripherals[peripheralUuidString] = bindingsPeripheralObject;
    bindings._peripherals[peripheralUuidString]._services = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString] = nativeServiceObject;
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString] = nativeCharacteristicObject;
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString]._descriptors = [];
    bindings._peripherals[peripheralUuidString]._services[serviceUuidString]._characteristics[characteristicUuidString]._descriptors[descriptorUuidString] = nativeDescriptorObject;

    //make the call
    bindings.disconnect(peripheralUuidString);

    eventSpy.calledWithExactly(peripheralUuidString).should.equal(true);
  });

});
