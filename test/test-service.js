var should = require('should');
var sinon = require('sinon');

var Service = require('../lib/service');

describe('service', function() {
  var mockNoble = null;
  var mockPeripheralId = 'mock-peripheral-id';
  var mockUuid = 'mock-uuid';

  var service = null;

  beforeEach(function() {
    mockNoble = {
      discoverIncludedServices: sinon.spy(),
      discoverCharacteristics: sinon.spy()
    };

    service = new Service(mockNoble, mockPeripheralId, mockUuid);
  });

  afterEach(function() {
    service = null;
  });

  it('should have a uuid', function() {
    service.uuid.should.equal(mockUuid);
  });

  it('should lookup name and type by uuid', function() {
    service = new Service(mockNoble, mockPeripheralId, '1800');

    service.name.should.equal('Generic Access');
    service.type.should.equal('org.bluetooth.service.generic_access');
  });

  describe('toString', function() {
    it('should be uuid, name, type, includedServiceUuids', function() {
      service.toString().should.equal('{"uuid":"mock-uuid","name":null,"type":null,"includedServiceUuids":null}');
    });
  });

  describe('discoverIncludedServices', function() {
    it('should delegate to noble', function() {
      service.discoverIncludedServices();

      mockNoble.discoverIncludedServices.calledWithExactly(mockPeripheralId, mockUuid, undefined).should.equal(true);
    });

    it('should delegate to noble, with uuids', function() {
      var mockUuids = [];

      service.discoverIncludedServices(mockUuids);

      mockNoble.discoverIncludedServices.calledWithExactly(mockPeripheralId, mockUuid, mockUuids).should.equal(true);
    });

    it('should callback', function(done) {
      service.discoverIncludedServices(null, function() {
        done();
      });
      service.emit('includedServicesDiscover');
    });

    it('should callback with data', function(done) {
      const mockIncludedServiceUuids = [];
      service.discoverIncludedServices(null, function(error, includedServiceUuids) {
        includedServiceUuids.should.equal(mockIncludedServiceUuids);
        done();
      });
      service.emit('includedServicesDiscover', mockIncludedServiceUuids);
    });

    it('should return a promise', function(done) {
      const mockIncludedServiceUuids = [];
      service.discoverIncludedServices(null).then(function(includedServiceUuids) {
        includedServiceUuids.should.equal(mockIncludedServiceUuids);
        done();
      });
      service.emit('includedServicesDiscover', mockIncludedServiceUuids);
    });
  });

  describe('discoverCharacteristics', function() {
    it('should delegate to noble', function() {
      service.discoverCharacteristics();

      mockNoble.discoverCharacteristics.calledWithExactly(mockPeripheralId, mockUuid, undefined).should.equal(true);
    });

    it('should delegate to noble, with uuids', function() {
      const mockUuids = [];

      service.discoverCharacteristics(mockUuids);

      mockNoble.discoverCharacteristics.calledWithExactly(mockPeripheralId, mockUuid, mockUuids).should.equal(true);
    });

    it('should callback', function(done) {
      service.discoverCharacteristics(null, function() {
        done();
      });
      service.emit('characteristicsDiscover');
    });

    it('should callback with data', function(done) {
      const mockCharacteristics = [];

      service.discoverCharacteristics(null, function(error, mockCharacteristics) {
        mockCharacteristics.should.equal(mockCharacteristics);
        done();
      });
      service.emit('characteristicsDiscover', mockCharacteristics);
    });

    it('should return a promise', function(done) {
      const mockCharacteristics = [];

      service.discoverCharacteristics(null).then(function(mockCharacteristics) {
        mockCharacteristics.should.equal(mockCharacteristics);
        done();
      });
      service.emit('characteristicsDiscover', mockCharacteristics);
    });
  });
});
