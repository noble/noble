var should = require('should');
var sinon = require('sinon');

var Descriptor = require('../lib/descriptor');

describe('Descriptor', function() {
  var mockNoble = null;
  var mockPeripheralUuid = 'mock-peripheral-uuid';
  var mockServiceUuid = 'mock-service-uuid';
  var mockCharacteristicUuid = 'mock-characteristic-uuid';
  var mockUuid = 'mock-uuid';

  var descriptor = null;

  beforeEach(function() {
    mockNoble = {
      readValue: sinon.spy(),
      writeValue: sinon.spy()
    };

    descriptor = new Descriptor(mockNoble, mockPeripheralUuid, mockServiceUuid, mockCharacteristicUuid, mockUuid);
  });

  afterEach(function() {
    descriptor = null;
  });

  it('should have a uuid', function() {
    descriptor.uuid.should.equal(mockUuid);
  });

  it('should lookup name and type by uuid', function() {
    descriptor = new Descriptor(mockNoble, mockPeripheralUuid, mockServiceUuid, mockCharacteristicUuid, '2900');

    descriptor.name.should.equal('Characteristic Extended Properties');
    descriptor.type.should.equal('org.bluetooth.descriptor.gatt.characteristic_extended_properties');
  });

  describe('toString', function() {
    it('should be uuid, name, type', function() {
      descriptor.toString().should.equal('{"uuid":"mock-uuid","name":null,"type":null}');
    });
  });

  describe('readValue', function() {
    it('should delegate to noble', function() {
      descriptor.readValue();

      mockNoble.readValue.calledWithExactly(mockPeripheralUuid, mockServiceUuid, mockCharacteristicUuid, mockUuid).should.equal(true);
    });

    it('should callback', function() {
      var calledback = false;

      descriptor.readValue(function() {
        calledback = true;
      });
      descriptor.emit('valueRead');

      calledback.should.equal(true);
    });

    it('should callback with error, data', function() {
      var mockData = new Buffer(0);
      var callbackData = null;

      descriptor.readValue(function(error, data) {
        callbackData = data;
      });
      descriptor.emit('valueRead', mockData);

      callbackData.should.equal(mockData);
    });
  });

  describe('writeValue', function() {
    var mockData = null;

    beforeEach(function() {
      mockData = new Buffer(0);
    });

    it('should only accept data as a buffer', function() {
      mockData = {};

      (function(){
        descriptor.writeValue(mockData);
      }).should.throwError('data must be a Buffer');
    });

    it('should delegate to noble', function() {
      descriptor.writeValue(mockData);

      mockNoble.writeValue.calledWithExactly(mockPeripheralUuid, mockServiceUuid, mockCharacteristicUuid, mockUuid, mockData).should.equal(true);
    });

    it('should callback', function() {
      var calledback = false;

      descriptor.writeValue(mockData, function() {
        calledback = true;
      });
      descriptor.emit('valueWrite');

      calledback.should.equal(true);
    });
  });
});