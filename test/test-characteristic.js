var should = require('should');
var sinon = require('sinon');

var Characteristic = require('../lib/characteristic');

describe('Characteristic', function() {
  var mockNoble = null;
  var mockPeripheralId = 'mock-peripheral-id';
  var mockServiceUuid = 'mock-service-uuid';
  var mockUuid = 'mock-uuid';
  var mockProperties = ['mock-property-1', 'mock-property-2'];

  var characteristic = null;

  beforeEach(function() {
    mockNoble = {
      read: sinon.spy(),
      write: sinon.spy(),
      broadcast: sinon.spy(),
      notify: sinon.spy(),
      discoverDescriptors: sinon.spy()
    };

    characteristic = new Characteristic(mockNoble, mockPeripheralId, mockServiceUuid, mockUuid, mockProperties);
  });

  afterEach(function() {
    characteristic = null;
  });

  it('should have a uuid', function() {
    characteristic.uuid.should.equal(mockUuid);
  });

  it('should lookup name and type by uuid', function() {
    characteristic = new Characteristic(mockNoble, mockPeripheralId, mockServiceUuid, '2a00', mockProperties);

    characteristic.name.should.equal('Device Name');
    characteristic.type.should.equal('org.bluetooth.characteristic.gap.device_name');
  });

  it('should have properties', function() {
    characteristic.properties.should.equal(mockProperties);
  });

  describe('toString', function() {
    it('should be uuid, name, type, properties', function() {
      characteristic.toString().should.equal('{"uuid":"mock-uuid","name":null,"type":null,"properties":["mock-property-1","mock-property-2"]}');
    });
  });

  describe('read', function() {
    it('should delegate to noble', function() {
      characteristic.read();

      mockNoble.read.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid).should.equal(true);
    });

    it('should callback', function(done) {
      characteristic.read(function() {
        done();
      });
      characteristic.emit('read');
    });

    it('should callback with data', function(done) {
      var mockData = new Buffer(0);
      characteristic.read(function(error, data) {
        data.should.equal(mockData);
        done();
      });
      characteristic.emit('read', mockData);
    });

    it('should return a promise', function(done) {
      var mockData = new Buffer(0);
      const p = characteristic.read().then((data) => {
        data.should.equal(mockData);
        done();
      });

      characteristic.emit('read', mockData);
    });
  });

  describe('write', function() {
    var mockData = null;

    beforeEach(function() {
      mockData = new Buffer(0);
    });

    it('should only accept data as a buffer', function() {
      mockData = {};

      (function(){
        characteristic.write(mockData);
      }).should.throwError('data must be a Buffer');
    });

    it('should delegate to noble, withoutResponse false', function() {
      characteristic.write(mockData, false);

      mockNoble.write.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, mockData, false).should.equal(true);
    });

    it('should delegate to noble, withoutResponse true', function() {
      characteristic.write(mockData, true);

      mockNoble.write.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, mockData, true).should.equal(true);
    });

    it('should callback', function(done) {
      characteristic.write(mockData, true, function() {
        done();
      });
      characteristic.emit('write');
    });

    it('should return a promise', function(done) {
      const p = characteristic.write(mockData, true).then(() => done());
      characteristic.emit('write');
    });
  });

  describe('broadcast', function() {
    it('should delegate to noble, true', function() {
      characteristic.broadcast(true);

      mockNoble.broadcast.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should delegate to noble, false', function() {
      characteristic.broadcast(false);

      mockNoble.broadcast.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should callback', function(done) {
      characteristic.broadcast(true, function() {
        done();
      });
      characteristic.emit('broadcast');
    });

    it('should return a promise', function(done) {
      const p = characteristic.broadcast(true).then(() => done());
      characteristic.emit('broadcast');
    });
  });

  describe('notify', function() {
    it('should delegate to noble, true', function() {
      characteristic.notify(true);

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should delegate to noble, false', function() {
      characteristic.notify(false);

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should callback', function(done) {
      characteristic.notify(true, function() {
        done();
      });
      characteristic.emit('notify');
    });

    it('should return a promise', function(done) {
      characteristic.notify(true).then(() => done());
      characteristic.emit('notify');
    });
  });

  describe('subscribe', function() {
    it('should delegate to noble notify, true', function() {
      characteristic.subscribe();

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, true).should.equal(true);
    });

    it('should callback', function(done) {
      characteristic.subscribe(function() {
        done();
      });
      characteristic.emit('notify');
    });

    it('should return a promise', function(done) {
      characteristic.subscribe().then(() => done());
      characteristic.emit('notify');
    });
  });

  describe('unsubscribe', function() {
    it('should delegate to noble notify, false', function() {
      characteristic.unsubscribe();

      mockNoble.notify.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid, false).should.equal(true);
    });

    it('should callback', function(done) {
      characteristic.unsubscribe(function() {
        done();
      });
      characteristic.emit('notify');
    });

    it('should return a promise', function(done) {
      characteristic.unsubscribe().then(() => done());
      characteristic.emit('notify');
    });
  });

  describe('discoverDescriptors', function() {
    it('should delegate to noble', function() {
      characteristic.discoverDescriptors();

      mockNoble.discoverDescriptors.calledWithExactly(mockPeripheralId, mockServiceUuid, mockUuid).should.equal(true);
    });

    it('should callback', function(done) {
      characteristic.discoverDescriptors(function() {
        done();
      });
      characteristic.emit('descriptorsDiscover');
    });

    it('should callback with descriptors', function(done) {
      var mockDescriptors = [];
      characteristic.discoverDescriptors(function(error, descriptors) {
        descriptors.should.equal(mockDescriptors);
        done();
      });
      characteristic.emit('descriptorsDiscover', mockDescriptors);
    });

    it('should return a promise', function(done) {
      var mockDescriptors = [];
      characteristic.discoverDescriptors().then(function(descriptors) {
        descriptors.should.equal(mockDescriptors);
        done();
      });
      characteristic.emit('descriptorsDiscover', mockDescriptors);
    });
  });
});
