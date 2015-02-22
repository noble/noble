var debug = require('debug')('hci-ble');

var events = require('events');
var spawn = require('child_process').spawn;
var util = require('util');

var HciBle = function() {
  var hciBle = __dirname + '/../../build/Release/hci-ble';

  debug('hciBle = ' + hciBle);

  this._hciBle = spawn(hciBle);
  this._hciBle.on('close', this.onClose.bind(this));

  this._hciBle.stdout.on('data', this.onStdoutData.bind(this));
  this._hciBle.stderr.on('data', this.onStderrData.bind(this));

  this._hciBle.on('error', function() { });

  this._buffer = "";

  this._discoveries = {};
};

util.inherits(HciBle, events.EventEmitter);

HciBle.prototype.onClose = function(code) {
  debug('close = ' + code);
};

HciBle.prototype.onStdoutData = function(data) {
  this._buffer += data.toString();

  debug('buffer = ' + JSON.stringify(this._buffer));

  var newLineIndex;
  while ((newLineIndex = this._buffer.indexOf('\n')) !== -1) {
    var line = this._buffer.substring(0, newLineIndex);
    var found;

    this._buffer = this._buffer.substring(newLineIndex + 1);

    debug('line = ' + line);

    if ((found = line.match(/^adapterState (.*)$/))) {
      var adapterState = found[1];

      debug('adapterState = ' + adapterState);

      if (adapterState === 'unauthorized') {
        console.log('noble warning: adapter state unauthorized, please run as root or with sudo');
        console.log('               or see README for information on running without root/sudo:');
        console.log('               https://github.com/sandeepmistry/noble#running-on-linux');
      }

      if (adapterState === 'unsupported') {
        console.log('noble warning: adapter does not support Bluetooth Low Energy (BLE, Bluetooth Smart).');
        console.log('               Try to run with environment variable:');
        console.log('               [sudo] NOBLE_HCI_DEVICE_ID=x node ...');
      }

      this.emit('stateChange', adapterState);
    } else if ((found = line.match(/^event (.*)$/))) {
      var event = found[1];
      var splitEvent = event.split(',');

      var address = splitEvent[0];
      var addressType = splitEvent[1];
      var eir = new Buffer(splitEvent[2], 'hex');
      var rssi = parseInt(splitEvent[3], 10);

      debug('address = ' + address);
      debug('addressType = ' + addressType);
      debug('eir = ' + eir.toString('hex'));
      debug('rssi = ' + rssi);

      var previouslyDiscovered = !!this._discoveries[address];
      var advertisement =  previouslyDiscovered ? this._discoveries[address].advertisement : {
        localName: undefined,
        txPowerLevel: undefined,
        manufacturerData: undefined,
        serviceData: [],
        serviceUuids: []
      };

      var discoveryCount = previouslyDiscovered ? this._discoveries[address].count : 0;

      if (discoveryCount % 2 === 0) {
        // reset service data every second event
        advertisement.serviceData = [];
      }

      var i = 0;
      var j = 0;
      var serviceUuid = null;

      while ((i + 1) < eir.length) {
        var length = eir.readUInt8(i);

        if (length < 1) {
          debug('invalid EIR data, length = ' + length);
          break;
        }

        var type = eir.readUInt8(i + 1); // https://www.bluetooth.org/en-us/specification/assigned-numbers/generic-access-profile

        if ((i + length + 1) > eir.length) {
          debug('invalid EIR data, out of range of buffer length');
          break;
        }

        var bytes = eir.slice(i + 2).slice(0, length - 1);

        switch(type) {
          case 0x02: // Incomplete List of 16-bit Service Class UUID
          case 0x03: // Complete List of 16-bit Service Class UUIDs
            for (j = 0; j < bytes.length; j += 2) {
              serviceUuid = bytes.readUInt16LE(j).toString(16);
              if (advertisement.serviceUuids.indexOf(serviceUuid) === -1) {
                advertisement.serviceUuids.push(serviceUuid);
              }
            }
            break;

          case 0x06: // Incomplete List of 128-bit Service Class UUIDs
          case 0x07: // Complete List of 128-bit Service Class UUIDs
            for (j = 0; j < bytes.length; j += 16) {
              serviceUuid = bytes.slice(j, j + 16).toString('hex').match(/.{1,2}/g).reverse().join('');
              if (advertisement.serviceUuids.indexOf(serviceUuid) === -1) {
                advertisement.serviceUuids.push(serviceUuid);
              }
            }
            break;

          case 0x08: // Shortened Local Name
          case 0x09: // Complete Local Name»
            advertisement.localName = bytes.toString('utf8');
            break;

          case 0x0a: // Tx Power Level
            advertisement.txPowerLevel = bytes.readInt8(0);
            break;

          case 0x16: // Service Data, there can be multiple occurences
            var serviceDataUuid = bytes.slice(0, 2).toString('hex').match(/.{1,2}/g).reverse().join('');
            var serviceData = bytes.slice(2, bytes.length);

            advertisement.serviceData.push({
              uuid: serviceDataUuid,
              data: serviceData
            });
            break;

          case 0xff: // Manufacturer Specific Data
            advertisement.manufacturerData = bytes;
            break;
        }

        i += (length + 1);
      }

      debug('advertisement = ' + JSON.stringify(advertisement, null, 0));

      this._discoveries[address] = {
        address: address,
        addressType: addressType,
        advertisement: advertisement,
        rssi: rssi,
        count: (discoveryCount + 1)
      };

      // only report after an even number of events, so more advertisement data can be collected
      if (this._discoveries[address].count % 2 === 0 || process.env.NOBLE_REPORT_ALL_HCI_EVENTS) {
        this.emit('discover', address, addressType, advertisement, rssi);
      }
    }
  }
};

HciBle.prototype.onStderrData = function(data) {
  console.error('stderr: ' + data);
};

HciBle.prototype.startScanning = function(allowDuplicates) {
  this._hciBle.kill(allowDuplicates ? 'SIGUSR2' : 'SIGUSR1');

  this.emit('scanStart');
};

HciBle.prototype.stopScanning = function() {
  this._hciBle.kill('SIGHUP');

  this.emit('scanStop');
};

module.exports = HciBle;
