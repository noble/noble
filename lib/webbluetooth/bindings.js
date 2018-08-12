/* eslint-disable no-unused-vars */
const events = require('events');

const debug = require('debug')('webble-bindings');

function makeList(uuid){
  return {services:[ uuid ]};
}

function addDashes(uuid){
  if(!uuid || typeof uuid !== 'string'){
    return uuid;
  }
  if(uuid && uuid.length === 32){
    uuid = `${uuid.substring(0,8)}-${uuid.substring(8,12)}-${uuid.substring(12,16)}-${uuid.substring(16,20)}-${uuid.substring(20)}`;
  }
  return uuid.toLowerCase();
}

function stripDashes(uuid){
  if(typeof uuid === 'string'){
    uuid = uuid.split('-').join('');
  }
  return uuid;
}


class NobleBindings extends events.EventEmitter {
  constructor() {
    super();
    this._ble = null;
    this._startScanCommand = null;
    this._peripherals = {};

    const self = this;

  }

  init(ble) {

    if(ble) {
      this._ble = ble;
    }else {
      this._ble = navigator.bluetooth;
    }

    const self = this;
    process.nextTick(() => {
      debug('initing');
      if(!self._ble){
        return self.emit('error', new Error('This browser does not support WebBluetooth.'));
      }
      debug('emit powered on');
      self.emit('stateChange', 'poweredOn');
    });
  }

  onOpen() {
    debug('on -> open');
  }

  onClose() {
    debug('on -> close');

    this.emit('stateChange', 'poweredOff');
  }

  startScanning(options, allowDuplicates) {
    const self = this;

    if(Array.isArray(options)){
      options = {services: options};
    }

    if(typeof options !== 'object'){
      options = {services: options};
    }

    if(!Array.isArray(options.services)){
      options.services = [options.services];
    }

    options.services = options.services.map((service) => {
      //web bluetooth requires 4 char hex service names to be passed in as integers
      if(typeof service === 'string' && service.length === 4){
        service = parseInt(`0x${service}`);
      }
      else if(typeof service === 'string' && service.length === 6 && service.indexOf('0x') === 0){
        service = parseInt(service);
      }
      return service;
    });

    const dashedUuids = options.services.map(addDashes);

    const filterList = dashedUuids.map(makeList);
    if(options.name){
      filterList.push({name: options.name});
    }
    if(options.namePrefix){
      filterList.push({namePrefix: options.namePrefix});
    }

    const request = {filters: filterList};

    debug('startScanning', request, allowDuplicates);

    this._ble.requestDevice(request)
      .then((device) => {
        debug('scan finished', device);
        self.emit('scanStop', {});
        if(device){

          const address = device.id;
          //TODO use device.adData when api is ready
          //rssi = device.adData.rssi;

          self._peripherals[address] = {
            uuid: address,
            address: address,
            advertisement: {localName:device.name}, //advertisement,
            device: device,
            cachedServices: {},
            localName: device.name,
            serviceUuids: options.services
          };
          if(device.adData){
            self._peripherals[address].rssi = device.adData.rssi;
          }

          self.emit('discover', device.id, device.id, device.addressType, !device.paired, self._peripherals[address].advertisement, self._peripherals[address].rssi);
        }
      })
      .catch((err) => {
        debug('err scanning', err);
        self.emit('scanStop', {});
        self.emit('error', err);
      });

    this.emit('scanStart');
  }

  stopScanning() {
    this._startScanCommand = null;

    //TODO: need web api completed for this to work'=
    this.emit('scanStop');
  }

  connect(deviceUuid) {
    const self = this;
    debug('connect', deviceUuid);
    const peripheral = this._peripherals[deviceUuid];
    //clear any cached services in case this is a reconnect
    peripheral.cachedServices = {};

    // Attempts to connect to remote GATT Server.
    peripheral.device.gatt.connect()
      .then((gattServer) => {
        debug('peripheral connected', gattServer);

        const onDisconnected = function(event){
          debug('disconnected', peripheral.uuid);
          self.emit('disconnect', peripheral.uuid);
        };
        peripheral.device.addEventListener('gattserverdisconnected', onDisconnected, {once: true});

        self.emit('connect', deviceUuid);
      }, (err) => {
        debug('err connecting', err);
        self.emit('connect', deviceUuid, err);
      });

  }

