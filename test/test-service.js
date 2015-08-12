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

    it('should callback', function() {
      var calledback = false;

      service.discoverIncludedServices(null, function() {
        calledback = true;
      });
      service.emit('includedServicesDiscover');

      calledback.should.equal(true);
    });

    it('should callback with data', function() {
      var mockIncludedServiceUuids = [];
      var callbackIncludedServiceUuids = null;

      service.discoverIncludedServices(null, function(error, includedServiceUuids) {
        callbackIncludedServiceUuids = includedServiceUuids;
      });
      service.emit('includedServicesDiscover', mockIncludedServiceUuids);

      callbackIncludedServiceUuids.should.equal(mockIncludedServiceUuids);
    });
  });

  describe('discoverCharacteristics', function() {
    it('should delegate to noble', function() {
      service.discoverCharacteristics();

      mockNoble.discoverCharacteristics.calledWithExactly(mockPeripheralId, mockUuid, undefined).should.equal(true);
    });

    it('should delegate to noble, with uuids', function() {
      var mockUuids = [];

      service.discoverCharacteristics(mockUuids);

      mockNoble.discoverCharacteristics.calledWithExactly(mockPeripheralId, mockUuid, mockUuids).should.equal(true);
    });

    it('should callback', function() {
      var calledback = false;

      service.discoverCharacteristics(null, function() {
        calledback = true;
      });
      service.emit('characteristicsDiscover');

      calledback.should.equal(true);
    });

    it('should callback with data', function() {
      var mockCharacteristics = [];
      var callbackCharacteristics = null;

      service.discoverCharacteristics(null, function(error, mockCharacteristics) {
        callbackCharacteristics = mockCharacteristics;
      });
      service.emit('characteristicsDiscover', mockCharacteristics);

      callbackCharacteristics.should.equal(mockCharacteristics);
    });
  });
});