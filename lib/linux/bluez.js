var debug = require('debug')('bluez');

var events = require('events');
var spawn = require('child_process').spawn;
var util = require('util');


var BlueZ = function() {
  var bluezScanner = __dirname + '/../../bin/bluez-scanner.py';
  
  debug('bluezScanner = ' + bluezScanner);

  this._bluezScanner = spawn('stdbuf', ['-o', '0', '-e', '0', '-i', '0', bluezScanner]);
  this._bluezScanner.on('close', this.onClose.bind(this));

  this._bluezScanner.stdout.on('data', this.onStdoutData.bind(this));
  this._bluezScanner.stderr.on('data', this.onStderrData.bind(this));

  this._bluezScanner.on('error', function() { });

  process.on('exit', function () {
    this._bluezScanner.kill();
  }.bind(this));

  this._buffer = "";
};

util.inherits(BlueZ, events.EventEmitter);

BlueZ.prototype.onClose = function(code) {
  debug('close = ' + code);
};

BlueZ.prototype.onStdoutData = function(data) {
  this._buffer += data.toString();

  debug('buffer = ' + JSON.stringify(this._buffer));

  var newLineIndex;
  while ((newLineIndex = this._buffer.indexOf('\n')) !== -1) {
    var line = this._buffer.substring(0, newLineIndex);
    
    this._buffer = this._buffer.substring(newLineIndex + 1);

    var splitLine = line.split(': ');
    var key = splitLine[0];
    var value = splitLine[1];

    if (key === 'Adapter') {
      var state = 'unknown';

      if (value === 'None') {
        state = 'unsupported';
      } else if (value === 'PoweredOff') {
        state = 'poweredOff';
      } else if (value === 'PoweredOn') {
        state = 'poweredOn';
      }

      this.emit('stateChange', state);
    } else if (key === 'DeviceFound') {
      var splitValue = value.split(',');

      var properties = {};

      for (var i in splitValue) {
        var splitValueValue = splitValue[i].split(' = ');

        properties[splitValueValue[0].trim()] = splitValueValue[1].trim();
      }

      var address = properties.Address;
      var advertisement = {
        localName: properties.Name,
        serviceUuids: []
      };
      var rssi = properties.RSSI;

      var uuids = properties.UUIDs.split(' ');
      for (var j in uuids) {
        var uuid = uuids[j].split('-').join('');

        if (uuid.match(/^0000.{4}00001000800000805f9b/)) {
          uuid = uuid.substring(4, 8);
        }
        advertisement.serviceUuids.push(uuid);
      }

      this.emit('discover', address, advertisement, rssi);
    } else if (key === 'Error') {
      console.error('bluez-scanner error: ' + value);
    }
  }
};

BlueZ.prototype.onStderrData = function(data) {
  console.error('stderr: ' + data);
};

BlueZ.prototype.startScanning = function() {
  this._bluezScanner.stdin.write('start\n');

  this.emit('scanStart');
};

BlueZ.prototype.stopScanning = function() {
  this._bluezScanner.stdin.write('stop\n');

  this.emit('scanStop');
};

module.exports = BlueZ;