  disconnect(deviceUuid) {
    const peripheral = this._peripherals[deviceUuid];
    if(peripheral.device.gatt){
      peripheral.device.gatt.disconnect();
      this.emit('disconnect', deviceUuid);
    }
  }

  updateRssi(deviceUuid) {
    const peripheral = this._peripherals[deviceUuid];

    //TODO: need web api completed for this to work
    // this.emit('rssiUpdate', deviceUuid, rssi);
  }

  discoverServices(deviceUuid, uuids) {
    const peripheral = this._peripherals[deviceUuid];

    //TODO: need web api completed for this to work
    if(peripheral){
      this.emit('servicesDiscover', deviceUuid, peripheral.serviceUuids);
    }

  }

  discoverIncludedServices(deviceUuid, serviceUuid, serviceUuids) {
    const peripheral = this._peripherals[deviceUuid];

    //TODO impelment when web API has functionatility then emit response
    //this.emit('includedServicesDiscover', deviceUuid, serviceUuid, includedServiceUuids);
  }

  discoverCharacteristics(deviceUuid, serviceUuid, characteristicUuids) {
    const self = this;
    const peripheral = self._peripherals[deviceUuid];

    if(peripheral){

      self.getPrimaryService(peripheral, serviceUuid)
        .then((service) => {
          return service.getCharacteristics();
        })
        .then((characteristics) => {
          const discoveredCharacteristics = characteristics.map((char) => {
            const charInfo = {uuid: stripDashes(char.uuid), properties: []};

            if(char.properties.writeWithoutResponse){
              charInfo.properties.push('writeWithoutResponse');
            }

            if(char.properties.write){
              charInfo.properties.push('write');
            }

            if(char.properties.read){
              charInfo.properties.push('read');
            }

            if(char.properties.notify){
              charInfo.properties.push('notify');
            }

            return charInfo;
          });

          debug('discoverCharacteristics', deviceUuid, serviceUuid, discoveredCharacteristics);
          self.emit('characteristicsDiscover', deviceUuid, serviceUuid, discoveredCharacteristics);

        });
    }

  }

  getPrimaryService(peripheral, serviceUuid) {
    serviceUuid = addDashes(serviceUuid);

    if(peripheral.cachedServices[serviceUuid]){
      return new Promise(((resolve, reject) => {
        resolve(peripheral.cachedServices[serviceUuid]);
      }));
    }

    return peripheral.device.gatt.getPrimaryService(serviceUuid)
      .then((service) => {
        peripheral.cachedServices[serviceUuid] = service;
        return service;
      });
  }

  read(deviceUuid, serviceUuid, characteristicUuid) {
    const self = this;
    const peripheral = this._peripherals[deviceUuid];
    debug('read', deviceUuid, serviceUuid, characteristicUuid);

    self.getPrimaryService(peripheral, serviceUuid)
      .then((service) => {
        return service.getCharacteristic(addDashes(characteristicUuid));
      })
      .then((characteristic) => {
        return characteristic.readValue();
      })
      .then((data) => {
        self.emit('read', peripheral.uuid, serviceUuid, characteristicUuid, Buffer.from(data.buffer), false);
      })
      .catch((err) => {
        debug('error reading characteristic', err);
        self.emit('error', err);
      });
  }

  write(deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
    const self = this;
    const peripheral = this._peripherals[deviceUuid];
    debug('write', deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse);

    self.getPrimaryService(peripheral, serviceUuid)
      .then((service) => {
        return service.getCharacteristic(addDashes(characteristicUuid));
      })
      .then((characteristic) => {
        return characteristic.writeValue(data);
      })
      .then(() => {
        debug('value written');
        self.emit('write', peripheral.uuid, serviceUuid, characteristicUuid);
      })
      .catch((err) => {
        debug('error writing to characteristic', serviceUuid, characteristicUuid, err);
      });

  }

