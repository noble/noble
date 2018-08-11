require('should');
const sinon = require('sinon');

const Service = require('../lib/service');

describe('service', () => {
  let mockNoble = null;
  const mockPeripheralId = 'mock-peripheral-id';
  const mockUuid = 'mock-uuid';

  let service = null;

  beforeEach(() => {
    mockNoble = {
      discoverIncludedServices: sinon.spy(),
      discoverCharacteristics: sinon.spy()
    };

    service = new Service(mockNoble, mockPeripheralId, mockUuid);
  });

  afterEach(() => {
    service = null;
  });

  it('should have a uuid', () => {
    service.uuid.should.equal(mockUuid);
  });

  it('should lookup name and type by uuid', () => {
    service = new Service(mockNoble, mockPeripheralId, '1800');

    service.name.should.equal('Generic Access');
    service.type.should.equal('org.bluetooth.service.generic_access');
  });

  describe('toString', () => {
    it('should be uuid, name, type, includedServiceUuids', () => {
      service.toString().should.equal('{"uuid":"mock-uuid","name":null,"type":null,"includedServiceUuids":null}');
    });
  });

  describe('discoverIncludedServices', () => {
    it('should delegate to noble', () => {
      service.discoverIncludedServices();

      mockNoble.discoverIncludedServices.calledWithExactly(mockPeripheralId, mockUuid, undefined).should.equal(true);
    });

    it('should delegate to noble, with uuids', () => {
      const mockUuids = [];

      service.discoverIncludedServices(mockUuids);

      mockNoble.discoverIncludedServices.calledWithExactly(mockPeripheralId, mockUuid, mockUuids).should.equal(true);
    });

    it('should callback', (done) => {
      service.discoverIncludedServices(null, () => {
        done();
      });
      service.emit('includedServicesDiscover');
    });

    it('should callback with data', (done) => {
      const mockIncludedServiceUuids = [];
      service.discoverIncludedServices(null, (error, includedServiceUuids) => {
        includedServiceUuids.should.equal(mockIncludedServiceUuids);
        done();
      });
      service.emit('includedServicesDiscover', mockIncludedServiceUuids);
    });

    it('should return a promise', (done) => {
      const mockIncludedServiceUuids = [];
      service.discoverIncludedServices(null).then((includedServiceUuids) => {
        includedServiceUuids.should.equal(mockIncludedServiceUuids);
        done();
      });
      service.emit('includedServicesDiscover', mockIncludedServiceUuids);
    });
  });

  describe('discoverCharacteristics', () => {
    it('should delegate to noble', () => {
      service.discoverCharacteristics();

      mockNoble.discoverCharacteristics.calledWithExactly(mockPeripheralId, mockUuid, undefined).should.equal(true);
    });

    it('should delegate to noble, with uuids', () => {
      const mockUuids = [];

      service.discoverCharacteristics(mockUuids);

      mockNoble.discoverCharacteristics.calledWithExactly(mockPeripheralId, mockUuid, mockUuids).should.equal(true);
    });

    it('should callback', (done) => {
      service.discoverCharacteristics(null, () => {
        done();
      });
      service.emit('characteristicsDiscover');
    });

    it('should callback with data', (done) => {
      const mockCharacteristics = [];

      service.discoverCharacteristics(null, (error, mockCharacteristics) => {
        mockCharacteristics.should.equal(mockCharacteristics);
        done();
      });
      service.emit('characteristicsDiscover', mockCharacteristics);
    });

    it('should return a promise', (done) => {
      const mockCharacteristics = [];

      service.discoverCharacteristics(null).then((mockCharacteristics) => {
        mockCharacteristics.should.equal(mockCharacteristics);
        done();
      });
      service.emit('characteristicsDiscover', mockCharacteristics);
    });
  });
});
