const events = require('events');

class Peripheral extends events.EventEmitter {
  constructor(noble, id, address, addressType, connectable, advertisement, rssi) {
    super();
    this._noble = noble;

    this.id = id;
    this.uuid = id; // for legacy
    this.address = address;
    this.addressType = addressType;
    this.connectable = connectable;
    this.advertisement = advertisement;
    this.rssi = rssi;
    this.services = null;
    this.state = 'disconnected';
  }

  toString() {
    return JSON.stringify({
      id: this.id,
      address: this.address,
      addressType: this.addressType,
      connectable: this.connectable,
      advertisement: this.advertisement,
      rssi: this.rssi,
      state: this.state
    });
  }

  connect(callback) {
    const promise = new Promise((resolve, reject) => {
      this.once('connect', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });

      if (this.state === 'connected') {
        this.emit('connect', new Error('Peripheral already connected'));
      } else {
        this.state = 'connecting';
        this._noble.connect(this.id);
      }
    });

    if (callback && typeof callback === 'function') {
      promise.then(callback.bind(null, null), callback);
    }

    return promise;
  }

  disconnect(callback) {
    const promise = new Promise((resolve, reject) => {
      this.once('disconnect', () => {
        resolve();
      });

      this.state = 'disconnecting';
      this._noble.disconnect(this.id);
    });

    if (callback && typeof callback === 'function') {
      promise.then(callback.bind(null, null), callback);
    }

    return promise;
  }

  updateRssi(callback) {
    const promise = new Promise((resolve, reject) => {
      this.once('rssiUpdate', (rssi) => {
        resolve(rssi);
      });

      this._noble.updateRssi(this.id);
    });

    if (callback && typeof callback === 'function') {
      promise.then(callback.bind(null, null), callback);
    }

    return promise;
  }

  discoverServices(uuids, callback) {
    const promise = new Promise((resolve, reject) => {
      this.once('servicesDiscover', (services) => {
        resolve(services);
      });

      this._noble.discoverServices(this.id, uuids);
    });

    if (callback && typeof callback === 'function') {
      promise.then(callback.bind(null, null), callback);
    }

    return promise;
  }

  discoverSomeServicesAndCharacteristics(serviceUuids, characteristicsUuids, callback) {
    const promise = new Promise((resolve, reject) => {
      this.discoverServices(serviceUuids, (err, services) => {
        let numDiscovered = 0;
        const allCharacteristics = [];

        for (const i in services) {
          const service = services[i];

          service.discoverCharacteristics(characteristicsUuids, (error, characteristics) => {
            numDiscovered++;

            if (error === null) {
              for (const j in characteristics) {
                const characteristic = characteristics[j];

                allCharacteristics.push(characteristic);
              }
            }

            if (numDiscovered === services.length) {
              resolve({services, characteristics: allCharacteristics});
            }
          });
        }
      });
    });

    if (callback && typeof callback === 'function') {
      promise.then(({services, characteristics}) =>
        callback(null, services, characteristics), callback);
    }

    return promise;
  }

  discoverAllServicesAndCharacteristics(callback) {
    return this.discoverSomeServicesAndCharacteristics([], [], callback);
  }

  readHandle(handle, callback) {
    const promise = new Promise((resolve, reject) => {
      this.once(`handleRead${handle}`, (data) => {
        resolve(data);
      });
      this._noble.readHandle(this.id, handle);
    });

    if (callback && typeof callback === 'function') {
      promise.then(callback.bind(null, null), callback);
    }

    return promise;
  }

  writeHandle(handle, data, withoutResponse, callback) {
    if (!(data instanceof Buffer)) {
      throw new Error('data must be a Buffer');
    }

    const promise = new Promise((resolve, reject) => {
      this.once(`handleWrite${handle}`, resolve);

      this._noble.writeHandle(this.id, handle, data, withoutResponse);
    });

    if (callback && typeof callback === 'function') {
      promise.then(callback.bind(null, null), callback);
    }

    return promise;
  }
}

module.exports = Peripheral;
