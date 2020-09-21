/* eslint-disable handle-callback-err */
/** reconnect to a device that has been discovered earlier on using cache-gatt-discovery:
 * If a device is discovered and a dump file exists, load it and connect to it, re-initializing service
 * and characteristic objects in the noble stack.
 * Finds a temperature characteristic and registers for data.
 * Prints timing information from discovered to connected to reading states.
 */

const noble = require('../index');
const fs = require('fs');

// the sensor value to scan for, number of bits and factor for displaying it
const CHANNEL = process.env.CHANNEL ? process.env.CHANNEL : 'Temperature';
const BITS = process.env.BITS ? 1 * process.env.BITS : 16;
const FACTOR = process.env.FACTOR ? 1.0 * process.env.FACTOR : 0.1;

const EXT = '.dump';

noble.on('stateChange', function (state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

let tDisco = 0; // time when device was discovered
let tConn = 0; // time when connection to device was established
let tRead = 0; // time when reading data starts.

// collect device meta-data into this object:
let meta = {
  services: {}, // a map indexted by service-UUID -> contains service data
  characteristics: {} // an map with key service-UUID, stores the array of characteristics
};

noble.on('discover', function (peripheral) {
  console.log(`peripheral discovered (${peripheral.id} with address <${peripheral.address}, ${peripheral.addressType}>, connectable ${peripheral.connectable}, RSSI ${peripheral.rssi}:`);
  console.log('\thello my local name is:');
  console.log(`\t\t${peripheral.advertisement.localName}`);
  console.log();

  // Check if a dump  exists in the current directory.
  fs.access(peripheral.uuid + EXT, fs.constants.F_OK, (err) => {
    if (!err) {
      console.log(`found dump file for ${peripheral.uuid}`);

      tDisco = Date.now();

      quickConnect(peripheral);
    }
  });
});

const quickConnect = function (peripheral) {
  // BLE cannot scan and connect in parallel, so we stop scanning here:
  noble.stopScanning();

  peripheral.connect((error) => {
    if (error) {
      console.log(`Connect error: ${error}`);
      noble.startScanning([], true);
      return;
    }
    tConn = Date.now();
    console.log('Connected!');

    // load stored data. This needs to be done when connected, as we need a handle at GATT level
    meta = loadData(peripheral);

    // initialize the service and charateristics objects in Noble; return a temperature characteristic, if found
    const sensorCharacteristic = setData(peripheral, meta);

    if (!sensorCharacteristic) {
      console.log('Warning - no temperature characteristic found.');
    } else {
      console.log('Listening for temperature data...');

      tRead = Date.now();

      sensorCharacteristic.on('data', (data) => {
        if (BITS === 16) {
          console.log(` new ${CHANNEL} ${data.readUInt16LE() * FACTOR}`);
        } else if (BITS === 32) {
          console.log(` new ${CHANNEL} ${data.readUInt32LE() * FACTOR}`);
        } else {
          console.log(` Cannot cope with BITS value ${BITS}`);
        }
      });
      sensorCharacteristic.read();

      console.log(`Timespan from discovery to connected: ${tConn - tDisco} ms`);
      console.log(`Timespan from connected to reading  : ${tRead - tConn} ms`);
    }
  });
};

const loadData = function (peripheral) {
  const dump = fs.readFileSync(peripheral.uuid + EXT);
  const data = JSON.parse(dump);

  // verify data: console.log(JSON.stringify(data,null,2))
  return data;
};

const setData = function (peripheral, meta) {
  // first, create the service objects:
  console.log('initializing services... ');

  // addServices returns an array of initialized service objects
  const services = noble.addServices(peripheral.uuid, meta.services);

  console.log('initialized services: ');
  for (const i in services) {
    const service = services[i];
    console.log(`\tservice ${i} ${service}`);
  }
  console.log();

  let sensorCharacteristic;

  console.log('initializing characteristics... ');
  // now, for each service, set the characteristics:
  for (const i in services) {
    const service = services[i];
    const charas = meta.characteristics[service.uuid];
    console.log(`\tservice ${i} ${service} ${JSON.stringify(charas)}`);

    const characteristics = noble.addCharacteristics(peripheral.uuid, service.uuid, charas);

    for (const j in characteristics) {
      const characteristic = characteristics[j];
      console.log(`\t\tcharac ${service.uuid} ${j} ${characteristic} ${characteristic.rawProps}`);
      if (characteristic.name === CHANNEL) {
        console.log(`\t\t\t-->found ${CHANNEL} characteristic!`);
        sensorCharacteristic = characteristic;
      }
    }
  }
  return sensorCharacteristic;
};
