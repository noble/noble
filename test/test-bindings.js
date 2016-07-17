var should = require('should');
var sinon = require('sinon');
var bindings = require('../lib/mac/bindings');
var events = require('events');
var util = require('util');

describe('Noble bindings', function() {
  var sandbox;
  var mockNative;

  var mockId = '5F2E8E51-ADDA-4087-B203-93CF22F6E0AA';
  var transformedMockId = '5f2e8e51adda4087b20393cf22f6e0aa';
  var mockAddress = 'd0:03:4b:31:75:f2';
  var mockAddressType = 'unknown';
  var mockConnectable = true;
  var mockRssi = 'mock-rssi';
  var mockState = 'mock-state';
  var mockError = 'mock-error';
  var mockServiceUuid = 'AA00';
  var transformedMockServiceUuid = 'aa00';
  var mockServiceUuids = [mockServiceUuid];
  var transformedMockServiceUuids = [transformedMockServiceUuid];
  var mockName = 'mock-name';
  var mockServiceData = {};
  var mockPowerLevel = 'mock-power-level';
  var mockManufacturerData = 'mock-manufacturer-data';

  var mockPeripheral = {  identifier: mockId,
                          address: mockAddress,
                          services: []};

  var mockAdvertisement = { connectable: mockConnectable,
                            localName: mockName,
                            txPowerLevel: mockPowerLevel,
                            manufacturerData: mockManufacturerData,
                            serviceData: mockServiceData,
                            serviceUuids: mockServiceUuids };

  var transformedMockAdvertisement = {
                            localName: mockName,
                            txPowerLevel: mockPowerLevel,
                            manufacturerData: mockManufacturerData,
                            serviceData: mockServiceData,
                            serviceUuids: transformedMockServiceUuids };

  beforeEach(function() {

    sandbox = sinon.sandbox.create();

    function MockNative() {}
    util.inherits(MockNative, events.EventEmitter);

    mockNative = new MockNative();
    mockNative.scanForPeripherals = function(){};
    mockNative.stopScan = function(){};

    bindings.init(mockNative);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('startScanning should call native', function() {
    var calledSpy = sandbox.spy(mockNative, 'scanForPeripherals');
    var allowDuplicates = true;

    bindings.startScanning(mockServiceUuids, allowDuplicates);

    calledSpy.calledWithExactly(mockServiceUuids, allowDuplicates).should.equal(true);
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
    mockNative.emit('address', mockAddress);

    eventSpy.calledWithExactly(mockAddress).should.equal(true);
  });


  it('should emit stateChange', function() {
    var eventSpy = sandbox.spy();

    bindings.once('stateChange', eventSpy);
    mockNative.emit('stateUpdate', mockState);

    eventSpy.calledWithExactly(mockState).should.equal(true);
  });

  it('should emit discover', function() {
    var eventSpy = sandbox.spy();

    bindings.once('discover', eventSpy);
    mockNative.emit('peripheralDiscover', mockPeripheral, mockAdvertisement, mockRssi);

    eventSpy.calledWithExactly(transformedMockId, mockAddress, mockAddressType, mockConnectable, transformedMockAdvertisement, mockRssi).should.equal(true);
  });

  it('should emit connect on success', function() {
    var eventSpy = sandbox.spy();

    bindings.once('connect', eventSpy);
    mockNative.emit('peripheralConnect', mockPeripheral, mockError);

    eventSpy.calledWithExactly(transformedMockId, mockError).should.equal(true);
  });

  it('should emit connect on fail', function() {
    var eventSpy = sandbox.spy();

    bindings.once('connect', eventSpy);
    mockNative.emit('peripheralConnectFail', mockPeripheral, mockError);

    eventSpy.calledWithExactly(transformedMockId, mockError).should.equal(true);
  });

  it('should emit disconnect', function() {
    var eventSpy = sandbox.spy();

    bindings.once('disconnect', eventSpy);
    mockNative.emit('peripheralDisconnect', mockPeripheral);

    eventSpy.calledWithExactly(transformedMockId).should.equal(true);
  });

});
