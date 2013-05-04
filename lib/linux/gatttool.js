var debug = require('debug')('gatttool');

var events = require('events');
var spawn = require('child_process').spawn;
var util = require('util');


var Gatttool = function(address) {
  this._address = address;
  this._services = {};
  this._characteristics = {};

  this._connected = false;

  this._buffer = '';
  this._commandOutput = null;
  this._commandCallback = null;

  this._gatttool = spawn('gatttool', ['-b', address, '-I']);
  this._gatttool.on('close', this.onClose.bind(this));
  this._gatttool.stdout.on('data', this.onStdoutData.bind(this));
  this._gatttool.stderr.on('data', this.onStderrData.bind(this));
};

util.inherits(Gatttool, events.EventEmitter);

Gatttool.prototype.onClose = function(code) {
  console.log('close = ' + code);
};

Gatttool.prototype.onStdoutData = function(data) {
  var string = data.toString().replace(/(\u001b\[C)|(\u001b\[16@)/g, '').replace(/\r/g, '\n');

  this._buffer += string;

  var found;
  while (found = this._buffer.match(/\[(.{3})\]\[(.{17})\]\[(.*)\]>(.*)/)) {
    var connected = (found[1] === 'CON');
    var address = found[2];
    var type = found[3];

    this._commandOutput += this._buffer.substring(0, found.index);
    var splitCommandOutput = this._commandOutput.split('\n');

    // console.log(splitCommandOutput);

    if (splitCommandOutput.length > 2) {
      if (this._commandCallback) {
        var commandCallback = this._commandCallback;

        this._commandCallback = null;

        commandCallback(splitCommandOutput);
        
      } else {
        console.log('output: ' + splitCommandOutput);
      }

      this._commandOutput = '';
    }

    this._buffer = found[4] ? found[4] : '';

    if (this._connected != connected) {
      this._connected = connected;

      this.emit(connected ? 'connect' : 'disconnect', address);
    }
  }
};

Gatttool.prototype.onStderrData = function(data) {
  console.log('stderr: ' + data);
};

Gatttool.prototype.executeCommand = function(command, callback) {
  this._gatttool.stdin.write(command + '\n');

  this._commandOutput = '';
  this._commandCallback = callback;
};

Gatttool.prototype.connect = function() {
  this.executeCommand('connect', function(output) {
    // console.log('connect output: ' + JSON.stringify(output));
  }.bind(this));
};

Gatttool.prototype.disconnect = function() {
  this.executeCommand('disconnect', function(output) {
    console.log('disconnect output: ' + JSON.stringify(output));
  }.bind(this));
};

Gatttool.prototype.discoverServices = function() {
  this.executeCommand('primary', function(output) {
    console.log('primary output: ' + JSON.stringify(output));

    var serviceUuids = [];

    for (var i in output) {
      var line = output[i].trim();

      if(found = line.match(/^attr handle: (.*), end grp handle: (.*) uuid: (.*)$/)) {
        var attrHandle = parseInt(found[1], 16);
        var endGrpHandle = parseInt(found[2], 16);
        var uuid = found[3].split('-').join('');

        if (uuid.match(/^0000.{4}00001000800000805f9b/)) {
          uuid = uuid.substring(4, 8);
        }

        // console.log(attrHandle);
        // console.log(endGrpHandle);
        // console.log(uuid);
        // console.log();

        this._services[uuid] = {
          uuid: uuid,
          attrHandle: attrHandle,
          endGrpHandle: endGrpHandle
        };

        serviceUuids.push(uuid);
      }
    }

    // console.log(serviceUuids);
    this.emit('servicesDiscover', this._address, serviceUuids);
  }.bind(this));
};

Gatttool.prototype.discoverCharacteristics = function(serviceUuid) {
  var service = this._services[serviceUuid];

  this.executeCommand('characteristics ' + service.attrHandle + ' ' + service.endGrpHandle, function(output) {
    // console.log('characteristics output: ' + JSON.stringify(output));

    var characteristics = [];
    this._characteristics[serviceUuid] = {};

    for (var i in output) {
      var line = output[i].trim();

      if(found = line.match(/^handle: (.*), char properties: (.*), char value handle: (.*), uuid: (.*)$/)) {
        var handle = parseInt(found[1], 16);
        var properties = parseInt(found[2], 16);
        var valueHandle = parseInt(found[3], 16);
        var uuid = found[4].split('-').join('');

        if (uuid.match(/^0000.{4}00001000800000805f9b/)) {
          uuid = uuid.substring(4, 8);
        }

        // console.log(handle);
        // console.log(properties);
        // console.log(valueHandle);
        // console.log(uuid);
        // console.log();

        this._characteristics[serviceUuid][uuid] = {
          handle: handle,
          properties: properties,
          valueHandle: valueHandle,
          uuid: uuid
        };

        var characteristic = {
          properties: [],
          uuid: uuid
        };

        if (properties & 0x01) {
          characteristic.properties.push('broadcast');
        }

        if (properties & 0x02) {
          characteristic.properties.push('read');
        }

        if (properties & 0x04) {
          characteristic.properties.push('writeWithoutResponse');
        }

        if (properties & 0x08) {
          characteristic.properties.push('write');
        }

        if (properties & 0x10) {
          characteristic.properties.push('notify');
        }

        if (properties & 0x20) {
          characteristic.properties.push('indicate');
        }

        if (properties & 0x40) {
          characteristic.properties.push('authenticatedSignedWrites');
        }

        if (properties & 0x80) {
          characteristic.properties.push('extendedProperties');
        }

        characteristics.push(characteristic);
      }
    }

    this.emit('characteristicsDiscover', this._address, serviceUuid, characteristics);
  }.bind(this));
};

module.exports = Gatttool;
