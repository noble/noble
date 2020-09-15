require('should');
const sinon = require('sinon');

const Service = require('../lib/service');

describe('service', function () {
  let mockNoble = null;
  const mockPeripheralId = 'mock-peripheral-id';
  const mockUuid = 'mock-uuid';

  let service = null;

  beforeEach(function () {
    mockNoble = {
      discoverIncludedServices: sinon.spy(),
      discoverCharacteristics: sinon.spy()
    };

    service = new Service(mockNoble, mockPeripheralId, mockUuid);
  });

  afterEach(function () {
    service = null;
  });

  it('should have a uuid', function () {
    service.uuid.should.equal(mockUuid);
  });

  it('should lookup name and type by uuid', function () {
    service = new Service(mockNoble, mockPeripheralId, '1800');

    service.name.should.equal('Generic Access');
    service.type.should.equal('org.bluetooth.service.generic_access');
  });

  describe('toString', function () {
    it('should be uuid, name, type, includedServiceUuids', function () {
      service.toString().should.equal('{"uuid":"mock-uuid","name":null,"type":null,"includedServiceUuids":null}');
    });
  });

  describe('discoverIncludedServices', function () {
    it('should delegate to noble', function () {
      service.discoverIncludedServices();

      mockNoble.discoverIncludedServices.calledWithExactly(mockPeripheralId, mockUuid, undefined).should.equal(true);
    });

    it('should delegate to noble, with uuids', function () {
      const mockUuids = [];

      service.discoverIncludedServices(mockUuids);

      mockNoble.discoverIncludedServices.calledWithExactly(mockPeripheralId, mockUuid, mockUuids).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      service.discoverIncludedServices(null, function () {
        calledback = true;
      });
      service.emit('includedServicesDiscover');

      calledback.should.equal(true);
    });

    it('should callback with data', function () {
      const mockIncludedServiceUuids = [];
      let callbackIncludedServiceUuids = null;

      service.discoverIncludedServices(null, function (error, includedServiceUuids) {
        if (error) {
          throw new Error(error);
        }
        callbackIncludedServiceUuids = includedServiceUuids;
      });
      service.emit('includedServicesDiscover', mockIncludedServiceUuids);

      callbackIncludedServiceUuids.should.equal(mockIncludedServiceUuids);
    });
  });

  describe('discoverIncludedServicesAsync', function () {
    it('should delegate to noble', async () => {
      const promise = service.discoverIncludedServicesAsync();
      service.emit('includedServicesDiscover');
      await promise;

      mockNoble.discoverIncludedServices.calledWithExactly(mockPeripheralId, mockUuid, undefined).should.equal(true);
    });

    it('should delegate to noble, with uuids', async () => {
      const mockUuids = [];
      const promise = service.discoverIncludedServicesAsync(mockUuids);
      service.emit('includedServicesDiscover');
      await promise;

      mockNoble.discoverIncludedServices.calledWithExactly(mockPeripheralId, mockUuid, mockUuids).should.equal(true);
    });

    it('should resolve with data', async () => {
      const mockIncludedServiceUuids = [];

      const promise = service.discoverIncludedServicesAsync();
      service.emit('includedServicesDiscover', mockIncludedServiceUuids);
      const result = await promise;

      result.should.equal(mockIncludedServiceUuids);
    });
  });

  describe('discoverCharacteristics', function () {
    it('should delegate to noble', function () {
      service.discoverCharacteristics();

      mockNoble.discoverCharacteristics.calledWithExactly(mockPeripheralId, mockUuid, undefined).should.equal(true);
    });

    it('should delegate to noble, with uuids', function () {
      const mockUuids = [];

      service.discoverCharacteristics(mockUuids);

      mockNoble.discoverCharacteristics.calledWithExactly(mockPeripheralId, mockUuid, mockUuids).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      service.discoverCharacteristics(null, function () {
        calledback = true;
      });
      service.emit('characteristicsDiscover');

      calledback.should.equal(true);
    });

    it('should callback with data', function () {
      const mockCharacteristics = [];
      let callbackCharacteristics = null;

      service.discoverCharacteristics(null, function (error, mockCharacteristics) {
        if (error) {
          throw new Error(error);
        }
        callbackCharacteristics = mockCharacteristics;
      });
      service.emit('characteristicsDiscover', mockCharacteristics);

      callbackCharacteristics.should.equal(mockCharacteristics);
    });
  });

  describe('discoverCharacteristicsAsync', () => {
    it('should delegate to noble', async () => {
      const promise = service.discoverCharacteristicsAsync();
      service.emit('characteristicsDiscover');
      await promise;

      mockNoble.discoverCharacteristics.calledWithExactly(mockPeripheralId, mockUuid, undefined).should.equal(true);
    });

    it('should delegate to noble, with uuids', async () => {
      const mockUuids = [];
      const promise = service.discoverCharacteristicsAsync(mockUuids);
      service.emit('characteristicsDiscover');
      await promise;

      mockNoble.discoverCharacteristics.calledWithExactly(mockPeripheralId, mockUuid, mockUuids).should.equal(true);
    });

    it('should resolve with data', async () => {
      const mockCharacteristics = [];

      const promise = service.discoverCharacteristicsAsync();
      service.emit('characteristicsDiscover', mockCharacteristics);
      const result = await promise;

      result.should.equal(mockCharacteristics);
    });
  });
});
