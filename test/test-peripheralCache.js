var should = require('should');

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

  it('should sweep old peripherals from the cache', function(done){
    var cache = new PeripheralCache(1);
    var testPeripheral = {uuid:"12345"};

    cache.addPeripheral(testPeripheral);

    var retrievedPeripheral = cache.getPeripheral(testPeripheral.uuid);
    retrievedPeripheral.should.equal(testPeripheral);
    cache.contains(testPeripheral.uuid).should.equal(true);

    cache.startSweeping();

    setTimeout(function(){
      retrievedPeripheral = cache.getPeripheral(testPeripheral.uuid);
      should.not.exist(retrievedPeripheral);
      cache.contains(testPeripheral.uuid).should.equal(false);
      cache.stopSweeping();
      done();
    }, 3);
  });

  it('should not sweep old peripherals from the cache when no maximum age was specified', function(done){
    var cache = new PeripheralCache();
    var testPeripheral = {uuid:"12345"};

    cache.addPeripheral(testPeripheral);

    var retrievedPeripheral = cache.getPeripheral(testPeripheral.uuid);
    retrievedPeripheral.should.equal(testPeripheral);

    cache.startSweeping();

    setTimeout(function(){
      cache.contains(testPeripheral.uuid).should.equal(true);
      cache.stopSweeping();
      done();
    }, 3);
  });

  it('should store and retrieve services', function(){
    var cache = new PeripheralCache();

    var testPeripheral = {uuid:"12345"};
    var testService = "test service";
    var testServiceUuid = "67890";

    cache.addPeripheral(testPeripheral);
    cache.addService(testPeripheral.uuid, testServiceUuid, testService);

    var retrievedService = cache.getService(testPeripheral.uuid, testServiceUuid);
    retrievedService.should.equal(testService);
  });

  it('should store and retrieve characteristics', function(){
    var cache = new PeripheralCache();

    var testPeripheral = {uuid:"12345"};
    var testService = "test service";
    var testServiceUuid = "67890";
    var testCharacteristic = "test characteristic";
    var testCharacteristicUuid = "13579";

    cache.addPeripheral(testPeripheral);
    cache.addService(testPeripheral.uuid, testServiceUuid, testService);
    cache.addCharacteristic(testPeripheral.uuid, testServiceUuid, testCharacteristicUuid, testCharacteristic);

    var retrievedCharacteristic = cache.getCharacteristic(testPeripheral.uuid, testServiceUuid, testCharacteristicUuid);
    retrievedCharacteristic.should.equal(testCharacteristic);
  });

  it('should store and retrieve descriptors', function(){
    var cache = new PeripheralCache();

    var testPeripheral = {uuid:"12345"};
    var testService = "test service";
    var testServiceUuid = "67890";
    var testCharacteristic = "test characteristic";
    var testCharacteristicUuid = "13579";
    var testDescriptor = "test desceriptor";
    var testDescriptorUuid = "24680";


    cache.addPeripheral(testPeripheral);
    cache.addService(testPeripheral.uuid, testServiceUuid, testService);
    cache.addCharacteristic(testPeripheral.uuid, testServiceUuid, testCharacteristicUuid, testCharacteristic);
    cache.addDescriptor(testPeripheral.uuid, testServiceUuid, testCharacteristicUuid, testDescriptorUuid, testDescriptor);

    var retrievedDescriptor = cache.getDescriptor(testPeripheral.uuid, testServiceUuid, testCharacteristicUuid, testDescriptorUuid);
    retrievedDescriptor.should.equal(testDescriptor);
  });

});