const debug = require('debug')('slave');
const WebSocket = require('ws');

const noble = require('./index');

const serverMode = !process.argv[2];
const port = 0xB1e;
const host = process.argv[2];


let ws;
let wss;

if (serverMode) {
  debug('noble - ws slave - server mode');
  wss = new WebSocket.Server({
    port: 0xB1e
  });

  wss.on('connection', function(ws_) {
    debug('ws -> connection');

    ws = ws_;

    ws.on('message', onMessage);

    ws.on('close', function() {
      debug('ws -> close');
      noble.stopScanning();
    });

    noble.on('stateChange', function(state) {
      sendEvent({
        type: 'stateChange',
        state: state
      });
    });

    // Send poweredOn if already in this state.
    if (noble.state === 'poweredOn') {
      sendEvent({
        type: 'stateChange',
        state: 'poweredOn'
      });
    }


  });
} else {
  ws = new WebSocket(`ws://${host}:${port}`);

  ws.on('open', function() {
    debug('ws -> open');
  });

  ws.on('message', function(message) {
    onMessage(message);
  });

  ws.on('close', function() {
    debug('ws -> close');

    noble.stopScanning();
  });
}

const peripherals = {};

// TODO: open/close ws on state change

function sendEvent(event) {
  const message = JSON.stringify(event);

  debug(`ws -> send: ${message}`);

  const clients = serverMode ? wss.clients : new Set([ws]);

  for (const client of clients) {
    client.send(message);
  }
}

const onMessage = function(message) {
  debug(`ws -> message: ${message}`);

  const command = JSON.parse(message);

  const action = command.action;
  const peripheralUuid = command.peripheralUuid;
  const serviceUuids = command.serviceUuids;
  const serviceUuid = command.serviceUuid;
  const characteristicUuids = command.characteristicUuids;
  const characteristicUuid = command.characteristicUuid;
  const data = command.data ? Buffer.from(command.data, 'hex') : null;
  const withoutResponse = command.withoutResponse;
  const broadcast = command.broadcast;
  const notify = command.notify;
  const descriptorUuid = command.descriptorUuid;
  const handle = handle;

  const peripheral = peripherals[peripheralUuid];
  let service = null;
  let characteristic = null;
  let descriptor = null;


  if (peripheral && serviceUuid) {
    const services = peripheral.services;

    for (const i in services) {
      if (services[i].uuid === serviceUuid) {
        service = services[i];

        if (characteristicUuid) {
          const characteristics = service.characteristics;

          for (const j in characteristics) {
            if (characteristics[j].uuid === characteristicUuid) {
              characteristic = characteristics[j];

              if (descriptorUuid) {
                const descriptors = characteristic.descriptors;

                for (const k in descriptors) {
                  if (descriptors[k].uuid === descriptorUuid) {
                    descriptor = descriptors[k];
                    break;
                  }
                }
              }
              break;
            }
          }
        }
        break;
      }
    }
  }

  if (action === 'startScanning') {
    noble.startScanning(serviceUuids, command.allowDuplicates);
  } else if (action === 'stopScanning') {
    noble.stopScanning();
  } else if (action === 'connect') {
    peripheral.connect();
  } else if (action === 'disconnect') {
    peripheral.disconnect();
  } else if (action === 'updateRssi') {
    peripheral.updateRssi();
  } else if (action === 'discoverServices') {
    peripheral.discoverServices(command.uuids);
  } else if (action === 'discoverIncludedServices') {
    service.discoverIncludedServices(serviceUuids);
  } else if (action === 'discoverCharacteristics') {
    service.discoverCharacteristics(characteristicUuids);
  } else if (action === 'read') {
    characteristic.read();
  } else if (action === 'write') {
    characteristic.write(data, withoutResponse);
  } else if (action === 'broadcast') {
    characteristic.broadcast(broadcast);
  } else if (action === 'notify') {
    characteristic.notify(notify);
  } else if (action === 'discoverDescriptors') {
    characteristic.discoverDescriptors();
  } else if (action === 'readValue') {
    descriptor.readValue();
  } else if (action === 'writeValue') {
    descriptor.writeValue(data);
  } else if (action === 'readHandle') {
    peripheral.readHandle(handle);
  } else if (action === 'writeHandle') {
    peripheral.writeHandle(handle, data, withoutResponse);
  }
};

