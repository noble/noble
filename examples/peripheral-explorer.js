/* eslint-disable no-console */
const async = require('async');
const noble = require('../index');

const peripheralIdOrAddress = process.argv[2].toLowerCase();

noble.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', (peripheral) => {
  if (peripheral.id === peripheralIdOrAddress || peripheral.address === peripheralIdOrAddress) {
    noble.stopScanning();

    console.log(`peripheral with ID ${peripheral.id} found`);
    const advertisement = peripheral.advertisement;

    const localName = advertisement.localName;
    const txPowerLevel = advertisement.txPowerLevel;
    const manufacturerData = advertisement.manufacturerData;
    const serviceData = advertisement.serviceData;
    const serviceUuids = advertisement.serviceUuids;

    if (localName) {
      console.log(`  Local Name        = ${localName}`);
    }

    if (txPowerLevel) {
      console.log(`  TX Power Level    = ${txPowerLevel}`);
    }

    if (manufacturerData) {
      console.log(`  Manufacturer Data = ${manufacturerData.toString('hex')}`);
    }

    if (serviceData) {
      console.log(`  Service Data      = ${JSON.stringify(serviceData, null, 2)}`);
    }

    if (serviceUuids) {
      console.log(`  Service UUIDs     = ${serviceUuids}`);
    }

    console.log();

    explore(peripheral);
  }
});

function explore(peripheral) {
  console.log('services and characteristics:');

  peripheral.on('disconnect', () => {
    process.exit(0);
  });

  peripheral.connect((error) => {
    peripheral.discoverServices([], (error, services) => {
      let serviceIndex = 0;

      async.whilst(
        () => {
          return (serviceIndex < services.length);
        },
        (callback) => {
          const service = services[serviceIndex];
          let serviceInfo = service.uuid;

          if (service.name) {
            serviceInfo += ` (${service.name})`;
          }
          console.log(serviceInfo);

          service.discoverCharacteristics([], (error, characteristics) => {
            let characteristicIndex = 0;

            async.whilst(
              () => {
                return (characteristicIndex < characteristics.length);
              },
              (callback) => {
                const characteristic = characteristics[characteristicIndex];
                let characteristicInfo = `  ${characteristic.uuid}`;

                if (characteristic.name) {
                  characteristicInfo += ` (${characteristic.name})`;
                }

                async.series([
                  function(callback) {
                    characteristic.discoverDescriptors((error, descriptors) => {
                      async.detect(
                        descriptors,
                        (descriptor, callback) => {
                          if (descriptor.uuid === '2901') {
                            return callback(descriptor);
                          } else {
                            return callback();
                          }
                        },
                        (userDescriptionDescriptor) => {
                          if (userDescriptionDescriptor) {
                            userDescriptionDescriptor.readValue((error, data) => {
                              if (data) {
                                characteristicInfo += ` (${data.toString()})`;
                              }
                              callback();
                            });
                          } else {
                            callback();
                          }
                        }
                      );
                    });
                  },
                  function(callback) {
                    characteristicInfo += `\n    properties  ${characteristic.properties.join(', ')}`;

                    if (characteristic.properties.includes('read')) {
                      characteristic.read((error, data) => {
                        if (data) {
                          const string = data.toString('ascii');

                          characteristicInfo += `\n    value       ${data.toString('hex')} | '${string}'`;
                        }
                        callback();
                      });
                    } else {
                      callback();
                    }
                  },
                  function() {
                    console.log(characteristicInfo);
                    characteristicIndex++;
                    callback();
                  }
                ]);
              },
              (error) => {
                serviceIndex++;
                callback();
              }
            );
          });
        },
        (err) => {
          peripheral.disconnect();
        }
      );
    });
  });
}

