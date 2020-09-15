require('should');
const sinon = require('sinon');

const Descriptor = require('../lib/descriptor');

describe('Descriptor', function () {
  let mockNoble = null;
  const mockPeripheralId = 'mock-peripheral-id';
  const mockServiceUuid = 'mock-service-uuid';
  const mockCharacteristicUuid = 'mock-characteristic-uuid';
  const mockUuid = 'mock-uuid';

  let descriptor = null;

  beforeEach(function () {
    mockNoble = {
      readValue: sinon.spy(),
      writeValue: sinon.spy()
    };

    descriptor = new Descriptor(mockNoble, mockPeripheralId, mockServiceUuid, mockCharacteristicUuid, mockUuid);
  });

  afterEach(function () {
    descriptor = null;
  });

  it('should have a uuid', function () {
    descriptor.uuid.should.equal(mockUuid);
  });

  it('should lookup name and type by uuid', function () {
    descriptor = new Descriptor(mockNoble, mockPeripheralId, mockServiceUuid, mockCharacteristicUuid, '2900');

    descriptor.name.should.equal('Characteristic Extended Properties');
    descriptor.type.should.equal('org.bluetooth.descriptor.gatt.characteristic_extended_properties');
  });

  describe('toString', function () {
    it('should be uuid, name, type', function () {
      descriptor.toString().should.equal('{"uuid":"mock-uuid","name":null,"type":null}');
    });
  });

  describe('readValue', function () {
    it('should delegate to noble', function () {
      descriptor.readValue();

      mockNoble.readValue.calledWithExactly(mockPeripheralId, mockServiceUuid, mockCharacteristicUuid, mockUuid).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      descriptor.readValue(function () {
        calledback = true;
      });
      descriptor.emit('valueRead');

      calledback.should.equal(true);
    });

    it('should not call callback twice', function () {
      let calledback = 0;

      descriptor.readValue(function () {
        calledback += 1;
      });
      descriptor.emit('valueRead');
      descriptor.emit('valueRead');

      calledback.should.equal(1);
    });

    it('should callback with error, data', function () {
      const mockData = Buffer.alloc(0);
      let callbackData = null;

      descriptor.readValue(function (error, data) {
        if (error) {
          throw new Error(error);
        }
        callbackData = data;
      });
      descriptor.emit('valueRead', mockData);

      callbackData.should.equal(mockData);
    });
  });

  describe('readValueAsync', function () {
    it('should delegate to noble', async () => {
      const promise = descriptor.readValueAsync();
      descriptor.emit('valueRead');
      await promise;

      mockNoble.readValue.calledWithExactly(mockPeripheralId, mockServiceUuid, mockCharacteristicUuid, mockUuid).should.equal(true);
    });

    it('should resolve with data', async () => {
      const mockData = Buffer.alloc(0);

      const promise = descriptor.readValueAsync();
      descriptor.emit('valueRead', mockData);
      const result = await promise;

      result.should.equal(mockData);
    });
  });

  describe('writeValue', function () {
    let mockData = null;

    beforeEach(function () {
      mockData = Buffer.alloc(0);
    });

    it('should only accept data as a buffer', function () {
      mockData = {};

      (function () {
        descriptor.writeValue(mockData);
      }).should.throwError('data must be a Buffer');
    });

    it('should delegate to noble', function () {
      descriptor.writeValue(mockData);

      mockNoble.writeValue.calledWithExactly(mockPeripheralId, mockServiceUuid, mockCharacteristicUuid, mockUuid, mockData).should.equal(true);
    });

    it('should callback', function () {
      let calledback = false;

      descriptor.writeValue(mockData, function () {
        calledback = true;
      });
      descriptor.emit('valueWrite');

      calledback.should.equal(true);
    });

    it('should not call callback twice', function () {
      let calledback = 0;

      descriptor.writeValue(mockData, function () {
        calledback += 1;
      });
      descriptor.emit('valueWrite');
      descriptor.emit('valueWrite');

      calledback.should.equal(1);
    });
  });

  describe('writeValueAsync', function () {
    let mockData = null;

    beforeEach(function () {
      mockData = Buffer.alloc(0);
    });

    it('should only accept data as a buffer', async () => {
      mockData = {};

      await descriptor.writeValueAsync(mockData).should.be.rejectedWith('data must be a Buffer');
    });

    it('should delegate to noble', async () => {
      const promise = descriptor.writeValueAsync(mockData);
      descriptor.emit('valueWrite');
      await promise;

      mockNoble.writeValue.calledWithExactly(mockPeripheralId, mockServiceUuid, mockCharacteristicUuid, mockUuid, mockData).should.equal(true);
    });

    it('should resolve', async () => {
      const promise = descriptor.writeValueAsync(mockData);
      descriptor.emit('valueWrite');
      await promise;

      await promise.should.be.resolved();
    });
  });
});