noble.on('discover', function(peripheral) {
  peripherals[peripheral.uuid] = peripheral;

  peripheral.on('connect', function() {
    sendEvent({
      type: 'connect',
      peripheralUuid: this.uuid
    });
  });

  peripheral.on('disconnect', function() {
    sendEvent({
      type: 'disconnect',
      peripheralUuid: this.uuid
    });

    for (const i in this.services) {
      for (const j in this.services[i].characteristics) {
        for (const k in this.services[i].characteristics[j].descriptors) {
          this.services[i].characteristics[j].descriptors[k].removeAllListeners();
        }

        this.services[i].characteristics[j].removeAllListeners();
      }
      this.services[i].removeAllListeners();
    }

    this.removeAllListeners();
  });

  peripheral.on('rssiUpdate', function(rssi) {
    sendEvent({
      type: 'rssiUpdate',
      peripheralUuid: this.uuid,
      rssi: rssi
    });
  });

  peripheral.on('servicesDiscover', function(services) {
    const peripheral = this;
    const serviceUuids = [];

    const includedServicesDiscover = function(includedServiceUuids) {
      sendEvent({
        type: 'includedServicesDiscover',
        peripheralUuid: peripheral.uuid,
        serviceUuid: this.uuid,
        includedServiceUuids: includedServiceUuids
      });
    };

    const characteristicsDiscover = function(characteristics) {
      const service = this;
      const discoveredCharacteristics = [];

      const read = function(data, isNotification) {
        const characteristic = this;

        sendEvent({
          type: 'read',
          peripheralUuid: peripheral.uuid,
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid,
          data: data.toString('hex'),
          isNotification: isNotification
        });
      };

      const write = function() {
        const characteristic = this;

        sendEvent({
          type: 'write',
          peripheralUuid: peripheral.uuid,
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid
        });
      };

      const broadcast = function(state) {
        const characteristic = this;

        sendEvent({
          type: 'broadcast',
          peripheralUuid: peripheral.uuid,
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid,
          state: state
        });
      };

      const notify = function(state) {
        const characteristic = this;

        sendEvent({
          type: 'notify',
          peripheralUuid: peripheral.uuid,
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid,
          state: state
        });
      };

      const descriptorsDiscover = function(descriptors) {
        const characteristic = this;

        const discoveredDescriptors = [];

        const valueRead = function(data) {
          const descriptor = this;

          sendEvent({
            type: 'valueRead',
            peripheralUuid: peripheral.uuid,
            serviceUuid: service.uuid,
            characteristicUuid: characteristic.uuid,
            descriptorUuid: descriptor.uuid,
            data: data.toString('hex')
          });
        };

        const valueWrite = function(data) {
          const descriptor = this;

          sendEvent({
            type: 'valueWrite',
            peripheralUuid: peripheral.uuid,
            serviceUuid: service.uuid,
            characteristicUuid: characteristic.uuid,
            descriptorUuid: descriptor.uuid
          });
        };

        for (const k in descriptors) {
          descriptors[k].on('valueRead', valueRead);

          descriptors[k].on('valueWrite', valueWrite);

          discoveredDescriptors.push(descriptors[k].uuid);
        }

        sendEvent({
          type: 'descriptorsDiscover',
          peripheralUuid: peripheral.uuid,
          serviceUuid: service.uuid,
          characteristicUuid: this.uuid,
          descriptors: discoveredDescriptors
        });
      };

      for (let j = 0; j < characteristics.length; j++) {
        characteristics[j].on('read', read);

        characteristics[j].on('write', write);

        characteristics[j].on('broadcast', broadcast);

        characteristics[j].on('notify', notify);

        characteristics[j].on('descriptorsDiscover', descriptorsDiscover);

        discoveredCharacteristics.push({
          uuid: characteristics[j].uuid,
          properties: characteristics[j].properties
        });
      }

      sendEvent({
        type: 'characteristicsDiscover',
        peripheralUuid: peripheral.uuid,
        serviceUuid: this.uuid,
        characteristics: discoveredCharacteristics
      });
    };

    for (const i in services) {
      services[i].on('includedServicesDiscover', includedServicesDiscover);

      services[i].on('characteristicsDiscover', characteristicsDiscover);

      serviceUuids.push(services[i].uuid);
    }

    sendEvent({
      type: 'servicesDiscover',
      peripheralUuid: this.uuid,
      serviceUuids: serviceUuids
    });
  });

  peripheral.on('handleRead', function(handle, data) {
    sendEvent({
      type: 'handleRead',
      peripheralUuid: this.uuid,
      handle: handle,
      data: data.toString('hex')
    });
  });

  peripheral.on('handleWrite', function(handle) {
    sendEvent({
      type: 'handleWrite',
      peripheralUuid: this.uuid,
      handle: handle
    });
  });

  peripheral.on('handleNotify', function(handle, data) {
    sendEvent({
      type: 'handleNotify',
      peripheralUuid: this.uuid,
      handle: handle,
      data: data.toString('hex')
    });
  });

  sendEvent({
    type: 'discover',
    peripheralUuid: peripheral.uuid,
    address: peripheral.address,
    addressType: peripheral.addressType,
    connectable: peripheral.connectable,
    advertisement: {
      localName: peripheral.advertisement.localName,
      txPowerLevel: peripheral.advertisement.txPowerLevel,
      serviceUuids: peripheral.advertisement.serviceUuids,
      manufacturerData: (peripheral.advertisement.manufacturerData ? peripheral.advertisement.manufacturerData.toString('hex') : null),
      serviceData: (peripheral.advertisement.serviceData ? peripheral.advertisement.serviceData.toString('hex') : null)
    },
    rssi: peripheral.rssi
  });
});
