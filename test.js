var noble = require('./index');

console.log('noble');

noble.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);

  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('scanStart', function() {
  console.log('on -> scanStart');
});

noble.on('scanStop', function() {
  console.log('on -> scanStop');
});



noble.on('peripheralDiscover', function(peripheral) {
  console.log('on -> peripheralDiscover: ' + peripheral);

  noble.stopScanning();

  peripheral.on('connect', function() {
    console.log('on -> peripheral connect');
    this.updateRssi();
  });

  // peripheral.on('connectFailure', function(reason) {
  //   console.log('on -> peripheral connect failure');
  //   console.log(reason);
  // });

  peripheral.on('disconnect', function() {
    console.log('on -> peripheral disconnect');
  });

  peripheral.on('rssiUpdate', function(rssi) {
    console.log('on -> peripheral RSSI update ' + rssi);
    this.discoverServices();
  });

  peripheral.on('servicesDiscover', function(services) {
    console.log('on -> peripheral services discovered ' + services);

    var serviceIndex = 1;

    services[serviceIndex].on('includedServicesDiscover', function(includedServiceUuids) {
      console.log('on -> service included services discovered ' + includedServiceUuids);
      this.discoverCharacteristics();
    });

    services[serviceIndex].on('characteristicsDiscover', function(characteristics) {
      console.log('on -> service characteristics discovered ' + characteristics);

      var characteristicIndex = 0;

      characteristics[characteristicIndex].on('read', function(data, isNotification) {
        console.log('on -> characteristic read ' + data + ' ' + isNotification);
        console.log(data);
      });

      characteristics[characteristicIndex].on('write', function() {
        console.log('on -> characteristic write ');
      });

      characteristics[characteristicIndex].on('broadcast', function(state) {
        console.log('on -> characteristic broadcast ' + state);
      });

      characteristics[characteristicIndex].on('notify', function(state) {
        console.log('on -> characteristic notify ' + state);
      });

      characteristics[characteristicIndex].on('descriptorsDiscover', function(descriptors) {
        console.log('on -> characteristic descriptors discover ' + descriptors);

        var descriptorIndex = 0;

        descriptors[descriptorIndex].on('valueRead', function(data) {
          console.log('on -> descriptor value read ' + data);
          console.log(data);
        });

        descriptors[descriptorIndex].on('valueWrite', function() {
          console.log('on -> descriptor value write ');
        });

        descriptors[descriptorIndex].readValue();
        descriptors[descriptorIndex].writeValue(new Buffer(0));
      });

      characteristics[characteristicIndex].on('descriptorValueRead', function(descriptor, data) {
        console.log('on -> characteristic descriptor value read ' + descriptor + ' ' + data);
      });

      characteristics[characteristicIndex].on('descriptorValueWrite', function(descriptor) {
        console.log('on -> characteristic descriptor value write ' + descriptor);
      });

      //characteristics[characteristicIndex].read();
      //characteristics[characteristicIndex].write(new Buffer('hello'));
      //characteristics[characteristicIndex].broadcast(true);
      //characteristics[characteristicIndex].notify(true);
      characteristics[characteristicIndex].discoverDescriptors();
    });

    services[serviceIndex].on('characteristicRead', function(characteristic, data, isNotification) {
      console.log('on -> service characteristic read ' + characteristic + ' ' + data + ' ' + isNotification);
      peripheral.disconnect();
    });

    services[serviceIndex].on('characteristicWrite', function(characteristic) {
      console.log('on -> service characteristic write ' + characteristic);
      peripheral.disconnect();
    });

    services[serviceIndex].on('characteristicBroadcast', function(characteristic, state) {
      console.log('on -> service characteristic broadcast ' + characteristic + ' ' + state);
      peripheral.disconnect();
    });

    services[serviceIndex].on('characteristicNotify', function(characteristic, state) {
      console.log('on -> service characteristic notify ' + characteristic + ' ' + state);
      // peripheral.disconnect();
    });

    services[serviceIndex].on('characteristicDescriptorsDiscover', function(characteristic, descriptors) {
      console.log('on -> service characteristic descriptors discover ' + characteristic + ' ' + descriptors);
      // peripheral.disconnect();
    });

    services[serviceIndex].on('characteristicDescriptorValueRead', function(characteristic, descriptor, data) {
      console.log('on -> service characteristic descriptor value read ' + characteristic + ' ' + descriptor + ' ' + data);
      peripheral.disconnect();
    });

    services[serviceIndex].on('characteristicDescriptorValueWrite', function(characteristic, descriptor) {
      console.log('on -> service characteristic descriptor value write ' + characteristic + ' ' + descriptor);
      peripheral.disconnect();
    });

    services[serviceIndex].discoverIncludedServices();
  });

  peripheral.on('serviceIncludedServicesDiscover', function(service, includedServiceUuids) {
    console.log('on -> peripheral service included services discovered ' + service + ' ' + includedServiceUuids);
  });

  peripheral.on('serviceCharacteristicsDiscover', function(service, characteristics) {
    console.log('on -> peripheral service characteristics discovered ' + service + ' ' + characteristics);
  });

  peripheral.on('serviceCharacteristicRead', function(service, characteristic, data, isNotification) {
    console.log('on -> peripheral service characteristic read ' + service + ' ' + characteristic + ' ' + data + ' ' + isNotification);
  });

  peripheral.on('serviceCharacteristicWrite', function(service, characteristic) {
    console.log('on -> peripheral service characteristic write ' + service + ' ' + characteristic);
  });

  peripheral.on('serviceCharacteristicBroadcast', function(service, characteristic, state) {
    console.log('on -> peripheral service characteristic broadcast ' + service + ' ' + characteristic + ' ' + state);
  });

  peripheral.on('serviceCharacteristicNotify', function(service, characteristic, state) {
    console.log('on -> peripheral service characteristic notify ' + service + ' ' + characteristic + ' ' + state);
  });

  peripheral.on('serviceCharacteristicDescriptorsDiscover', function(service, characteristic, descriptors) {
    console.log('on -> peripheral service characteristic descriptors discover ' + service + ' ' + characteristic + ' ' + descriptors);
  });

  peripheral.on('serviceCharacteristicDescriptorValueRead', function(service, characteristic, descriptor, data) {
    console.log('on -> peripheral service characteristic descriptor value read ' + service + ' ' + characteristic + ' ' + descriptor + ' ' + data);
  });

  peripheral.on('serviceCharacteristicDescriptorValueWrite', function(service, characteristic, descriptor) {
    console.log('on -> peripheral service characteristic descriptor value write ' + service + ' ' + characteristic + ' ' + descriptor);
  });

  peripheral.connect();
});

