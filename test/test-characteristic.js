require('should');
const sinon = require('sinon');

const Characteristic = require('../lib/characteristic');

describe('Characteristic', () => {
  let mockNoble = null;
  const mockPeripheralId = 'mock-peripheral-id';
  const mockServiceUuid = 'mock-service-uuid';
  const mockUuid = 'mock-uuid';
  const mockProperties = ['mock-property-1', 'mock-property-2'];

  let characteristic = null;

  beforeEach(() => {
    mockNoble = {
      read: sinon.spy(),
      write: sinon.spy(),
      broadcast: sinon.spy(),
      notify: sinon.spy(),
      discoverDescriptors: sinon.spy()
    };

    characteristic = new Characteristic(mockNoble, mockPeripheralId, mockServiceUuid, mockUuid, mockProperties);
  });

  afterEach(() => {
    characteristic = null;
  });

  it('should have a uuid', () => {
    characteristic.uuid.should.equal(mockUuid);
  });

  it('should lookup name and type by uuid', () => {
    characteristic = new Characteristic(mockNoble, mockPeripheralId, mockServiceUuid, '2a00', mockProperties);

    characteristic.name.should.equal('Device Name');
    characteristic.type.should.equal('org.bluetooth.characteristic.gap.device_name');
  });

  it('should have properties', () => {
    characteristic.properties.should.equal(mockProperties);
  });

  describe('toString', () => {
    it('should be uuid, name, type, properties', () => {
      characteristic.toString().should.equal('{"uuid":"mock-uuid","name":null,"type":null,"properties":["mock-property-1","mock-property-2"]}');
    });
  });

  describe('read', () => {
    it('should delegate to noble', () => {
      characteristic.read();

      mockNoble.read.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid).should.equal(true);
    });

    it('should callback', (done) => {
      characteristic.read(() => {
        done();
      });
      characteristic.emit('read');
    });

    it('should callback with data', (done) => {
      const mockData = Buffer.alloc(0);
      characteristic.read((error, data) => {
        data.should.equal(mockData);
        done();
      });
      characteristic.emit('read', mockData);
    });

    it('should return a promise', (done) => {
      const mockData = Buffer.alloc(0);
      characteristic.read().then((data) => {
        data.should.equal(mockData);
        done();
      });

      characteristic.emit('read', mockData);
    });
  });

  describe('write', () => {
    let mockData = null;

    beforeEach(() => {
      mockData = Buffer.alloc(0);
    });

    it('should only accept data as a buffer', () => {
      mockData = {};

      (function(){
        characteristic.write(mockData);
      }).should.throwError('data must be a Buffer');
    });

    it('should delegate to noble, withoutResponse false', () => {
      characteristic.write(mockData, false);

      mockNoble.write.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, mockData, false).should.equal(true);
    });

    it('should delegate to noble, withoutResponse true', () => {
      characteristic.write(mockData, true);

      mockNoble.write.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, mockData, true).should.equal(true);
    });

    it('should callback', (done) => {
      characteristic.write(mockData, true, () => {
        done();
      });
      characteristic.emit('write');
    });

    it('should return a promise', (done) => {
      characteristic.write(mockData, true).then(() => done());
      characteristic.emit('write');
    });
  });

  describe('broadcast', () => {
    it('should delegate to noble, true', () => {
      characteristic.broadcast(true);

      mockNoble.broadcast.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should delegate to noble, false', () => {
      characteristic.broadcast(false);

      mockNoble.broadcast.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should callback', (done) => {
      characteristic.broadcast(true, () => {
        done();
      });
      characteristic.emit('broadcast');
    });

    it('should return a promise', (done) => {
      characteristic.broadcast(true).then(() => done());
      characteristic.emit('broadcast');
    });
  });

  describe('notify', () => {
    it('should delegate to noble, true', () => {
      characteristic.notify(true);

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should delegate to noble, false', () => {
      characteristic.notify(false);

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should callback', (done) => {
      characteristic.notify(true, () => {
        done();
      });
      characteristic.emit('notify');
    });

    it('should return a promise', (done) => {
      characteristic.notify(true).then(() => done());
      characteristic.emit('notify');
    });
  });

  describe('subscribe', () => {
    it('should delegate to noble notify, true', () => {
      characteristic.subscribe();

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should callback', (done) => {
      characteristic.subscribe(() => {
        done();
      });
      characteristic.emit('notify');
    });

    it('should return a promise', (done) => {
      characteristic.subscribe().then(() => done());
      characteristic.emit('notify');
    });
  });

  describe('unsubscribe', () => {
    it('should delegate to noble notify, false', () => {
      characteristic.unsubscribe();

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should callback', (done) => {
      characteristic.unsubscribe(() => {
        done();
      });
      characteristic.emit('notify');
    });

    it('should return a promise', (done) => {
      characteristic.unsubscribe().then(() => done());
      characteristic.emit('notify');
    });
  });

  describe('discoverDescriptors', () => {
    it('should delegate to noble', () => {
      characteristic.discoverDescriptors();

      mockNoble.discoverDescriptors.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid).should.equal(true);
    });

    it('should callback', (done) => {
      characteristic.discoverDescriptors(() => {
        done();
      });
      characteristic.emit('descriptorsDiscover');
    });

    it('should callback with descriptors', (done) => {
      const mockDescriptors = [];
      characteristic.discoverDescriptors((error, descriptors) => {
        descriptors.should.equal(mockDescriptors);
        done();
      });
      characteristic.emit('descriptorsDiscover', mockDescriptors);
    });

    it('should return a promise', (done) => {
      const mockDescriptors = [];
      characteristic.discoverDescriptors().then((descriptors) => {
        descriptors.should.equal(mockDescriptors);
        done();
      });
      characteristic.emit('descriptorsDiscover', mockDescriptors);
    });
  });
});
