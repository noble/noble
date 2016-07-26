

// all noble specific stuff not to be touched
  var peripheralUuidString      = 'd0034b3175f2';
  var serviceUuidString         = 'a90f02524ca848bbae906bc8f541cf8c';
  var includedServiceUuidString = '2d0f40d76c814336a1aa60cbd111317e';
  var characteristicUuidString  = 'e365f8c8a49d4b308547fcc791860697';
  var descriptorUuidString      = '7de1aec6d5fb433ba3d077b4e4845ca4';

  var bindingsCharacteristicObject = {  uuid: characteristicUuidString,
                                        properties: [] };

  var serviceUuidsArray = [serviceUuidString];

  var addressString = 'd0:03:4b:31:75:f2';
  var addressTypeString = 'unknown';
  var connectableBoolean = true;
  var notifyBoolean = false;
  var rssiNumber = -47;
  var stateString = 'public';
  var mockError = new Error('Connection Timeout');
  var localNameString = 'mock-name';
  var mockServiceData = {};
  var txPowerLevelNumber = 0;
  var dataBuffer = new Buffer([0x02, 0x01, 0x00]);

  var advertisementObject = { localName: localNameString,
                              txPowerLevel: txPowerLevelNumber,
                              manufacturerData: dataBuffer,
                              serviceData: mockServiceData,
                              serviceUuids: serviceUuidsArray };

  module.exports = {
    peripheralUuidString: peripheralUuidString,
    serviceUuidString: serviceUuidString,
    includedServiceUuidString: includedServiceUuidString,
    characteristicUuidString: characteristicUuidString,
    descriptorUuidString: descriptorUuidString,
    bindingsCharacteristicObject: bindingsCharacteristicObject,
    serviceUuidsArray: serviceUuidsArray,
    addressString: addressString,
    addressTypeString: addressTypeString,
    connectableBoolean: connectableBoolean,
    notifyBoolean: notifyBoolean,
    rssiNumber: rssiNumber,
    stateString: stateString,
    mockError: mockError,
    localNameString: localNameString,
    mockServiceData: mockServiceData,
    txPowerLevelNumber: txPowerLevelNumber,
    dataBuffer: dataBuffer,
    advertisementObject: advertisementObject
  };
