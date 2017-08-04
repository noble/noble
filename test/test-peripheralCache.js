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
    var testPeripheral = "test peripheral";
    var testPeripheralUuid = "12345";

    cache.addPeripheral(testPeripheralUuid, testPeripheral);

    var retrievedPeripheral = cache.getPeripheral(testPeripheralUuid);
    retrievedPeripheral.should.equal(testPeripheral);
    cache.contains(testPeripheralUuid).should.equal(true);
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
    var testPeripheral = "test peripheral";
    var testPeripheralUuid = "12345";

    cache.addPeripheral(testPeripheralUuid, testPeripheral);

    var retrievedPeripheral = cache.getPeripheral(testPeripheralUuid);
    retrievedPeripheral.should.equal(testPeripheral);
    cache.contains(testPeripheralUuid).should.equal(true);

    cache.startSweeping();

    setTimeout(function(){
      retrievedPeripheral = cache.getPeripheral(testPeripheralUuid);
      should.not.exist(retrievedPeripheral);
      cache.contains(testPeripheralUuid).should.equal(false);
      cache.stopSweeping();
      done();
    }, 3);
  });

  it('should not sweep old peripherals from the cache when no maximum age was specified', function(done){
    var cache = new PeripheralCache();
    var testPeripheral = "test peripheral";
    var testPeripheralUuid = "12345";

    cache.addPeripheral(testPeripheralUuid, testPeripheral);

    var retrievedPeripheral = cache.getPeripheral(testPeripheralUuid);
    retrievedPeripheral.should.equal(testPeripheral);

    cache.startSweeping();

    setTimeout(function(){
      cache.contains(testPeripheralUuid).should.equal(true);
      cache.stopSweeping();
      done();
    }, 3);
  });

  it('should store and retrieve services', function(){
    var cache = new PeripheralCache();

    var testPeripheral = "test peripheral";
    var testPeripheralUuid = "12345";
    var testService = "test service";
    var testServiceUuid = "67890";

    cache.addPeripheral(testPeripheralUuid, testPeripheral);
    cache.addService(testPeripheralUuid, testServiceUuid, testService);

    var retrievedService = cache.getService(testPeripheralUuid, testServiceUuid);
    retrievedService.should.equal(testService);
  });

  it('should store and retrieve characteristics', function(){
    var cache = new PeripheralCache();

    var testPeripheral = "test peripheral";
    var testPeripheralUuid = "12345";
    var testService = "test service";
    var testServiceUuid = "67890";
    var testCharacteristic = "test characteristic";
    var testCharacteristicUuid = "13579";

    cache.addPeripheral(testPeripheralUuid, testPeripheral);
    cache.addService(testPeripheralUuid, testServiceUuid, testService);
    cache.addCharacteristic(testPeripheralUuid, testServiceUuid, testCharacteristicUuid, testCharacteristic);

    var retrievedCharacteristic = cache.getCharacteristic(testPeripheralUuid, testServiceUuid, testCharacteristicUuid);
    retrievedCharacteristic.should.equal(testCharacteristic);
  });

  it('should store and retrieve descriptors', function(){
    var cache = new PeripheralCache();

    var testPeripheral = "test peripheral";
    var testPeripheralUuid = "12345";
    var testService = "test service";
    var testServiceUuid = "67890";
    var testCharacteristic = "test characteristic";
    var testCharacteristicUuid = "13579";
    var testDescriptor = "test desceriptor";
    var testDescriptorUuid = "24680";


    cache.addPeripheral(testPeripheralUuid, testPeripheral);
    cache.addService(testPeripheralUuid, testServiceUuid, testService);
    cache.addCharacteristic(testPeripheralUuid, testServiceUuid, testCharacteristicUuid, testCharacteristic);
    cache.addDescriptor(testPeripheralUuid, testServiceUuid, testCharacteristicUuid, testDescriptorUuid, testDescriptor);

    var retrievedDescriptor = cache.getDescriptor(testPeripheralUuid, testServiceUuid, testCharacteristicUuid, testDescriptorUuid);
    retrievedDescriptor.should.equal(testDescriptor);
  });

});