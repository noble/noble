require('should');
const sinon = require('sinon');

const Descriptor = require('../lib/descriptor');

describe('Descriptor', () => {
  let mockNoble = null;
  const mockPeripheralId = 'mock-peripheral-id';
  const mockServiceUuid = 'mock-service-uuid';
  const mockCharacteristicUuid = 'mock-characteristic-uuid';
  const mockUuid = 'mock-uuid';

  let descriptor = null;

  beforeEach(() => {
    mockNoble = {
      readValue: sinon.spy(),
      writeValue: sinon.spy()
    };

    descriptor = new Descriptor(mockNoble, mockPeripheralId, mockServiceUuid, mockCharacteristicUuid, mockUuid);
  });

  afterEach(() => {
    descriptor = null;
  });

  it('should have a uuid', () => {
    descriptor.uuid.should.equal(mockUuid);
  });

  it('should lookup name and type by uuid', () => {
    descriptor = new Descriptor(mockNoble, mockPeripheralId, mockServiceUuid, mockCharacteristicUuid, '2900');

    descriptor.name.should.equal('Characteristic Extended Properties');
    descriptor.type.should.equal('org.bluetooth.descriptor.gatt.characteristic_extended_properties');
  });

  describe('toString', () => {
    it('should be uuid, name, type', () => {
      descriptor.toString().should.equal('{"uuid":"mock-uuid","name":null,"type":null}');
    });
  });

  describe('readValue', () => {
    it('should delegate to noble', () => {
      descriptor.readValue();

      mockNoble.readValue.calledWithExactly(mockPeripheralId, mockServiceUuid, mockCharacteristicUuid, mockUuid).should.equal(true);
    });

    it('should callback', (done) => {
      descriptor.readValue(() => {
        done();
      });
      descriptor.emit('valueRead');
    });

    it('should not call callback twice', (done) => {
      let calledback = 0;

      descriptor.readValue(() => {
        calledback += 1;

      });
      descriptor.emit('valueRead');
      descriptor.emit('valueRead');

      setTimeout(() => {
        calledback.should.equal(1);
        done();
      }, 100);
    });

    it('should callback with error, data', (done) => {
      const mockData = Buffer.alloc(0);

      descriptor.readValue((error, data) => {
        data.should.equal(mockData);

        done();
      });
      descriptor.emit('valueRead', mockData);
    });

    it('should return a promise', (done) => {
      const mockData = Buffer.alloc(0);

      descriptor.readValue().then((data) => {
        data.should.equal(mockData);

        done();
      });
      descriptor.emit('valueRead', mockData);
    });
  });

  describe('writeValue', () => {
    let mockData = null;

    beforeEach(() => {
      mockData = Buffer.alloc(0);
    });

    it('should only accept data as a buffer', () => {
      mockData = {};

      (function(){
        descriptor.writeValue(mockData);
      }).should.throwError('data must be a Buffer');
    });

    it('should delegate to noble', () => {
      descriptor.writeValue(mockData);

      mockNoble.writeValue.calledWithExactly(mockPeripheralId, mockServiceUuid, mockCharacteristicUuid, mockUuid, mockData).should.equal(true);
    });

    it('should callback', (done) => {
      descriptor.writeValue(mockData, () => {
        done();
      });
      descriptor.emit('valueWrite');
    });

    it('should not call callback twice', (done) => {
      let calledback = 0;

      descriptor.writeValue(mockData, () => {
        calledback += 1;
      });
      descriptor.emit('valueWrite');
      descriptor.emit('valueWrite');

      setTimeout(() => {
        calledback.should.equal(1);
        done();
      }, 100);
    });

    it('should return a promise', (done) => {
      descriptor.writeValue(mockData).then(() => {
        done();
      });
      descriptor.emit('valueWrite');
    });
  });
});
