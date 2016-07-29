var should = require('should');
var sinon = require('sinon');

var a = require('./common');

var startScanningEmitScanStart = function(bindings, Native, setup) {
  describe('Noble bindings central', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('startScanning should emit scanStart', function() {
      var eventSpy = sandbox.spy();
      bindings.on('scanStart', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.startScanning();

      eventSpy.called.should.equal(true);
    });

  });
};

var stopScanningEmitScanStop = function(bindings, Native, setup) {
  describe('Noble bindings central', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('stopScanning should emit scanStop', function() {
      var eventSpy = sandbox.spy();
      bindings.on('scanStop', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.stopScanning();

      eventSpy.called.should.equal(true);
    });
  });
};

var emitAddressChange = function(bindings, Native, setup) {

  describe('Noble bindings central', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit addressChange', function() {
      var eventSpy = sandbox.spy();
      bindings.once('addressChange', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      eventSpy.calledWithExactly(a.addressString).should.equal(true);
    });

  });

};


var emitStateChange = function(bindings, Native, setup) {

  describe('Noble bindings central', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit stateChange', function() {
      var eventSpy = sandbox.spy();
      bindings.once('stateChange', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      eventSpy.calledWithExactly(a.stateString).should.equal(true);
    });

  });

};



var emitDiscover = function(bindings, Native, setup) {

  describe('Noble bindings central', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit discover', function() {
      var eventSpy = sandbox.spy();
      bindings.once('discover', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      eventSpy.calledWithExactly(a.peripheralUuidString, a.addressString, a.addressTypeString, a.connectableBoolean, a.advertisementObject, a.rssiNumber).should.equal(true);
    });

  });

};



var emitConnectSuccess = function(bindings, Native, setup) {

  describe('Noble bindings central', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit connect on success', function() {
      var eventSpy = sandbox.spy();
      bindings.once('connect', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      eventSpy.calledWithExactly(a.peripheralUuidString, a.mockError).should.equal(true);
    });

  });

};



var emitConnectFail = function(bindings, Native, setup) {

  describe('Noble bindings central', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit connect on fail', function() {
      var eventSpy = sandbox.spy();
      bindings.once('connect', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      eventSpy.calledWithExactly(a.peripheralUuidString, a.mockError).should.equal(true);
    });

  });

};

var emitDisconnect = function(bindings, Native, setup) {

  describe('Noble bindings central', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit disconnect', function() {
      var eventSpy = sandbox.spy();
      bindings.once('disconnect', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.disconnect(a.peripheralUuidString);
      eventSpy.calledWithExactly(a.peripheralUuidString).should.equal(true);
    });

  });

};

var emitRssiUpdate = function(bindings, Native, setup) {

  describe('Noble bindings peripheral', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit rssiUpdate', function() {
      var eventSpy = sandbox.spy();
      bindings.once('rssiUpdate', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.updateRssi(a.peripheralUuidString);
      eventSpy.calledWithExactly(a.peripheralUuidString, a.rssiNumber).should.equal(true);
    });

  });

};

var emitServicesDiscover = function(bindings, Native, setup) {

  describe('Noble bindings peripheral', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit servicesDiscover', function() {
      var eventSpy = sandbox.spy();
      bindings.once('servicesDiscover', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.discoverServices(a.peripheralUuidString, a.serviceUuidsArray);
      eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidsArray).should.equal(true);
    });

  });

};

var emitIncludedServicesDiscover = function(bindings, Native, setup) {

  describe('Noble bindings service', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit includedServicesDiscover', function() {
      var eventSpy = sandbox.spy();
      bindings.once('includedServicesDiscover', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.discoverIncludedServices(a.peripheralUuidString, a.serviceUuidString, [mock.nativeIncludedServiceUuidString]);
      eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, [a.includedServiceUuidString]).should.equal(true);
    });

  });

};

var emitCharacteristicsDiscover = function(bindings, Native, setup) {

  describe('Noble bindings service', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit haracteristicsDiscover', function() {
      var eventSpy = sandbox.spy();
      bindings.once('characteristicsDiscover', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.discoverCharacteristics(a.peripheralUuidString, a.serviceUuidString, [a.characteristicUuidString]);
      eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, [a.bindingsCharacteristicObject]).should.equal(true);
    });

  });

};

var emitRead = function(bindings, Native, setup) {

  describe('Noble bindings characteristic', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit read', function() {
      var eventSpy = sandbox.spy();
      bindings.once('read', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.read(a.peripheralUuidString, a.serviceUuidString,a. characteristicUuidString);
      eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.dataBuffer).should.equal(true);
    });

  });

};

var emitWrite = function(bindings, Native, setup) {

  describe('Noble bindings characteristic', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit write', function() {
      var eventSpy = sandbox.spy();
      bindings.once('write', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.write(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.dataBuffer, true);
      eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString).should.equal(true);
    });

  });

};

var emitNotify = function(bindings, Native, setup) {

  describe('Noble bindings characteristic', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit notify', function() {
      var eventSpy = sandbox.spy();
      bindings.once('notify', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.notify(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.notifyBoolean);
      eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.notifyBoolean).should.equal(true);
    });

  });

};

var emitDescriptorsDiscover = function(bindings, Native, setup) {

  describe('Noble bindings characteristic', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit descriptorsDiscover', function() {
      var eventSpy = sandbox.spy();
      bindings.once('descriptorsDiscover', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.discoverDescriptors(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString);
      eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, [a.descriptorUuidString]).should.equal(true);
    });

  });

};

var emitValueRead = function(bindings, Native, setup) {

  describe('Noble bindings descriptor', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit valueRead', function() {
      var eventSpy = sandbox.spy();
      bindings.once('valueRead', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.readValue(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.descriptorUuidString);
      eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.descriptorUuidString, a.dataBuffer).should.equal(true);
    });

  });

};




var emitValueWrite = function(bindings, Native, setup) {

  describe('Noble bindings descriptor', function() {
    var sandbox = sinon.sandbox.create();
    var mock;

    beforeEach(function() {
      mock = new Native(bindings, sandbox);
    });

    afterEach(function () {
      sandbox.restore();
      mock = null;
    });

    it('should emit valueWrite', function() {
      var eventSpy = sandbox.spy();
      bindings.once('valueWrite', eventSpy);

      if (typeof setup == 'function')
        setup(mock, sandbox);

      bindings.writeValue(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.descriptorUuidString, a.dataBuffer);
      eventSpy.calledWithExactly(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString, a.descriptorUuidString).should.equal(true);
    });

  });

};


module.exports = {
  startScanningEmitScanStart: startScanningEmitScanStart,
  stopScanningEmitScanStop: stopScanningEmitScanStop,
  emitAddressChange: emitAddressChange,
  emitStateChange: emitStateChange,
  emitDiscover: emitDiscover,
  emitConnectSuccess: emitConnectSuccess,
  emitConnectFail: emitConnectFail,
  emitDisconnect: emitDisconnect,
  emitServicesDiscover: emitServicesDiscover,
  emitRssiUpdate: emitRssiUpdate,
  emitIncludedServicesDiscover: emitIncludedServicesDiscover,
  emitCharacteristicsDiscover: emitCharacteristicsDiscover,
  emitRead: emitRead,
  emitWrite: emitWrite,
  emitNotify: emitNotify,
  emitDescriptorsDiscover: emitDescriptorsDiscover,
  emitValueRead: emitValueRead,
  emitValueWrite: emitValueWrite
};
