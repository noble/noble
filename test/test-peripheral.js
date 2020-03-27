require('should');
const sinon = require('sinon');

const Peripheral = require('../lib/peripheral');

describe('Peripheral', function () {
  let mockNoble = null;
  const mockId = 'mock-id';
  const mockAddress = 'mock-address';
  const mockAddressType = 'mock-address-type';
  const mockConnectable = 'mock-connectable';
  const mockAdvertisement = 'mock-advertisement';
  const mockRssi = 'mock-rssi';
  const mockHandle = 'mock-handle';
  let mockData = 'mock-data';

  let peripheral = null;

  beforeEach(function () {
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

  afterEach(function () {
    peripheral = null;
  });

  it('should have a id', function () {
    peripheral.id.should.equal(mockId);
  });

  it('should have an address', function () {
    peripheral.address.should.equal(mockAddress);
  });

  it('should have an address type', function () {
    peripheral.addressType.should.equal(mockAddressType);
  });

  it('should have connectable', function () {
    peripheral.connectable.should.equal(mockConnectable);
  });

  it('should have advertisement', function () {
    peripheral.advertisement.should.equal(mockAdvertisement);
  });

  it('should have rssi', function () {
    peripheral.rssi.should.equal(mockRssi);
  });

  describe('toString', function () {
    it('should be id, address, address type, connectable, advertisement, rssi, state', function () {
      peripheral.toString().should.equal('{"id":"mock-id","address":"mock-address","addressType":"mock-address-type","connectable":"mock-connectable","advertisement":"mock-advertisement","rssi":"mock-rssi","mtu":null,"state":"disconnected"}');
    });
  });

  describe('connect', function () {
    it('should delegate to noble', function () {
      peripheral.connect();

      mockNoble.connect.calledWithExactly(mockId).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      peripheral.connect(function () {
        calledback = true;
      });
      peripheral.emit('connect');

      calledback.should.equal(true);
    });
  });

  describe('connectAsync', () => {
    it('should resolve', async () => {
      const promise = peripheral.connectAsync();

      peripheral.emit('connect');

      await promise.should.be.fulfilled();
    });

    it('should reject on error', async () => {
      const promise = peripheral.connectAsync();

      peripheral.emit('connect', new Error('error'));

      await promise.should.be.rejectedWith('error');
    });

    it('should delegate to noble', async () => {
      const promise = peripheral.connectAsync();

      peripheral.emit('connect');
      await promise;

      mockNoble.connect.calledWithExactly(mockId).should.equal(true);
    });
  });

  describe('disconnect', function () {
    it('should delegate to noble', function () {
      peripheral.disconnect();

      mockNoble.disconnect.calledWithExactly(mockId).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      peripheral.disconnect(function () {
        calledback = true;
      });
      peripheral.emit('disconnect');

      calledback.should.equal(true);
    });
  });

  describe('disconnectAsync', function () {
    it('should resolve', async () => {
      const promise = peripheral.disconnectAsync();

      peripheral.emit('disconnect');

      await promise.should.be.fulfilled();
    });

    it('should delegate to noble', () => {
      peripheral.disconnect();

      mockNoble.disconnect.calledWithExactly(mockId).should.equal(true);
    });
  });

  describe('updateRssi', function () {
    it('should delegate to noble', function () {
      peripheral.updateRssi();

      mockNoble.updateRssi.calledWithExactly(mockId).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      peripheral.updateRssi(function () {
        calledback = true;
      });
      peripheral.emit('rssiUpdate');

      calledback.should.equal(true);
    });

    it('should callback with rssi', function () {
      let calledbackRssi = null;

      peripheral.updateRssi(function (error, rssi) {
        if (error) {
          throw new Error(error);
        }
        calledbackRssi = rssi;
      });
      peripheral.emit('rssiUpdate', mockRssi);

      calledbackRssi.should.equal(mockRssi);
    });
  });

  describe('updateRssiAsync', () => {
    it('should resolve with rssi', async () => {
      const promise = peripheral.updateRssiAsync();

      peripheral.emit('rssiUpdate', mockRssi);

      await promise.should.be.fulfilledWith(mockRssi);
    });

    it('should delegate to noble', async () => {
      const promise = peripheral.updateRssiAsync();

      peripheral.emit('rssiUpdate');
      await promise;

      mockNoble.updateRssi.calledWithExactly(mockId).should.equal(true);
    });
  });

  describe('discoverServices', function () {
    it('should delegate to noble', function () {
      peripheral.discoverServices();

      mockNoble.discoverServices.calledWithExactly(mockId, undefined).should.equal(true);
    });

    it('should delegate to noble, service uuids', function () {
      const mockServiceUuids = [];

      peripheral.discoverServices(mockServiceUuids);

      mockNoble.discoverServices.calledWithExactly(mockId, mockServiceUuids).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      peripheral.discoverServices(null, function () {
        calledback = true;
      });
      peripheral.emit('servicesDiscover');

      calledback.should.equal(true);
    });

    it('should callback with services', function () {
      const mockServices = [];
      let calledbackServices = null;

      peripheral.discoverServices(null, function (error, services) {
        if (error) {
          throw new Error(error);
        }
        calledbackServices = services;
      });
      peripheral.emit('servicesDiscover', mockServices);

      calledbackServices.should.equal(mockServices);
    });
  });

  describe('discoverServicesAsync', () => {
    it('should resolve with services', async () => {
      const mockServices = 'discoveredServices';

      const promise = peripheral.discoverServicesAsync();
      peripheral.emit('servicesDiscover', mockServices);

      await promise.should.be.fulfilledWith(mockServices);
    });

    it('should delegate to noble', async () => {
      const promise = peripheral.discoverServicesAsync();
      peripheral.emit('servicesDiscover');
      await promise;

      mockNoble.discoverServices.calledWithExactly(mockId, undefined).should.equal(true);
    });

    it('should delegate to noble, service uuids', async () => {
      const mockServiceUuids = [];

      const promise = peripheral.discoverServicesAsync(mockServiceUuids);
      peripheral.emit('servicesDiscover');
      await promise;

      mockNoble.discoverServices.calledWithExactly(mockId, mockServiceUuids).should.equal(true);
    });
  });

  describe('discoverSomeServicesAndCharacteristics', function () {
    const mockServiceUuids = [];
    const mockCharacteristicUuids = [];
    let mockServices = null;

    beforeEach(function () {
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

    it('should call discoverServices', function () {
      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids);

      peripheral.discoverServices.calledWith(mockServiceUuids).should.equal(true);
    });

    it('should call discoverCharacteristics on each service discovered', function () {
      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids, mockCharacteristicUuids);

      const discoverServicesCallback = peripheral.discoverServices.getCall(0).args[1];

      discoverServicesCallback(null, mockServices);

      mockServices[0].discoverCharacteristics.calledWith(mockCharacteristicUuids).should.equal(true);
      mockServices[1].discoverCharacteristics.calledWith(mockCharacteristicUuids).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids, mockCharacteristicUuids, function () {
        calledback = true;
      });

      const discoverServicesCallback = peripheral.discoverServices.getCall(0).args[1];

      discoverServicesCallback(null, mockServices);

      mockServices[0].discoverCharacteristics.getCall(0).args[1](null, []);
      mockServices[1].discoverCharacteristics.getCall(0).args[1](null, []);

      calledback.should.equal(true);
    });

    it('should callback with the services and characteristics discovered', function () {
      let calledbackServices = null;
      let calledbackCharacteristics = null;

      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids, mockCharacteristicUuids, function (err, services, characteristics) {
        if (err) {
          throw new Error(err);
        }
        calledbackServices = services;
        calledbackCharacteristics = characteristics;
      });

      const discoverServicesCallback = peripheral.discoverServices.getCall(0).args[1];

      discoverServicesCallback(null, mockServices);

      const mockCharacteristic1 = { uuid: '1' };
      const mockCharacteristic2 = { uuid: '2' };
      const mockCharacteristic3 = { uuid: '3' };

      mockServices[0].discoverCharacteristics.getCall(0).args[1](null, [mockCharacteristic1]);
      mockServices[1].discoverCharacteristics.getCall(0).args[1](null, [mockCharacteristic2, mockCharacteristic3]);

      calledbackServices.should.equal(mockServices);
      calledbackCharacteristics.should.eql([mockCharacteristic1, mockCharacteristic2, mockCharacteristic3]);
    });
  });

  describe('discoverSomeServicesAndCharacteristicsAsync', () => {
    const mockServiceUuids = [];
    const mockCharacteristicUuids = [];
    let mockServices = null;

    beforeEach(function () {
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

    it('should call discoverServices', async () => {
      peripheral.discoverSomeServicesAndCharacteristicsAsync(mockServiceUuids);

      peripheral.discoverServices.calledWith(mockServiceUuids).should.equal(true);
    });

    it('should call discoverCharacteristics on each service discovered', () => {
      peripheral.discoverSomeServicesAndCharacteristicsAsync(mockServiceUuids, mockCharacteristicUuids);

      const discoverServicesCallback = peripheral.discoverServices.getCall(0).args[1];

      discoverServicesCallback(null, mockServices);

      mockServices[0].discoverCharacteristics.calledWith(mockCharacteristicUuids).should.equal(true);
      mockServices[1].discoverCharacteristics.calledWith(mockCharacteristicUuids).should.equal(true);
    });

    it('should reject on error', async () => {
      const promise = peripheral.discoverSomeServicesAndCharacteristicsAsync(mockServiceUuids);

      const discoverServicesCallback = peripheral.discoverServices.getCall(0).args[1];

      discoverServicesCallback(new Error('error'));

      await promise.should.be.rejectedWith('error');
    });

    it('should resolve with the services and characteristics discovered', async () => {
      const promise = peripheral.discoverSomeServicesAndCharacteristicsAsync(mockServiceUuids, mockCharacteristicUuids);

      const discoverServicesCallback = peripheral.discoverServices.getCall(0).args[1];

      discoverServicesCallback(null, mockServices);

      const mockCharacteristic1 = { uuid: '1' };
      const mockCharacteristic2 = { uuid: '2' };
      const mockCharacteristic3 = { uuid: '3' };

      mockServices[0].discoverCharacteristics.getCall(0).args[1](null, [mockCharacteristic1]);
      mockServices[1].discoverCharacteristics.getCall(0).args[1](null, [mockCharacteristic2, mockCharacteristic3]);

      const result = await promise;

      result.services.should.equal(mockServices);
      result.characteristics.should.eql([mockCharacteristic1, mockCharacteristic2, mockCharacteristic3]);
    });
  });

  describe('discoverAllServicesAndCharacteristics', function () {
    it('should call discoverSomeServicesAndCharacteristics', function () {
      const mockCallback = sinon.spy();

      peripheral.discoverSomeServicesAndCharacteristics = sinon.spy();

      peripheral.discoverAllServicesAndCharacteristics(mockCallback);

      peripheral.discoverSomeServicesAndCharacteristics.calledWithExactly([], [], mockCallback).should.equal(true);
    });
  });

  describe('discoverAllServicesAndCharacteristicsAsync', () => {
    it('should call discoverSomeServicesAndCharacteristics', async () => {
      peripheral.discoverSomeServicesAndCharacteristics = sinon.spy();

      const promise = peripheral.discoverAllServicesAndCharacteristicsAsync();
      const callback = peripheral.discoverSomeServicesAndCharacteristics.getCall(0).args[2];

      callback(null);
      await promise;

      peripheral.discoverSomeServicesAndCharacteristics.getCall(0).args[0].should.eql([]);
      peripheral.discoverSomeServicesAndCharacteristics.getCall(0).args[1].should.eql([]);
    });
  });

  describe('readHandle', function () {
    it('should delegate to noble', function () {
      peripheral.readHandle(mockHandle);

      mockNoble.readHandle.calledWithExactly(mockId, mockHandle).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      peripheral.readHandle(mockHandle, function () {
        calledback = true;
      });
      peripheral.emit(`handleRead${mockHandle}`);

      calledback.should.equal(true);
    });

    it('should callback with data', function () {
      let calledbackData = null;

      peripheral.readHandle(mockHandle, function (error, data) {
        if (error) {
          throw new Error(error);
        }
        calledbackData = data;
      });
      peripheral.emit(`handleRead${mockHandle}`, mockData);

      calledbackData.should.equal(mockData);
    });
  });

  describe('readHandleAsync', () => {
    it('should delegate to noble', async () => {
      const promise = peripheral.readHandleAsync(mockHandle);

      peripheral.emit(`handleRead${mockHandle}`);
      await promise;

      mockNoble.readHandle.calledWithExactly(mockId, mockHandle).should.equal(true);
    });

    it('should resolve with data', async () => {
      const promise = peripheral.readHandleAsync(mockHandle);

      peripheral.emit(`handleRead${mockHandle}`, mockData);

      await promise.should.be.fulfilledWith(mockData);
    });
  });

  describe('writeHandle', function () {
    beforeEach(function () {
      mockData = Buffer.alloc(0);
    });

    it('should only accept data as a buffer', function () {
      mockData = {};

      (function () {
        peripheral.writeHandle(mockHandle, mockData);
      }).should.throwError('data must be a Buffer');
    });

    it('should delegate to noble, withoutResponse false', function () {
      peripheral.writeHandle(mockHandle, mockData, false);

      mockNoble.writeHandle.calledWithExactly(mockId, mockHandle, mockData, false).should.equal(true);
    });

    it('should delegate to noble, withoutResponse true', function () {
      peripheral.writeHandle(mockHandle, mockData, true);

      mockNoble.writeHandle.calledWithExactly(mockId, mockHandle, mockData, true).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      peripheral.writeHandle(mockHandle, mockData, false, function () {
        calledback = true;
      });
      peripheral.emit(`handleWrite${mockHandle}`);

      calledback.should.equal(true);
    });
  });

  describe('writeHandleAsync', () => {
    beforeEach(() => {
      mockData = Buffer.alloc(0);
    });

    it('should only accept data as a buffer', async () => {
      mockData = {};

      await peripheral.writeHandleAsync(mockHandle, mockData).should.be.rejectedWith('data must be a Buffer');
    });

    it('should delegate to noble, withoutResponse false', async () => {
      const promise = peripheral.writeHandleAsync(mockHandle, mockData, false);

      peripheral.emit(`handleWrite${mockHandle}`);
      await promise;

      mockNoble.writeHandle.calledWithExactly(mockId, mockHandle, mockData, false).should.equal(true);
    });

    it('should delegate to noble, withoutResponse true', async () => {
      const promise = peripheral.writeHandleAsync(mockHandle, mockData, true);

      peripheral.emit(`handleWrite${mockHandle}`);
      await promise;

      mockNoble.writeHandle.calledWithExactly(mockId, mockHandle, mockData, true).should.equal(true);
    });

    it('should resolve', async () => {
      const promise = peripheral.writeHandleAsync(mockHandle, mockData, false);

      peripheral.emit(`handleWrite${mockHandle}`);
      await promise.should.be.resolvedWith();
    });
  });
});
