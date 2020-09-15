require('should');
const sinon = require('sinon');

const Noble = require('../lib/noble');

describe('Noble', () => {
  /**
   * @type {Noble & import('events').EventEmitter}
   */
  let noble;
  let mockBindings;

  beforeEach(() => {
    mockBindings = {
      init: () => {},
      on: () => {},
      startScanning: sinon.spy(),
      stopScanning: sinon.spy()
    };

    noble = new Noble(mockBindings);
  });

  describe('startScanningAsync', () => {
    it('should delegate to binding', async () => {
      const expectedServiceUuids = [1, 2, 3];
      const expectedAllowDuplicates = true;
      const promise = noble.startScanningAsync(expectedServiceUuids, expectedAllowDuplicates);
      noble.emit('stateChange', 'poweredOn');
      noble.emit('scanStart');
      await promise;

      mockBindings.startScanning.calledWithExactly(expectedServiceUuids, expectedAllowDuplicates).should.equal(true);
    });

    it('should throw an error if not powered on', async () => {
      const promise = noble.startScanningAsync();
      noble.emit('stateChange', 'poweredOff');
      noble.emit('scanStart');

      await promise.should.be.rejectedWith('Could not start scanning, state is poweredOff (not poweredOn)');
    });

    it('should resolve', async () => {
      const promise = noble.startScanningAsync();
      noble.emit('stateChange', 'poweredOn');
      noble.emit('scanStart');

      await promise.should.be.resolved();
    });
  });

  describe('stopScanningAsync', () => {
    it('should delegate to binding', async () => {
      noble.initialized = true;
      const promise = noble.stopScanningAsync();
      noble.emit('scanStop');
      await promise;

      mockBindings.stopScanning.calledWithExactly().should.equal(true);
    });

    it('should resolve', async () => {
      const promise = noble.stopScanningAsync();
      noble.emit('scanStop');
      await promise.should.be.resolved();
    });
  });
});
