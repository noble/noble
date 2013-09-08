var debug = require('debug')('hci-ble');

var events = require('events');
var spawn = require('child_process').spawn;
var util = require('util');

var HciBle = function() {
  var hciBle = __dirname + '/../../build/Release/hci-ble';
  
  debug('hciBle = ' + hciBle);

  this._hciBle = spawn('stdbuf', ['-o', '0', '-e', '0', '-i', '0', hciBle]);
  this._hciBle.on('close', this.onClose.bind(this));

  this._hciBle.stdout.on('data', this.onStdoutData.bind(this));
  this._hciBle.stderr.on('data', this.onStderrData.bind(this));

  this._hciBle.on('error', function() { });

  this._buffer = "";
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

    debug('line: ' + line);

    if (found = line.match(/^adapterState=(.*)$/)) {
      var adapterState = found[1];

      debug('adapterState = ' + adapterState);
      
      this.emit('stateChange', adapterState);
    } else {
      var splitLine = line.split(',');

      var address = splitLine[0];
      var addressType = splitLine[1];
      var eir = new Buffer(splitLine[2], 'hex');
      var rssi = parseInt(splitLine[3], 10);

      debug('address = ' + address);
      debug('addressType = ' + addressType);
      debug('eir = ' + eir.toString('hex'));
      debug('rssi = ' + rssi);

      var advertisement = {
        localName: undefined,
        serviceData: undefined,
        txPowerLevel: undefined,
        manufacturerData: undefined,
        serviceUuids: []
      };

      var i = 0;
      while (i < eir.length) {
        var length = eir.readUInt8(i);
        var type = eir.readUInt8(i + 1); // https://www.bluetooth.org/en-us/specification/assigned-numbers/generic-access-profile
        var bytes = eir.slice(i + 2).slice(0, length - 1);

        switch(type) {
          case 0x02: // Incomplete List of 16-bit Service Class UUID
          case 0x03: // Complete List of 16-bit Service Class UUIDs
            for (var j = 0; j < bytes.length; j += 2) {
              advertisement.serviceUuids.push(bytes.readUInt16LE(j).toString(16));
            }
            break;

          case 0x04: // Incomplete List of 32-bit Service Class UUIDs
          case 0x05: // Complete List of 32-bit Service Class UUIDs
            for (var j = 0; j < bytes.length; j += 4) {
              advertisement.serviceUuids.push(bytes.readUInt32LE(j).toString(16));
            }
            break;

          case 0x06: // Incomplete List of 128-bit Service Class UUIDs
          case 0x07: // Complete List of 128-bit Service Class UUIDs
            for (var j = 0; j < bytes.length; j += 16) {
              advertisement.serviceUuids.push(reverseBuffer(bytes.slice(j, j + 16)).toString('hex'));
            }
            break;

          case 0x08: // Shortened Local Name
          case 0x09: // Complete Local Name»
            advertisement.localName = bytes.toString('utf8');
            break;

          case 0x0a: // Tx Power Level
            advertisement.txPowerLevel = bytes.readInt8(0);
            break;

          case 0x16: // Service Data
            // TODO: maybe this should be a buffer, do we need to reverse?
            advertisement.serviceData = reverseBuffer(bytes).toString('hex');
            break;

          case 0xff: // Manufacturer Specific Data
            // TODO: maybe this should be a buffer, do we need to reverse?
            advertisement.manufacturerData = reverseBuffer(bytes).toString('hex');
            break;
        }

        i += (length + 1);
      }

      debug('advertisement = ' + JSON.stringify(advertisement, null, 0));

      if (advertisement.localName || advertisement.serviceUuids.length) {
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

function reverseBuffer(buffer) {
  var reversedBuffer = new Buffer(buffer.length);

  for (var i = 0; i < reversedBuffer.length; i++) {
    reversedBuffer[i] = buffer.readInt8(buffer.length - i - 1);
  }

  return reversedBuffer;
}

module.exports = HciBle;

