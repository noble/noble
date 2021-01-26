/* jshint loopfunc: true */
var events = require('events');

var debug = require('debug')('slave');
var WebSocket = require('ws');

var noble = require('./index');

var serverMode = !process.argv[2];
var port = 0xB1e;
var host = process.argv[2];


var ws;
var wss;

if (serverMode) {
  console.log('noble - ws slave - server mode');
  wss = new WebSocket.Server({
    port: 0xB1e
  });

  wss.on('connection', function(ws_) {
    console.log('ws -> connection');

    ws = ws_;

    ws.on('message', onMessage);

    ws.on('close', function() {
      console.log('ws -> close');
      noble.stopScanning();
    });

    noble.on('stateChange', function(state) {
      sendEvent({
        type: 'stateChange',
        state: state
      });
    });

    // Send poweredOn if already in this state.
    if (noble.state == "poweredOn") {
      sendEvent({
        type: 'stateChange',
        state: "poweredOn"
      });
    }


  });
} else {
  ws = new WebSocket('ws://' + host + ':' + port);

  ws.on('open', function() {
    console.log('ws -> open');
  });

  ws.on('message', function(message) {
    onMessage(message);
  });

  ws.on('close', function() {
    console.log('ws -> close');

    noble.stopScanning();
  });
}

var peripherals = {};

// TODO: open/close ws on state change

function sendEvent(event) {
  var message = JSON.stringify(event);

  console.log('ws -> send: ' + message);

  var clients = serverMode ? wss.clients : [ws];

  for (var i = 0; i < clients.length; i++) {
    clients[i].send(message);
  }
}

var onMessage = function(message) {
  console.log('ws -> message: ' + message);

  var command = JSON.parse(message);

  var action = command.action;
  var peripheralUuid = command.peripheralUuid;
  var serviceUuids = command.serviceUuids;
  var serviceUuid = command.serviceUuid;
  var characteristicUuids = command.characteristicUuids;
  var characteristicUuid = command.characteristicUuid;
  var data = command.data ? new Buffer(command.data, 'hex') : null;
  var withoutResponse = command.withoutResponse;
  var broadcast = command.broadcast;
  var notify = command.notify;
  var descriptorUuid = command.descriptorUuid;
  var handle;

  var peripheral = peripherals[peripheralUuid];
  var service = null;
  var characteristic = null;
  var descriptor = null;


  if (peripheral && serviceUuid) {
    var services = peripheral.services;

    for (var i in services) {
      if (services[i].uuid === serviceUuid) {
        service = services[i];

        if (characteristicUuid) {
          var characteristics = service.characteristics;

          for (var j in characteristics) {
            if (characteristics[j].uuid === characteristicUuid) {
              characteristic = characteristics[j];

              if (descriptorUuid) {
                var descriptors = characteristic.descriptors;

                for (var k in descriptors) {
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

    for (var i in this.services) {
      for (var j in this.services[i].characteristics) {
        for (var k in this.services[i].characteristics[j].descriptors) {
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
    var peripheral = this;
    var serviceUuids = [];

    var includedServicesDiscover = function(includedServiceUuids) {
      sendEvent({
        type: 'includedServicesDiscover',
        peripheralUuid: peripheral.uuid,
        serviceUuid: this.uuid,
        includedServiceUuids: includedServiceUuids
      });
    };

    var characteristicsDiscover = function(characteristics) {
      var service = this;
      var discoveredCharacteristics = [];

      var read = function(data, isNotification) {
        var characteristic = this;

        sendEvent({
          type: 'read',
          peripheralUuid: peripheral.uuid,
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid,
          data: data.toString('hex'),
          isNotification: isNotification
        });
      };

      var write = function() {
        var characteristic = this;

        sendEvent({
          type: 'write',
          peripheralUuid: peripheral.uuid,
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid
        });
      };

      var broadcast = function(state) {
        var characteristic = this;

        sendEvent({
          type: 'broadcast',
          peripheralUuid: peripheral.uuid,
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid,
          state: state
        });
      };

      var notify = function(state) {
        var characteristic = this;

        sendEvent({
          type: 'notify',
          peripheralUuid: peripheral.uuid,
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid,
          state: state
        });
      };

      var descriptorsDiscover = function(descriptors) {
        var characteristic = this;

        var discoveredDescriptors = [];

        var valueRead = function(data) {
          var descriptor = this;

          sendEvent({
            type: 'valueRead',
            peripheralUuid: peripheral.uuid,
            serviceUuid: service.uuid,
            characteristicUuid: characteristic.uuid,
            descriptorUuid: descriptor.uuid,
            data: data.toString('hex')
          });
        };

        var valueWrite = function(data) {
          var descriptor = this;

          sendEvent({
            type: 'valueWrite',
            peripheralUuid: peripheral.uuid,
            serviceUuid: service.uuid,
            characteristicUuid: characteristic.uuid,
            descriptorUuid: descriptor.uuid
          });
        };

        for (var k in descriptors) {
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

      for (var j = 0; j < characteristics.length; j++) {
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

    for (var i in services) {
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