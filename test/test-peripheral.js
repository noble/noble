var should = require('should');
var sinon = require('sinon');

var Peripheral = require('../lib/peripheral');

describe('Peripheral', function() {
  var mockNoble = null;
  var mockId = 'mock-id';
  var mockAddress = 'mock-address';
  var mockAddressType = 'mock-address-type';
  var mockConnectable = 'mock-connectable';
  var mockAdvertisement = 'mock-advertisement';
  var mockRssi = 'mock-rssi';
  var mockHandle = 'mock-handle';
  var mockData = 'mock-data';

  var peripheral = null;

  beforeEach(function() {
    mockNoble = {
      connect: sinon.spy(),
      disconnect: sinon.spy(),
      updateRssi: sinon.spy(),
      discoverServices: sinon.spy(),
      readHandle: sinon.spy(),
      writeHandle: sinon.spy()
    };

    peripheral = new Peripheral(mockNoble, mockId, mockAddress, mockAddressType, mockConnectable, mockAdvertisement, mockRssi);
  });

  afterEach(function() {
    peripheral = null;
  });

  it('should have a id', function() {
    peripheral.id.should.equal(mockId);
  });

  it('should have an address', function() {
    peripheral.address.should.equal(mockAddress);
  });

  it('should have an address type', function() {
    peripheral.addressType.should.equal(mockAddressType);
  });

  it('should have connectable', function() {
    peripheral.connectable.should.equal(mockConnectable);
  });

  it('should have advertisement', function() {
    peripheral.advertisement.should.equal(mockAdvertisement);
  });

  it('should have rssi', function() {
    peripheral.rssi.should.equal(mockRssi);
  });

  describe('toString', function() {
    it('should be id, address, address type, connectable, advertisement, rssi, state', function() {
      peripheral.toString().should.equal('{"id":"mock-id","address":"mock-address","addressType":"mock-address-type","connectable":"mock-connectable","advertisement":"mock-advertisement","rssi":"mock-rssi","state":"disconnected"}');
    });
  });

  describe('connect', function() {
    it('should delegate to noble', function() {
      peripheral.connect();

      mockNoble.connect.calledWithExactly(mockId).should.equal(true);
    });

    it('should callback', function() {
      var calledback = false;

      peripheral.connect(function() {
        calledback = true;
      });
      peripheral.emit('connect');

      calledback.should.equal(true);
    });
  });

  describe('disconnect', function() {
    it('should delegate to noble', function() {
      peripheral.disconnect();

      mockNoble.disconnect.calledWithExactly(mockId).should.equal(true);
    });

    it('should callback', function() {
      var calledback = false;

      peripheral.disconnect(function() {
        calledback = true;
      });
      peripheral.emit('disconnect');

      calledback.should.equal(true);
    });
  });

  describe('updateRssi', function() {
    it('should delegate to noble', function() {
      peripheral.updateRssi();

      mockNoble.updateRssi.calledWithExactly(mockId).should.equal(true);
    });

    it('should callback', function() {
      var calledback = false;

      peripheral.updateRssi(function() {
        calledback = true;
      });
      peripheral.emit('rssiUpdate');

      calledback.should.equal(true);
    });

    it('should callback with rssi', function() {
      var calledbackRssi = null;

      peripheral.updateRssi(function(error, rssi) {
        calledbackRssi = rssi;
      });
      peripheral.emit('rssiUpdate', mockRssi);

      calledbackRssi.should.equal(mockRssi);
    });
  });

  describe('discoverServices', function() {
    it('should delegate to noble', function() {
      peripheral.discoverServices();

      mockNoble.discoverServices.calledWithExactly(mockId, undefined).should.equal(true);
    });

    it('should delegate to noble, service uuids', function() {
      var mockServiceUuids = [];

      peripheral.discoverServices(mockServiceUuids);

      mockNoble.discoverServices.calledWithExactly(mockId, mockServiceUuids).should.equal(true);
    });

    it('should callback', function() {
      var calledback = false;

      peripheral.discoverServices(null, function() {
        calledback = true;
      });
      peripheral.emit('servicesDiscover');

      calledback.should.equal(true);
    });

    it('should callback with services', function() {
      var mockServices = [];
      var calledbackServices = null;

      peripheral.discoverServices(null, function(error, services) {
        calledbackServices = services;
      });
      peripheral.emit('servicesDiscover', mockServices);

      calledbackServices.should.equal(mockServices);
    });
  });

  describe('discoverSomeServicesAndCharacteristics', function() {
    var mockServiceUuids = [];
    var mockCharacteristicUuids = [];
    var mockServices = null;

    beforeEach(function() {
      peripheral.discoverServices = sinon.spy();

      mockServices = [
        {
          uuid: '1',
          discoverCharacteristics: sinon.spy()
        },
        {
          uuid: '2',
          discoverCharacteristics: sinon.spy()
        }
      ];
    });

    it('should call discoverServices', function() {
      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids);

      peripheral.discoverServices.calledWith(mockServiceUuids).should.equal(true);
    });

    it('should call discoverCharacteristics on each service discovered', function() {
      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids, mockCharacteristicUuids);

      var discoverServicesCallback = peripheral.discoverServices.getCall(0).args[1];

      discoverServicesCallback(null, mockServices);

      mockServices[0].discoverCharacteristics.calledWith(mockCharacteristicUuids).should.equal(true);
      mockServices[1].discoverCharacteristics.calledWith(mockCharacteristicUuids).should.equal(true);
    });

    it('should callback', function() {
      var calledback = false;


      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids, mockCharacteristicUuids, function() {
        calledback = true;
      });

      var discoverServicesCallback = peripheral.discoverServices.getCall(0).args[1];

      discoverServicesCallback(null, mockServices);

      mockServices[0].discoverCharacteristics.getCall(0).args[1](null, []);
      mockServices[1].discoverCharacteristics.getCall(0).args[1](null, []);

      calledback.should.equal(true);
    });

    it('should callback with the services and characteristics discovered', function() {
      var calledbackServices = null;
      var calledbackCharacteristics = null;

      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids, mockCharacteristicUuids, function(err, services, characteristics) {
        calledbackServices = services;
        calledbackCharacteristics = characteristics;
      });

      var discoverServicesCallback = peripheral.discoverServices.getCall(0).args[1];

      discoverServicesCallback(null, mockServices);

      var mockCharacteristic1 = { uuid: '1' };
      var mockCharacteristic2 = { uuid: '2' };
      var mockCharacteristic3 = { uuid: '3' };

      mockServices[0].discoverCharacteristics.getCall(0).args[1](null, [mockCharacteristic1]);
      mockServices[1].discoverCharacteristics.getCall(0).args[1](null, [mockCharacteristic2, mockCharacteristic3]);

      calledbackServices.should.equal(mockServices);
      calledbackCharacteristics.should.eql([mockCharacteristic1, mockCharacteristic2, mockCharacteristic3]);
    });
  });

  describe('discoverAllServicesAndCharacteristics', function() {
    it('should call discoverSomeServicesAndCharacteristics', function() {
      var mockCallback = sinon.spy();

      peripheral.discoverSomeServicesAndCharacteristics = sinon.spy();

      peripheral.discoverAllServicesAndCharacteristics(mockCallback);

      peripheral.discoverSomeServicesAndCharacteristics.calledWithExactly([], [], mockCallback).should.equal(true);
    });
  });

  describe('readHandle', function() {
    it('should delegate to noble', function() {
      peripheral.readHandle(mockHandle);

      mockNoble.readHandle.calledWithExactly(mockId, mockHandle).should.equal(true);
    });

    it('should callback', function() {
      var calledback = false;

      peripheral.readHandle(mockHandle, function() {
        calledback = true;
      });
      peripheral.emit('handleRead' + mockHandle);

      calledback.should.equal(true);
    });

    it('should callback with data', function() {
      var calledbackData = null;

      peripheral.readHandle(mockHandle, function(error, data) {
        calledbackData = data;
      });
      peripheral.emit('handleRead' + mockHandle, mockData);

      calledbackData.should.equal(mockData);
    });
  });

  describe('writeHandle', function() {
    beforeEach(function() {
      mockData = new Buffer(0);
    });

    it('should only accept data as a buffer', function() {
      mockData = {};

      (function(){
        peripheral.writeHandle(mockHandle, mockData);
      }).should.throwError('data must be a Buffer');
    });

    it('should delegate to noble, withoutResponse false', function() {
      peripheral.writeHandle(mockHandle, mockData, false);

      mockNoble.writeHandle.calledWithExactly(mockId, mockHandle, mockData, false).should.equal(true);
    });

    it('should delegate to noble, withoutResponse true', function() {
      peripheral.writeHandle(mockHandle, mockData, true);

      mockNoble.writeHandle.calledWithExactly(mockId, mockHandle, mockData, true).should.equal(true);
    });

    it('should callback', function() {
      var calledback = false;

      peripheral.writeHandle(mockHandle, mockData, false, function() {
        calledback = true;
      });
      peripheral.emit('handleWrite' + mockHandle);

      calledback.should.equal(true);
    });
  });
});