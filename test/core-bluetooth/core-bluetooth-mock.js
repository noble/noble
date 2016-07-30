var events = require('events');
var util = require('util');

var a = require('../abstract/common');

function Mock(bindings, sandbox){
  this.sandbox = sandbox;
  this.nativePeripheralUuidString      = 'DFE12BB4-4E7F-460D-8C1D-112914E21D9E';
  this.nativeServiceUuidString         = 'A90F0252-4CA8-48BB-AE90-6BC8F541CF8C';
  this.nativeIncludedServiceUuidString = '2D0F40D7-6C81-4336-A1AA-60CBD111317E';
  this.nativeCharacteristicUuidString  = 'E365F8C8-A49D-4B30-8547-FCC791860697';
  this.nativeDescriptorUuidString      = '7DE1AEC6-D5FB-433B-A3D0-77B4E4845CA4';

  this.nativeAdvertisementObject = {  connectable: a.connectableBoolean,
                                      localName: a.localNameString,
                                      txPowerLevel: a.txPowerLevelNumber,
                                      manufacturerData: a.dataBuffer,
                                      serviceData: a.mockServiceData,
                                      serviceUuids: a.serviceUuidsArray };

  this.bindings = bindings;
  this.mockCentral = new NativeCentral();
  this.bindings.init(this.mockCentral);

  this.nativePeripheralObject = new NativePeripheral();
  this.nativePeripheralObject.identifier = this.nativePeripheralUuidString;
  this.nativePeripheralObject.address = a.addressString;
  this.nativePeripheralObject.services = [];

  this.nativeServiceObject = new NativeService();
  this.nativeServiceObject.uuid = this.nativeServiceUuidString;

  this.nativeIncludedServiceObject = new NativeService();
  this.nativeIncludedServiceObject.uuid = this.nativeIncludedServiceUuidString;

  this.nativeCharacteristicObject = new NativeCharacteristic();
  this.nativeCharacteristicObject.uuid = this.nativeCharacteristicUuidString;
  this.nativeCharacteristicObject.properties = [];

  this.nativeDescriptorObject = new NativeDescriptor();
  this.nativeDescriptorObject.uuid = this.nativeDescriptorUuidString;
}


Mock.prototype.discoverPeripheral = function(){
  this.mockCentral.emit('peripheralDiscover', this.nativePeripheralObject, this.nativeAdvertisementObject, a.rssiNumber);
};

Mock.prototype.discoverServices = function(){
  var self = this;
  this.sandbox.stub(this.nativePeripheralObject, "discoverServices", function(){
    this.emit('servicesDiscover', [self.nativeServiceObject], a.mockError);
  });

  this.bindings.discoverServices(a.peripheralUuidString, a.serviceUuidsArray);
};

Mock.prototype.discoverCharacteristics = function(){
  var self = this;
  this.sandbox.stub(this.nativeServiceObject, "discoverCharacteristics", function(){
    this.emit('characteristicsDiscover', [self.nativeCharacteristicObject], a.mockError);
  });

  this.bindings.discoverCharacteristics(a.peripheralUuidString, a.serviceUuidString, [a.characteristicUuidString]);
};

Mock.prototype.discoverDescriptors = function(){
  var self = this;
  this.sandbox.stub(this.nativeCharacteristicObject, "discoverDescriptors", function(){
    this.emit('descriptorsDiscover', [self.nativeDescriptorObject], a.mockError);
  });

  this.bindings.discoverDescriptors(a.peripheralUuidString, a.serviceUuidString, a.characteristicUuidString);
};




function NativeCentral() {}
util.inherits(NativeCentral, events.EventEmitter);

NativeCentral.prototype.scanForPeripherals = function(){};
NativeCentral.prototype.stopScan = function(){};

function NativePeripheral() {}
util.inherits(NativePeripheral, events.EventEmitter);

NativePeripheral.prototype.discoverServices = function(){};

NativePeripheral.prototype.connect = function(){};

NativePeripheral.prototype.cancelConnection = function(){};

NativePeripheral.prototype.readRSSI = function(){};

function NativeService() {}
util.inherits(NativeService, events.EventEmitter);

NativeService.prototype.discoverIncludedServices = function(){};
NativeService.prototype.discoverCharacteristics = function(){};

function NativeCharacteristic() {}
util.inherits(NativeCharacteristic, events.EventEmitter);

NativeCharacteristic.prototype.writeValue = function(){};
NativeCharacteristic.prototype.readValue = function(){};
NativeCharacteristic.prototype.setNotifyValue = function(){};
NativeCharacteristic.prototype.discoverDescriptors = function(){};

function NativeDescriptor() {}
util.inherits(NativeDescriptor, events.EventEmitter);

NativeDescriptor.prototype.readValue = function(){};
NativeDescriptor.prototype.writeValue = function(){};

module.exports = Mock;
