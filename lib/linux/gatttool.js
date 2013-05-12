var debug = require('debug')('gatttool');

var events = require('events');
var spawn = require('child_process').spawn;
var util = require('util');


var Gatttool = function(address) {
  this._address = address;
  this._handles = [];
  this._services = {};
  this._characteristics = {};
  this._descriptors = {};

  this._connected = false;

  this._buffer = '';
  this._commandOutput = '';

  this._currentCommand = null;
  this._commandQueue = [];

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

  // console.log('***');
  // console.log(JSON.stringify(this._buffer));
  // console.log('***');

  var found;
  while (found = this._buffer.match(/([\s\S]*)\[(.{3})\]\[(.{17})\]\[(.*)\]>(.*)/)) {
    // console.log(found);
    var output = found[1];

    var connected = (found[2] === 'CON');
    var address = found[3];
    var type = found[4];

    this._buffer = found[5] ? found[5] : '';

    var splitCommandOutput = output.split('\n');
    if (this._currentCommand) {
      var done = false;

      var commandFound = (splitCommandOutput[0].trim().indexOf(this._currentCommand.command.trim()) !== -1);

      if (!this._currentCommand.async && commandFound) {
        done = true;
      } else if (this._currentCommand.async && !commandFound) {
        done = true;
      }

      if (done) {
        this._currentCommand.callback(splitCommandOutput);

        this._currentCommand = null;

        if (this._commandQueue.length > 0) {
          this._executeNextCommand();
        }
      }
    }

    if (this._connected != connected) {
      this._connected = connected;

      this.emit(connected ? 'connect' : 'disconnect', address);
    }
  }
};

Gatttool.prototype.onStderrData = function(data) {
  console.log('stderr: ' + data);
};

Gatttool.prototype.executeCommand = function(command, async, callback) {
  this._commandQueue.push({
    command: command,
    async: async,
    callback: callback
  });

  if (this._currentCommand === null) {
    this._executeNextCommand();
  }
};

Gatttool.prototype._executeNextCommand = function() {
  this._currentCommand = this._commandQueue.pop();

  this._gatttool.stdin.write(this._currentCommand.command + '\n');
};

Gatttool.prototype.connect = function() {
  // TODO: handle 'public' and 'random'

  this.executeCommand('connect', false, function(output) {
    // console.log('connect output: ' + JSON.stringify(output));
  }.bind(this));
};

Gatttool.prototype.disconnect = function() {
  this.executeCommand('disconnect', false, function(output) {
    // console.log('disconnect output: ' + JSON.stringify(output));
  }.bind(this));
};

Gatttool.prototype.discoverServices = function() {
  this.executeCommand('primary', true, function(output) {
    // console.log('primary output: ' + JSON.stringify(output));

    var serviceUuids = [];

    for (var i in output) {
      var line = output[i].trim();

      if(found = line.match(/^attr handle: (.*), end grp handle: (.*) uuid: (.*)$/)) {
        var attrHandle = found[1];
        var endGrpHandle = found[2];
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

        this._handles[parseInt(attrHandle, 16)] = {
          type: 'service',
          uuid: uuid
        };

        this._handles[parseInt(endGrpHandle, 16)] = {
          type: 'end',
          uuid: uuid
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

  this.executeCommand('characteristics ' + service.attrHandle + ' ' + service.endGrpHandle, true, function(output) {
    // console.log('characteristics output: ' + JSON.stringify(output));

    var characteristics = [];
    this._characteristics[serviceUuid] = {};
    this._descriptors[serviceUuid] = {};

    for (var i in output) {
      var line = output[i].trim();

      if(found = line.match(/^handle: (.*), char properties: (.*), char value handle: (.*), uuid: (.*)$/)) {
        var handle = found[1];
        var properties = parseInt(found[2], 16);
        var valueHandle = found[3];
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

        this._handles[parseInt(handle, 16)] = {
          type: 'characteristic',
          uuid: uuid
        };

        this._handles[parseInt(valueHandle, 16)] = {
          type: 'value',
          uuid: uuid
        };
      }
    }

    this.emit('characteristicsDiscover', this._address, serviceUuid, characteristics);
  }.bind(this));
};

Gatttool.prototype.read = function(serviceUuid, characteristicUuid) {
  var characteristic = this._characteristics[serviceUuid][characteristicUuid];

  this.executeCommand('char-read-hnd ' + characteristic.valueHandle, true, function(output) {
    // console.log('read output: ' + JSON.stringify(output));

     for (var i in output) {
      var line = output[i].trim();

      if(found = line.match(/^Characteristic value\/descriptor: (.*)$/)) {
        var bytes = found[1].trim().split(' ');

        for (var i in bytes) {
          bytes[i] = parseInt(bytes[i], 16);
        }

        this.emit('read', this._address, serviceUuid, characteristicUuid, new Buffer(bytes));
      }
    }
  }.bind(this));
};

Gatttool.prototype.write = function(serviceUuid, characteristicUuid, data, notify) {
  var characteristic = this._characteristics[serviceUuid][characteristicUuid];

  var command = (notify ? 'char-write-req' : 'char-write-cmd');
  command += ' ';
  command += characteristic.valueHandle;
  command += ' ';
  command += data.toString('hex');

  this.executeCommand(command, notify, function(output) {
    // console.log('write output: ' + JSON.stringify(output));

    this.emit('write', this._address, serviceUuid, characteristicUuid);
  }.bind(this));
};

Gatttool.prototype.discoverDescriptors = function(serviceUuid, characteristicUuid) {
  console.log(characteristicUuid);
  var characteristic = this._characteristics[serviceUuid][characteristicUuid];
  var valueHandle = parseInt(characteristic.valueHandle, 16);
  var descriptorsStart = valueHandle + 1;
  var descriptorsEnd = null;

  this._descriptors[serviceUuid][characteristicUuid] = {};

  for (var i = descriptorsStart; i < this._handles.length; i++) {
    if (!this._handles[i] || (this._handles[i].type !== 'service' && this._handles[i].type !== 'characteristic')) {
      descriptorsEnd = i;
    } else {
      break;
    }
  }

  if (descriptorsEnd === null) {
    // no descriptors
    this.emit('descriptorsDiscover', this._address, serviceUuid, characteristicUuid, []);
  } else {
    var command = 'char-desc 0x' + descriptorsStart.toString(16) + ' 0x' + descriptorsEnd.toString(16);
    this.executeCommand(command, true, function(output) {
      var descriptorUuids = [];
      for (var j in output) {
        var line = output[j].trim();

        if(found = line.match(/^handle: (.*), uuid: (.*)$/)) {
          var handle = found[1];
          var uuid = found[2];

          this._descriptors[serviceUuid][characteristicUuid][uuid] = {
            handle: handle,
            uuid: uuid
          };

          descriptorUuids.push(uuid);
        }
      }

      console.log(descriptorUuids);
      this.emit('descriptorsDiscover', this._address, serviceUuid, characteristicUuid, descriptorUuids);
    }.bind(this));
  }

  // console.log(descriptorStart.toString(16) + ' ' + descriptorEnd.toString(16));
};

module.exports = Gatttool;
