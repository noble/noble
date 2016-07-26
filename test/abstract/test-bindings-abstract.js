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

      eventSpy.calledWithExactly(a.peripheralUuidString, null).should.equal(true);
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


module.exports = {
  startScanningEmitScanStart: startScanningEmitScanStart,
  stopScanningEmitScanStop: stopScanningEmitScanStop,
  emitAddressChange: emitAddressChange,
  emitStateChange: emitStateChange,
  emitDiscover: emitDiscover,
  emitConnectSuccess: emitConnectSuccess,
  emitConnectFail: emitConnectFail,
  emitDisconnect: emitDisconnect
};