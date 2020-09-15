require('should');
const sinon = require('sinon');

const Characteristic = require('../lib/characteristic');

describe('Characteristic', function () {
  let mockNoble = null;
  const mockPeripheralId = 'mock-peripheral-id';
  const mockServiceUuid = 'mock-service-uuid';
  const mockUuid = 'mock-uuid';
  const mockProperties = ['mock-property-1', 'mock-property-2'];

  let characteristic = null;

  beforeEach(function () {
    mockNoble = {
      read: sinon.spy(),
      write: sinon.spy(),
      broadcast: sinon.spy(),
      notify: sinon.spy(),
      discoverDescriptors: sinon.spy()
    };

    characteristic = new Characteristic(mockNoble, mockPeripheralId, mockServiceUuid, mockUuid, mockProperties);
  });

  afterEach(function () {
    characteristic = null;
  });

  it('should have a uuid', function () {
    characteristic.uuid.should.equal(mockUuid);
  });

  it('should lookup name and type by uuid', function () {
    characteristic = new Characteristic(mockNoble, mockPeripheralId, mockServiceUuid, '2a00', mockProperties);

    characteristic.name.should.equal('Device Name');
    characteristic.type.should.equal('org.bluetooth.characteristic.gap.device_name');
  });

  it('should have properties', function () {
    characteristic.properties.should.equal(mockProperties);
  });

  describe('toString', function () {
    it('should be uuid, name, type, properties', function () {
      characteristic.toString().should.equal('{"uuid":"mock-uuid","name":null,"type":null,"properties":["mock-property-1","mock-property-2"]}');
    });
  });

  describe('read', function () {
    it('should delegate to noble', function () {
      characteristic.read();

      mockNoble.read.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      characteristic.read(function () {
        calledback = true;
      });
      characteristic.emit('read');

      calledback.should.equal(true);
    });

    it('should callback with data', function () {
      const mockData = Buffer.alloc(0);
      let callbackData = null;

      characteristic.read(function (error, data) {
        if (error) {
          throw new Error(error);
        }
        callbackData = data;
      });
      characteristic.emit('read', mockData);

      callbackData.should.equal(mockData);
    });
  });

  describe('readAsync', () => {
    it('should delegate to noble', async () => {
      const promise = characteristic.readAsync();
      characteristic.emit('read');
      await promise;

      mockNoble.read.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid).should.equal(true);
    });

    it('should resolve with data', async () => {
      const mockData = Buffer.alloc(0);

      const promise = characteristic.readAsync();
      characteristic.emit('read', mockData);
      const result = await promise;

      result.should.equal(mockData);
    });
  });

  describe('write', function () {
    let mockData = null;

    beforeEach(function () {
      mockData = Buffer.alloc(0);
    });

    it('should only accept data as a buffer', function () {
      mockData = {};

      (function () {
        characteristic.write(mockData);
      }).should.throwError('data must be a Buffer');
    });

    it('should delegate to noble, withoutResponse false', function () {
      characteristic.write(mockData, false);

      mockNoble.write.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, mockData, false).should.equal(true);
    });

    it('should delegate to noble, withoutResponse true', function () {
      characteristic.write(mockData, true);

      mockNoble.write.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, mockData, true).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      characteristic.write(mockData, true, function () {
        calledback = true;
      });
      characteristic.emit('write');

      calledback.should.equal(true);
    });
  });

  describe('writeAsync', () => {
    let mockData = null;

    beforeEach(() => {
      mockData = Buffer.alloc(0);
    });

    it('should only accept data as a buffer', async () => {
      mockData = {};

      await characteristic.writeAsync(mockData).should.be.rejectedWith('data must be a Buffer');
    });

    it('should delegate to noble, withoutResponse false', async () => {
      const promise = characteristic.writeAsync(mockData, false);
      characteristic.emit('write');
      await promise;

      mockNoble.write.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, mockData, false).should.equal(true);
    });

    it('should delegate to noble, withoutResponse true', async () => {
      const promise = characteristic.writeAsync(mockData, true);
      characteristic.emit('write');
      await promise;

      mockNoble.write.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, mockData, true).should.equal(true);
    });

    it('should resolve', async () => {
      const promise = characteristic.writeAsync(mockData, true);
      characteristic.emit('write');
      await promise;

      await promise.should.be.resolved();
    });
  });

  describe('broadcast', function () {
    it('should delegate to noble, true', function () {
      characteristic.broadcast(true);

      mockNoble.broadcast.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should delegate to noble, false', function () {
      characteristic.broadcast(false);

      mockNoble.broadcast.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      characteristic.broadcast(true, function () {
        calledback = true;
      });
      characteristic.emit('broadcast');

      calledback.should.equal(true);
    });
  });

  describe('broadcastAsync', () => {
    it('should delegate to noble, true', async () => {
      const promise = characteristic.broadcastAsync(true);
      characteristic.emit('broadcast');
      await promise;

      mockNoble.broadcast.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should delegate to noble, false', async () => {
      const promise = characteristic.broadcastAsync(false);
      characteristic.emit('broadcast');
      await promise;

      mockNoble.broadcast.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should resolve', async () => {
      const promise = characteristic.broadcastAsync(true);
      characteristic.emit('broadcast');
      await promise;

      await promise.should.be.resolved();
    });
  });

  describe('notify', function () {
    it('should delegate to noble, true', function () {
      characteristic.notify(true);

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should delegate to noble, false', function () {
      characteristic.notify(false);

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      characteristic.notify(true, function () {
        calledback = true;
      });
      characteristic.emit('notify');

      calledback.should.equal(true);
    });
  });

  describe('notifyAsync', () => {
    it('should delegate to noble, true', async () => {
      const promise = characteristic.notifyAsync(true);
      characteristic.emit('notify');
      await promise;

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should delegate to noble, false', async () => {
      const promise = characteristic.notifyAsync(false);
      characteristic.emit('notify');
      await promise;

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should resolve', async () => {
      const promise = characteristic.notifyAsync(true);
      characteristic.emit('notify');
      await promise;

      await promise.should.be.resolved();
    });
  });

  describe('subscribe', function () {
    it('should delegate to noble notify, true', function () {
      characteristic.subscribe();

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      characteristic.subscribe(function () {
        calledback = true;
      });
      characteristic.emit('notify');

      calledback.should.equal(true);
    });
  });

  describe('subscribeAsync', () => {
    it('should delegate to noble notify, true', async () => {
      const promise = characteristic.subscribeAsync();
      characteristic.emit('notify');
      await promise;

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should resolve', async () => {
      const promise = characteristic.subscribeAsync();
      characteristic.emit('notify');
      await promise;

      await promise.should.be.resolved();
    });
  });

  describe('unsubscribe', function () {
    it('should delegate to noble notify, false', function () {
      characteristic.unsubscribe();

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      characteristic.unsubscribe(function () {
        calledback = true;
      });
      characteristic.emit('notify');

      calledback.should.equal(true);
    });
  });

  describe('unsubscribeAsync', () => {
    it('should delegate to noble notify, false', async () => {
      const promise = characteristic.unsubscribeAsync();
      characteristic.emit('notify');
      await promise;

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should resolve', async () => {
      const promise = characteristic.unsubscribeAsync();
      characteristic.emit('notify');
      await promise;

      await promise.should.be.resolved();
    });
  });

  describe('discoverDescriptors', function () {
    it('should delegate to noble', function () {
      characteristic.discoverDescriptors();

      mockNoble.discoverDescriptors.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      characteristic.discoverDescriptors(function () {
        calledback = true;
      });
      characteristic.emit('descriptorsDiscover');

      calledback.should.equal(true);
    });

    it('should callback with descriptors', function () {
      const mockDescriptors = [];
      let callbackDescriptors = null;

      characteristic.discoverDescriptors(function (error, descriptors) {
        if (error) {
          throw new Error(error);
        }
        callbackDescriptors = descriptors;
      });
      characteristic.emit('descriptorsDiscover', mockDescriptors);

      callbackDescriptors.should.equal(mockDescriptors);
    });
  });

  describe('discoverDescriptorsAsync', () => {
    it('should delegate to noble', async () => {
      const promise = characteristic.discoverDescriptorsAsync();
      characteristic.emit('descriptorsDiscover');
      await promise;

      mockNoble.discoverDescriptors.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid).should.equal(true);
    });

    it('should resolve with descriptors', async () => {
      const mockDescriptors = [];

      const promise = characteristic.discoverDescriptorsAsync();
      characteristic.emit('descriptorsDiscover', mockDescriptors);
      const result = await promise;

      result.should.equal(mockDescriptors);
    });
  });
});