noble.on('peripheralConnect', function(peripheral) {
  console.log('on -> peripheralConnect: ' + peripheral);
});

// noble.on('peripheralConnectFailure', function(peripheral, reason) {
//   console.log('on -> peripheralConnectFailure: ');
//   console.log(peripheral);
//   console.log(reason);
// });

noble.on('peripheralDisconnect', function(peripheral) {
  console.log('on -> peripheralDisconnect: ' + peripheral);
});

noble.on('peripheralRssiUpdate', function(peripheral, rssi) {
  console.log('on -> peripheralRssiUpdate: ' + peripheral + ' ' + rssi);
});

noble.on('peripheralServicesDiscover', function(peripheral, services) {
  console.log('on -> peripheralServicesDiscover: ' + peripheral + ' ' + services);
});

noble.on('peripheralServiceIncludedServicesDiscover', function(peripheral, service, includedServiceUuids) {
  console.log('on -> peripheralServicesDiscover: ' + peripheral + ' ' + service + ' ' + includedServiceUuids);
});

noble.on('peripheralServiceCharacteristicsDiscover', function(peripheral, service, characteristics) {
  console.log('on -> peripheralServiceCharacteristicsDiscover: ' + peripheral + ' ' + service + ' ' + characteristics);
});

noble.on('peripheralServiceCharacteristicRead', function(peripheral, service, characteristic, data, isNotification) {
  console.log('on -> peripheralServiceCharacteristicRead: ' + peripheral + ' ' + service + ' ' + characteristic + ' ' + data + ' ' + isNotification);
});

noble.on('peripheralServiceCharacteristicWrite', function(peripheral, service, characteristic) {
  console.log('on -> peripheralServiceCharacteristicWrite: ' + peripheral + ' ' + service + ' ' + characteristic);
});

noble.on('peripheralServiceCharacteristicBroadcast', function(peripheral, service, characteristic, state) {
  console.log('on -> peripheralServiceCharacteristicBroadcast: ' + peripheral + ' ' + service + ' ' + characteristic + ' ' + state);
});

noble.on('peripheralServiceCharacteristicNotify', function(peripheral, service, characteristic, state) {
  console.log('on -> peripheralServiceCharacteristicNotify: ' + peripheral + ' ' + service + ' ' + characteristic + ' ' + state);
});

noble.on('peripheralServiceCharacteristicDescriptorsDiscover', function(peripheral, service, characteristic, descriptors) {
  console.log('on -> peripheralServiceCharacteristicDescriptorsDiscover: ' + peripheral + ' ' + service + ' ' + characteristic + ' ' + descriptors);
});

noble.on('peripheralServiceCharacteristicDescriptorValueRead', function(peripheral, service, characteristic, descriptor, data) {
  console.log('on -> peripheralServiceCharacteristicDescriptorValueRead: ' + peripheral + ' ' + service + ' ' + characteristic + ' ' + descriptor + ' ' + data);
});

noble.on('peripheralServiceCharacteristicDescriptorValueWrite', function(peripheral, service, characteristic, descriptor) {
  console.log('on -> peripheralServiceCharacteristicDescriptorValueWrite: ' + peripheral + ' ' + service + ' ' + characteristic + ' ' + descriptor);
});
