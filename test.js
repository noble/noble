/* eslint-disable no-console */
const noble = require('./index');

console.log('noble');

noble.on('stateChange', (state) => {
  console.log(`on -> stateChange: ${state}`);

  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('scanStart', () => {
  console.log('on -> scanStart');
});

noble.on('scanStop', () => {
  console.log('on -> scanStop');
});



noble.on('discover', (peripheral) => {
  console.log(`on -> discover: ${peripheral}`);

  noble.stopScanning();

  peripheral.on('connect', function() {
    console.log('on -> connect');
    this.updateRssi();
  });

  peripheral.on('disconnect', () => {
    console.log('on -> disconnect');
  });

  peripheral.on('rssiUpdate', function(rssi) {
    console.log(`on -> RSSI update ${rssi}`);
    this.discoverServices();
  });

  peripheral.on('servicesDiscover', (services) => {
    console.log(`on -> peripheral services discovered ${services}`);

    const serviceIndex = 0;

    services[serviceIndex].on('includedServicesDiscover', function(includedServiceUuids) {
      console.log(`on -> service included services discovered ${includedServiceUuids}`);
      this.discoverCharacteristics();
    });

    services[serviceIndex].on('characteristicsDiscover', (characteristics) => {
      console.log(`on -> service characteristics discovered ${characteristics}`);

      const characteristicIndex = 0;

      characteristics[characteristicIndex].on('read', (data, isNotification) => {
        console.log(`on -> characteristic read ${data} ${isNotification}`);
        console.log(data);

        peripheral.disconnect();
      });

      characteristics[characteristicIndex].on('write', () => {
        console.log('on -> characteristic write ');

        peripheral.disconnect();
      });

      characteristics[characteristicIndex].on('broadcast', (state) => {
        console.log(`on -> characteristic broadcast ${state}`);

        peripheral.disconnect();
      });

      characteristics[characteristicIndex].on('notify', (state) => {
        console.log(`on -> characteristic notify ${state}`);

        peripheral.disconnect();
      });

      characteristics[characteristicIndex].on('descriptorsDiscover', (descriptors) => {
        console.log(`on -> descriptors discover ${descriptors}`);

        const descriptorIndex = 0;

        descriptors[descriptorIndex].on('valueRead', (data) => {
          console.log(`on -> descriptor value read ${data}`);
          console.log(data);
          peripheral.disconnect();
        });

        descriptors[descriptorIndex].on('valueWrite', () => {
          console.log('on -> descriptor value write ');
          peripheral.disconnect();
        });

        descriptors[descriptorIndex].readValue();
        //descriptors[descriptorIndex].writeValue(Buffer.from([0]));
      });


      characteristics[characteristicIndex].read();
      //characteristics[characteristicIndex].write(Buffer.from('hello'));
      //characteristics[characteristicIndex].broadcast(true);
      //characteristics[characteristicIndex].notify(true);
      // characteristics[characteristicIndex].discoverDescriptors();
    });


    services[serviceIndex].discoverIncludedServices();
  });

  peripheral.connect();
});

