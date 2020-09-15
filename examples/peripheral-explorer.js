/* eslint-disable handle-callback-err */
const async = require('async');
const noble = require('../index');

const peripheralIdOrAddress = process.argv[2].toLowerCase();

noble.on('stateChange', function (state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', function (peripheral) {
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

function explore (peripheral) {
  console.log('services and characteristics:');

  peripheral.on('disconnect', function () {
    process.exit(0);
  });

  peripheral.connect(function (error) {
    peripheral.discoverServices([], function (error, services) {
      let serviceIndex = 0;

      async.whilst(
        function () {
          return (serviceIndex < services.length);
        },
        function (callback) {
          const service = services[serviceIndex];
          let serviceInfo = service.uuid;

          if (service.name) {
            serviceInfo += ` (${service.name})`;
          }
          console.log(serviceInfo);

          service.discoverCharacteristics([], function (error, characteristics) {
            let characteristicIndex = 0;

            async.whilst(
              function () {
                return (characteristicIndex < characteristics.length);
              },
              function (callback) {
                const characteristic = characteristics[characteristicIndex];
                let characteristicInfo = `  ${characteristic.uuid}`;

                if (characteristic.name) {
                  characteristicInfo += ` (${characteristic.name})`;
                }

                async.series([
                  function (callback) {
                    characteristic.discoverDescriptors(function (error, descriptors) {
                      async.detect(
                        descriptors,
                        function (descriptor, callback) {
                          if (descriptor.uuid === '2901') {
                            return callback(descriptor);
                          } else {
                            return callback();
                          }
                        },
                        function (userDescriptionDescriptor) {
                          if (userDescriptionDescriptor) {
                            userDescriptionDescriptor.readValue(function (error, data) {
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
                  function (callback) {
                    characteristicInfo += `\n    properties  ${characteristic.properties.join(', ')}`;

                    if (characteristic.properties.indexOf('read') !== -1) {
                      characteristic.read(function (error, data) {
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
                  function () {
                    console.log(characteristicInfo);
                    characteristicIndex++;
                    callback();
                  }
                ]);
              },
              function (error) {
                serviceIndex++;
                callback();
              }
            );
          });
        },
        function (err) {
          peripheral.disconnect();
        }
      );
    });
  });
}