  broadcast(deviceUuid, serviceUuid, characteristicUuid, broadcast) {
    const peripheral = this._peripherals[deviceUuid];

    //TODO impelment when web API has functionatility then emit response
    //this.emit('broadcast', deviceUuid, serviceUuid, characteristicUuid, state);
  }

  notify(deviceUuid, serviceUuid, characteristicUuid, notify) {
    const self = this;
    const peripheral = this._peripherals[deviceUuid];

    const charPromise = self.getPrimaryService(peripheral, serviceUuid)
      .then((service) => {
        return service.getCharacteristic(addDashes(characteristicUuid));
      });

    peripheral.notifcationListeners = peripheral.notifcationListeners || {};

    if(notify){
      charPromise.then((characteristic) => {
        return characteristic.startNotifications();
      })
        .then((characteristic) => {
          debug('notifications started', characteristicUuid);
          peripheral.notifcationListeners[`${serviceUuid}__${characteristicUuid}`] = function(evt){
            debug('oncharacteristicvaluechanged', evt, Buffer.from(evt.target.value.buffer));
            self.emit('read', deviceUuid, serviceUuid, characteristicUuid, Buffer.from(evt.target.value.buffer), true);
          };
          characteristic.addEventListener('characteristicvaluechanged', peripheral.notifcationListeners[`${serviceUuid}__${characteristicUuid}`]);

          const onDisconnected = function(){
            characteristic.removeEventListener('characteristicvaluechanged', peripheral.notifcationListeners[`${serviceUuid}__${characteristicUuid}`]);
            delete peripheral.notifcationListeners[`${serviceUuid}__${characteristicUuid}`];
          };
          peripheral.device.addEventListener('gattserverdisconnected', onDisconnected, {once: true});

          self.emit('notify', deviceUuid, serviceUuid, characteristicUuid, true);
          return characteristic;
        })
        .catch((err) => {
          debug('error enabling notifications on characteristic', err);
          self.emit('error', err);
        });
    }
    else{
      charPromise.then((characteristic) => {
        return characteristic.stopNotifications();
      })
        .then((characteristic) => {
          debug('notifications stopped', characteristic);
          if(peripheral.notifcationListeners[`${serviceUuid}__${characteristicUuid}`]){
            characteristic.removeEventListener('characteristicvaluechanged', peripheral.notifcationListeners[`${serviceUuid}__${characteristicUuid}`]);
            delete peripheral.notifcationListeners[`${serviceUuid}__${characteristicUuid}`];
          }
          self.emit('notify', deviceUuid, serviceUuid, characteristicUuid, false);
          return characteristic;
        })
        .catch((err) => {
          debug('error disabling notifications on characteristic', err);
          self.emit('error', err);
        });
    }

  }

  discoverDescriptors(deviceUuid, serviceUuid, characteristicUuid) {
    const peripheral = this._peripherals[deviceUuid];

    //TODO impelment when web API has functionatility then emit response
    //this.emit('descriptorsDiscover', deviceUuid, serviceUuid, characteristicUuid, descriptors);
  }

  readValue(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid) {
    const peripheral = this._peripherals[deviceUuid];

    //TODO impelment when web API has functionatility then emit response
    //this.emit('valueRead', deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data);
  }

  writeValue(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
    const peripheral = this._peripherals[deviceUuid];

    //TODO impelment when web API has functionatility then emit response
    //this.emit('valueWrite', deviceUuid, serviceUuid, characteristicUuid, descriptorUuid);
  }

  readHandle(deviceUuid, handle) {
    const peripheral = this._peripherals[deviceUuid];

    //TODO impelment when web API has functionatility then emit response
    //this.emit('handleRead', deviceUuid, handle, data);
  }

  writeHandle(deviceUuid, handle, data, withoutResponse) {
    const peripheral = this._peripherals[deviceUuid];

    //TODO impelment when web API has functionatility then emit response
    //this.emit('handleWrite', deviceUuid, handle);
  }
}

const nobleBindings = new NobleBindings();

module.exports = nobleBindings;
