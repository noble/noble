var should = require('should');
var sinon = require('sinon');

var PeripheralCache = require("../lib/peripheralCache");

describe('PeripheralCache', function(){

  it('should create an empty cache', function(){
    var cache = new PeripheralCache();
    Object.keys(cache._cache).length.should.equal(0);
    should.not.exist(cache.maxAge);
  });

  it('should create an empty with maximum age specified', function(){
    var cache = new PeripheralCache(5000);
    Object.keys(cache._cache).length.should.equal(0);
    cache.maxAge.should.equal(5000);
  });

  it('should store and retrieve peripheral information', function(){
    var cache = new PeripheralCache(5000);
    var testPeripheral = {uuid:"12345"};

    cache.addPeripheral(testPeripheral);

    var retrievedPeripheral = cache.getPeripheral(testPeripheral.uuid);
    retrievedPeripheral.should.equal(testPeripheral);
    cache.contains(testPeripheral.uuid).should.equal(true);
  });

  it('should return undefined when the peripheral is not in the cache', function(){
    var cache = new PeripheralCache(5000);
    var testPeripheralUuid = "12345";

    var retrievedPeripheral = cache.getPeripheral(testPeripheralUuid);
    should.not.exist(retrievedPeripheral);
    cache.contains(testPeripheralUuid).should.equal(false);
  });

  it('should sweep old peripherals from the cache', function(){
    var clock = sinon.useFakeTimers();
    var cache = new PeripheralCache(500);
    var testPeripheral = {uuid:"12345"};

    cache.addPeripheral(testPeripheral);

    var retrievedPeripheral = cache.getPeripheral(testPeripheral.uuid);
    retrievedPeripheral.should.equal(testPeripheral);
    cache.contains(testPeripheral.uuid).should.equal(true);

    cache.startSweeping();

    clock.tick(1001);

    retrievedPeripheral = cache.getPeripheral(testPeripheral.uuid);
    should.not.exist(retrievedPeripheral);
    cache.contains(testPeripheral.uuid).should.equal(false);
    
    cache.stopSweeping();
    clock.restore();
  });

  it('should not sweep old peripherals from the cache when no maximum age was specified', function(){
    var clock = sinon.useFakeTimers();
    var cache = new PeripheralCache();
    var testPeripheral = {uuid:"12345"};

    cache.addPeripheral(testPeripheral);

    var retrievedPeripheral = cache.getPeripheral(testPeripheral.uuid);
    retrievedPeripheral.should.equal(testPeripheral);

    cache.startSweeping();

    clock.tick(1001);

    cache.contains(testPeripheral.uuid).should.equal(true);
    
    cache.stopSweeping();
    clock.restore();
  });

  it('should store and retrieve services', function(){
    var cache = new PeripheralCache();

    var testPeripheral = {uuid:"12345"};
    var testService = {uuid: "67890"};

    cache.addPeripheral(testPeripheral);
    cache.addService(testPeripheral.uuid, testService);

    var retrievedService = cache.getService(testPeripheral.uuid, testService.uuid);
    retrievedService.should.equal(testService);
  });

  it('should store and retrieve characteristics', function(){
    var cache = new PeripheralCache();

    var testPeripheral = {uuid:"12345"};
    var testService = {uuid: "67890"};
    var testCharacteristic = {uuid: "13579"};

    cache.addPeripheral(testPeripheral);
    cache.addService(testPeripheral.uuid, testService);
    cache.addCharacteristic(testPeripheral.uuid, testService.uuid, testCharacteristic);

    var retrievedCharacteristic = cache.getCharacteristic(testPeripheral.uuid, testService.uuid, testCharacteristic.uuid);
    retrievedCharacteristic.should.equal(testCharacteristic);
  });

  it('should store and retrieve descriptors', function(){
    var cache = new PeripheralCache();

    var testPeripheral = {uuid:"12345"};
    var testService = {uuid: "67890"};
    var testCharacteristic = {uuid: "13579"};
    var testDescriptor = {uuid: "24680"};

    cache.addPeripheral(testPeripheral);
    cache.addService(testPeripheral.uuid, testService);
    cache.addCharacteristic(testPeripheral.uuid, testService.uuid, testCharacteristic);
    cache.addDescriptor(testPeripheral.uuid, testService.uuid, testCharacteristic.uuid, testDescriptor);

    var retrievedDescriptor = cache.getDescriptor(testPeripheral.uuid, testService.uuid, testCharacteristic.uuid, testDescriptor.uuid);
    retrievedDescriptor.should.equal(testDescriptor);
  });

});