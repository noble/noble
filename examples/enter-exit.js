/* eslint-disable no-console */
/*
  Continously scans for peripherals and prints out message when they enter/exit

    In range criteria:      RSSI < threshold
    Out of range criteria:  lastSeen > grace period

  based on code provided by: Mattias Ask (http://www.dittlof.com)
*/
const noble = require('../index');

const RSSI_THRESHOLD    = -90;
const EXIT_GRACE_PERIOD = 2000; // milliseconds

const inRange = {};

noble.on('discover', (peripheral) => {
  if (peripheral.rssi < RSSI_THRESHOLD) {
    // ignore
    return;
  }

  const id = peripheral.id;
  const entered = !inRange[id];

  if (entered) {
    inRange[id] = {
      peripheral: peripheral
    };

    console.log(`"${peripheral.advertisement.localName}" entered (RSSI ${peripheral.rssi}) ${new Date()}`);
  }

  inRange[id].lastSeen = Date.now();
});

setInterval(() => {
  for (const id in inRange) {
    if (inRange[id].lastSeen < (Date.now() - EXIT_GRACE_PERIOD)) {
      const peripheral = inRange[id].peripheral;

      console.log(`"${peripheral.advertisement.localName}" exited (RSSI ${peripheral.rssi}) ${new Date()}`);

      delete inRange[id];
    }
  }
}, EXIT_GRACE_PERIOD / 2);

noble.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    noble.startScanning([], true);
  } else {
    noble.stopScanning();
  }
});
