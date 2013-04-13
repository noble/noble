var should = require('should');
var sinon = require('sinon');

var Peripheral = require('../lib/peripheral');

describe('Peripheral', function() {
  var mockNoble = null;
  var mockUuid = 'mock-uuid';
  var mockAdvertisement = 'mock-advertisement';
  var mockRssi = 'mock-rssi';

  var peripheral = null;

  beforeEach(function() {
    mockNoble = {
      connect: sinon.spy(),
      disconnect: sinon.spy(),
      updateRssi: sinon.spy(),
      discoverServices: sinon.spy()
    };

    peripheral = new Peripheral(mockNoble, mockUuid, mockAdvertisement, mockRssi);
  });

  afterEach(function() {
    peripheral = null;
  });

  it('should have a uuid', function() {
    peripheral.uuid.should.equal(mockUuid);
  });

  it('should have advertisement', function() {
    peripheral.advertisement.should.equal(mockAdvertisement);
  });

  it('should have rssi', function() {
    peripheral.rssi.should.equal(mockRssi);
  });

  describe('toString', function() {
    it('should be uuid, name, type', function() {
      peripheral.toString().should.equal('{"uuid":"mock-uuid","advertisement":"mock-advertisement","rssi":"mock-rssi"}');
    });
  });

  describe('connect', function() {
    it('should delegate to noble', function() {
      peripheral.connect();

      mockNoble.connect.calledWithExactly(mockUuid).should.equal(true);
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

      mockNoble.disconnect.calledWithExactly(mockUuid).should.equal(true);
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

      mockNoble.updateRssi.calledWithExactly(mockUuid).should.equal(true);
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

      mockNoble.discoverServices.calledWithExactly(mockUuid, undefined).should.equal(true);
    });

    it('should delegate to noble, service uuids', function() {
      var mockServiceUuids = [];

      peripheral.discoverServices(mockServiceUuids);

      mockNoble.discoverServices.calledWithExactly(mockUuid, mockServiceUuids).should.equal(true);
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
});