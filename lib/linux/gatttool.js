/*jshint loopfunc: true */

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
  while ((found = this._buffer.match(/([\s\S]*)\[(.{3})\]\[(.{17})\]\[(.*)\]>(.*)/)) !== null) {
    // console.log(found);
    var output = found[1];

    var connected = (found[2] === 'CON');
    var address = found[3];
    var type = found[4];

    this._buffer = found[5] ? found[5] : '';

    var splitCommandOutput = output.split('\n');

    var notificationFound;
    if (splitCommandOutput.length === 3 && (notificationFound = splitCommandOutput[1].match(/Notification handle = (.*) value: (.*)/))) {
      var handle = parseInt(notificationFound[1], 16);
      var value = notificationFound[2];

      var characteristicUuid = this._handles[handle].uuid;
      var serviceUuid = null;

      for (var i = handle; i >= 0; i--) {
        var h = this._handles[i];
        if (h && h.type === 'service') {
          serviceUuid = h.uuid;
          break;
        }
      }

      var bytes = value.trim().split(' ');

      for (var j in bytes) {
        bytes[j] = parseInt(bytes[j], 16);
      }

      this.emit('notification', this._address, serviceUuid, characteristicUuid, new Buffer(bytes));
    } else if (this._currentCommand) {
      var commandFound = (splitCommandOutput[0].trim().indexOf(this._currentCommand.command.trim()) !== -1);

      if (this._currentCommand.async ^ commandFound) {
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

Gatttool.prototype.discoverServices = function(uuids) {
  this.executeCommand('primary', true, function(output) {
    // console.log('primary output: ' + JSON.stringify(output));

    var serviceUuids = [];

    for (var i in output) {
      var line = output[i].trim();

      var found = line.match(/^attr handle: (.*), end grp handle: (.*) uuid: (.*)$/);
      if (found) {
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

        if (uuids.length === 0 || uuids.indexOf(uuid) !== -1) {
          serviceUuids.push(uuid);  
        }
      }
    }

    // console.log(serviceUuids);
    this.emit('servicesDiscover', this._address, serviceUuids);
  }.bind(this));
};

Gatttool.prototype.discoverCharacteristics = function(serviceUuid, characteristicUuids) {
  var service = this._services[serviceUuid];

  this.executeCommand('characteristics ' + service.attrHandle + ' ' + service.endGrpHandle, true, function(output) {
    // console.log('characteristics output: ' + JSON.stringify(output));

    var characteristics = [];
    this._characteristics[serviceUuid] = {};
    this._descriptors[serviceUuid] = {};

    for (var i in output) {
      var line = output[i].trim();

      var found = line.match(/^handle: (.*), char properties: (.*), char value handle: (.*), uuid: (.*)$/);
      if (found) {
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

        if (characteristicUuids.length === 0 || characteristicUuids.indexOf(uuid) !== -1) {
          characteristics.push(characteristic); 
        }

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

      var found = line.match(/^Characteristic value\/descriptor: (.*)$/);
      if (found) {
        var bytes = found[1].trim().split(' ');

        for (var j in bytes) {
          bytes[j] = parseInt(bytes[j], 16);
        }

        this.emit('read', this._address, serviceUuid, characteristicUuid, new Buffer(bytes));
      }
    }
  }.bind(this));
};

Gatttool.prototype.write = function(serviceUuid, characteristicUuid, data, withoutResponse) {
  var characteristic = this._characteristics[serviceUuid][characteristicUuid];

  var command = (withoutResponse ? 'char-write-cmd' : 'char-write-req');
  command += ' ';
  command += characteristic.valueHandle;
  command += ' ';
  command += data.toString('hex');

  this.executeCommand(command, !withoutResponse, function(output) {
    // console.log('write output: ' + JSON.stringify(output));

    this.emit('write', this._address, serviceUuid, characteristicUuid);
  }.bind(this));
};

Gatttool.prototype.getDescriptorsRange = function(serviceUuid, characteristicUuid) {
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

  return {
    start: descriptorsStart,
    end: descriptorsEnd 
  };
};

Gatttool.prototype.broadcast = function(serviceUuid, characteristicUuid, broadcast) {
  var descriptorsRange = this.getDescriptorsRange(serviceUuid, characteristicUuid);

  var command = 'char-read-uuid 2903 0x' + descriptorsRange.start.toString(16) + ' 0x' + descriptorsRange.end.toString(16);
  this.executeCommand(command, true, function(output) {
    for (var i in output) {
      var line = output[i].trim();

      var found = line.match(/^handle: (.*) \t value: (.*)/);
      if(found) {
        var handle = found[1];
        var value = parseInt(found[2].split(' ').join(''), 16);

        if (broadcast) {
          value |= 0x0100;
        } else {
          value &= 0xFEFF;
        }

        command = 'char-write-cmd ';
        command += handle;
        command += ' ';
        command += ("0000" + value.toString(16)).substr(-4);

        this.executeCommand(command, false, function(output) {
          this.emit('notify', this._address, serviceUuid, characteristicUuid, broadcast);
        }.bind(this));
      }
    }
  }.bind(this));
};

Gatttool.prototype.notify = function(serviceUuid, characteristicUuid, notify) {
  var descriptorsRange = this.getDescriptorsRange(serviceUuid, characteristicUuid);

  var command = 'char-read-uuid 2902 0x' + descriptorsRange.start.toString(16) + ' 0x' + descriptorsRange.end.toString(16);
  this.executeCommand(command, true, function(output) {
    for (var i in output) {
      var line = output[i].trim();

      var found = line.match(/^handle: (.*) \t value: (.*)/);
      if(found) {
        var handle = found[1];
        var value = parseInt(found[2].split(' ').join(''), 16);

        if (notify) {
          value |= 0x0100;
        } else {
          value &= 0xFEFF;
        }

        command = 'char-write-cmd ';
        command += handle;
        command += ' ';
        command += ("0000" + value.toString(16)).substr(-4);

        this.executeCommand(command, false, function(output) {
          this.emit('notify', this._address, serviceUuid, characteristicUuid, notify);
        }.bind(this));
      }
    }
  }.bind(this));
};

Gatttool.prototype.discoverDescriptors = function(serviceUuid, characteristicUuid) {
  var descriptorsRange = this.getDescriptorsRange(serviceUuid, characteristicUuid);

  if (descriptorsRange.end === null) {
    // no descriptors
    this.emit('descriptorsDiscover', this._address, serviceUuid, characteristicUuid, []);
  } else {
    var command = 'char-desc 0x' + descriptorsRange.start.toString(16) + ' 0x' + descriptorsRange.end.toString(16);
    this.executeCommand(command, true, function(output) {
      var descriptorUuids = [];
      for (var j in output) {
        var line = output[j].trim();

        var found = line.match(/^handle: (.*), uuid: (.*)$/);
        if(found) {
          var handle = found[1];
          var uuid = found[2];

          this._descriptors[serviceUuid][characteristicUuid][uuid] = {
            handle: handle,
            uuid: uuid
          };

          descriptorUuids.push(uuid);
        }
      }

      this.emit('descriptorsDiscover', this._address, serviceUuid, characteristicUuid, descriptorUuids);
    }.bind(this));
  }
};

Gatttool.prototype.readValue = function(serviceUuid, characteristicUuid, descriptorUuid) {
  var descriptor = this._descriptors[serviceUuid][characteristicUuid][descriptorUuid];

  this.executeCommand('char-read-hnd ' + descriptor.handle, true, function(output) {
    // console.log('value read output: ' + JSON.stringify(output));

     for (var i in output) {
      var line = output[i].trim();

      var found = line.match(/^Characteristic value\/descriptor: (.*)$/);
      if(found) {
        var bytes = found[1].trim().split(' ');

        for (var j in bytes) {
          bytes[j] = parseInt(bytes[j], 16);
        }

        this.emit('valueRead', this._address, serviceUuid, characteristicUuid, descriptorUuid, new Buffer(bytes));
      }
    }
  }.bind(this));
};

Gatttool.prototype.writeValue = function(serviceUuid, characteristicUuid, descriptorUuid, data) {
  var descriptor = this._descriptors[serviceUuid][characteristicUuid][descriptorUuid];

  var command = 'char-write-cmd';
  command += ' ';
  command += descriptor.handle;
  command += ' ';
  command += data.toString('hex');

  this.executeCommand(command, false, function(output) {
    // console.log('value write output: ' + JSON.stringify(output));

    this.emit('valueWrite', this._address, serviceUuid, characteristicUuid, descriptorUuid);
  }.bind(this));
};

module.exports = Gatttool;
