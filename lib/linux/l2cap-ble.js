/*jshint loopfunc: true */

var debug = require('debug')('l2cap-ble');

var events = require('events');
var spawn = require('child_process').spawn;
var util = require('util');

var ATT_OP_ERROR                    = 0x01;
var ATT_OP_MTU_REQ                  = 0x02;
var ATT_OP_MTU_RESP                 = 0x03;
var ATT_OP_FIND_INFO_REQ            = 0x04;
var ATT_OP_FIND_INFO_RESP           = 0x05;
var ATT_OP_READ_BY_TYPE_REQ         = 0x08;
var ATT_OP_READ_BY_TYPE_RESP        = 0x09;
var ATT_OP_READ_REQ                 = 0x0a;
var ATT_OP_READ_RESP                = 0x0b;
var ATT_OP_READ_BLOB_REQ            = 0x0c;
var ATT_OP_READ_BLOB_RESP           = 0x0d;
var ATT_OP_READ_BY_GROUP_REQ        = 0x10;
var ATT_OP_READ_BY_GROUP_RESP       = 0x11;
var ATT_OP_WRITE_REQ                = 0x12;
var ATT_OP_WRITE_RESP               = 0x13;
var ATT_OP_HANDLE_NOTIFY            = 0x1b;
var ATT_OP_HANDLE_IND               = 0x1d;
var ATT_OP_HANDLE_CNF               = 0x1e;
var ATT_OP_WRITE_CMD                = 0x52;

var ATT_ECODE_SUCCESS               = 0x00;
var ATT_ECODE_INVALID_HANDLE        = 0x01;
var ATT_ECODE_READ_NOT_PERM         = 0x02;
var ATT_ECODE_WRITE_NOT_PERM        = 0x03;
var ATT_ECODE_INVALID_PDU           = 0x04;
var ATT_ECODE_AUTHENTICATION        = 0x05;
var ATT_ECODE_REQ_NOT_SUPP          = 0x06;
var ATT_ECODE_INVALID_OFFSET        = 0x07;
var ATT_ECODE_AUTHORIZATION         = 0x08;
var ATT_ECODE_PREP_QUEUE_FULL       = 0x09;
var ATT_ECODE_ATTR_NOT_FOUND        = 0x0a;
var ATT_ECODE_ATTR_NOT_LONG         = 0x0b;
var ATT_ECODE_INSUFF_ENCR_KEY_SIZE  = 0x0c;
var ATT_ECODE_INVAL_ATTR_VALUE_LEN  = 0x0d;
var ATT_ECODE_UNLIKELY              = 0x0e;
var ATT_ECODE_INSUFF_ENC            = 0x0f;
var ATT_ECODE_UNSUPP_GRP_TYPE       = 0x10;
var ATT_ECODE_INSUFF_RESOURCES      = 0x11;

var GATT_PRIM_SVC_UUID              = 0x2800;
var GATT_INCLUDE_UUID               = 0x2802;
var GATT_CHARAC_UUID                = 0x2803;

var GATT_CLIENT_CHARAC_CFG_UUID     = 0x2902;
var GATT_SERVER_CHARAC_CFG_UUID     = 0x2903;

var L2capBle = function(address, addressType) {
  this._address = address;
  this._addressType = addressType;
  this._security = 'low';

  this._services = {};
  this._characteristics = {};
  this._descriptors = {};

  this._currentCommand = null;
  this._commandQueue = [];

  this._mtu = 23;
};

util.inherits(L2capBle, events.EventEmitter);

L2capBle.prototype.kill = function() {
  this.l2capBleKill();
};

L2capBle.prototype.onClose = function(code) {
  debug(this._address + ': close = ' + code);
};

L2capBle.prototype.onStdoutData = function(data) {
  this._buffer += data.toString();

  debug(this._address + ': buffer = ' + JSON.stringify(this._buffer));

  var newLineIndex;
  while ((newLineIndex = this._buffer.indexOf('\n')) !== -1) {
    var line = this._buffer.substring(0, newLineIndex);
    var found;

    this._buffer = this._buffer.substring(newLineIndex + 1);

    debug(this._address + ': line = ' + line);

    if ((found = line.match(/^connect (.*)$/))) {
      var status = found[1];
      var error = ('success' === status) ? null : new Error(status);

      this.emit('connect', this._address, error);
    } else if ((found = line.match(/^disconnect$/))) {
      this.emit('disconnect', this._address);
    } else if ((found = line.match(/^rssi = (.*)$/))) {
      var rssi = parseInt(found[1], 10);

      this.emit('rssi', this._address, rssi);
    } else if ((found = line.match(/^security = (.*)$/))) {
      this._security = found[1];

      if (this._security === 'medium') {
        // re-issue the current command

        debug(this._address + ': write: ' + this._currentCommand.buffer.toString('hex'));
        this.l2capBleWrite(this._currentCommand.buffer.toString('hex') + '\n');
      } else {
        this.upgradeSecurity();
      }
    } else if ((found = line.match(/^write = (.*)$/))) {
      var write = found[1];

      if (write !== "success") {
        // re-issue the current command, after a delay, if the write was unsuccessful

        setTimeout(function() {
          debug(this._address + ': write: ' + this._currentCommand.buffer.toString('hex'));
          this.l2capBleWrite(this._currentCommand.buffer.toString('hex') + '\n');
        }.bind(this), 100);
      }
    } else if ((found = line.match(/^data (.*)$/))) {
      var lineData = new Buffer(found[1], 'hex');

      if (this._currentCommand && lineData.toString('hex') === this._currentCommand.buffer.toString('hex')) {
        debug(this._address + ': echo ... echo ... echo ...');
      } else if (lineData[0] % 2 === 0) {
        debug(this._address + ': ignoring request/command ...');
      } else if (lineData[0] === ATT_OP_HANDLE_NOTIFY || lineData[0] === ATT_OP_HANDLE_IND) {
        var valueHandle = lineData.readUInt16LE(1);
        var valueData = lineData.slice(3);

        this.emit('handleNotify', this._address, valueHandle, valueData);

        if (lineData[0] === ATT_OP_HANDLE_IND) {
          this._queueCommand(this.handleConfirmation(), null, function() {
            this.emit('handleConfirmation', this._address, valueHandle);
          }.bind(this));
        }

        for (var serviceUuid in this._services) {
          for (var characteristicUuid in this._characteristics[serviceUuid]) {
            if (this._characteristics[serviceUuid][characteristicUuid].valueHandle === valueHandle) {
              this.emit('notification', this._address, serviceUuid, characteristicUuid, valueData);
            }
          }
        }
      } else if (!this._currentCommand) {
        debug(this._address + ': uh oh, no current command');
      } else {
        if (lineData[0] === ATT_OP_ERROR &&
            (lineData[4] === ATT_ECODE_AUTHENTICATION || lineData[4] === ATT_ECODE_AUTHORIZATION || lineData[4] === ATT_ECODE_INSUFF_ENC) &&
            this._security !== 'medium') {
          this.upgradeSecurity();

          return;
        }

        this._currentCommand.callback(lineData);
        this._currentCommand = null;

        this.executeCommand();
      }
    }
  }
};

L2capBle.prototype.onStdinError = function(error) {
};

L2capBle.prototype.onStderrData = function(data) {
  console.error(this._address + ': stderr: ' + data);
};

L2capBle.prototype.connect = function() {
  var l2capBle = __dirname + '/../../build/Release/l2cap-ble';

  debug(this._address + ': l2capBle = ' + l2capBle);

  this._l2capBle = spawn(l2capBle, [this._address, this._addressType]);
  this._l2capBle.on('close', this.onClose.bind(this));
  this._l2capBle.stdout.on('data', this.onStdoutData.bind(this));
  this._l2capBle.stdin.on('error', this.onStdinError.bind(this));
  this._l2capBle.stderr.on('data', this.onStderrData.bind(this));

  this._buffer = "";
};

L2capBle.prototype.disconnect = function() {
  this.l2capBleKill('SIGHUP');
};

L2capBle.prototype.updateRssi = function() {
  this.l2capBleKill('SIGUSR1');
};

L2capBle.prototype.upgradeSecurity = function() {
  this.l2capBleKill('SIGUSR2');
};

L2capBle.prototype._queueCommand = function(buffer, callback, writeCallback) {
  this._commandQueue.push({
    buffer: buffer,
    callback: callback,
    writeCallback: writeCallback
  });

  this.executeCommand();
};

L2capBle.prototype.executeCommand = function() {
  if (this._currentCommand !== null) {
    return;
  }

  while (this._commandQueue.length) {
    this._currentCommand = this._commandQueue.shift();

    debug(this._address + ': write: ' + this._currentCommand.buffer.toString('hex'));
    this.l2capBleWrite(this._currentCommand.buffer.toString('hex') + '\n');

    if (this._currentCommand.callback) {
      return;
    }
    if (!this._currentCommand.writeCallback) {
      return;
    }

    this._currentCommand.writeCallback();
    this._currentCommand = null;
  }
};

L2capBle.prototype.mtuRequest = function(mtu) {
  var buf = new Buffer(3);

  buf.writeUInt8(ATT_OP_MTU_REQ, 0);
  buf.writeUInt16LE(mtu, 1);

  return buf;
};

L2capBle.prototype.readByGroupRequest = function(startHandle, endHandle, groupUuid) {
  var buf = new Buffer(7);

  buf.writeUInt8(ATT_OP_READ_BY_GROUP_REQ, 0);
  buf.writeUInt16LE(startHandle, 1);
  buf.writeUInt16LE(endHandle, 3);
  buf.writeUInt16LE(groupUuid, 5);

  return buf;
};

L2capBle.prototype.readByTypeRequest = function(startHandle, endHandle, groupUuid) {
  var buf = new Buffer(7);

  buf.writeUInt8(ATT_OP_READ_BY_TYPE_REQ, 0);
  buf.writeUInt16LE(startHandle, 1);
  buf.writeUInt16LE(endHandle, 3);
  buf.writeUInt16LE(groupUuid, 5);

  return buf;
};

L2capBle.prototype.readRequest = function(handle) {
  var buf = new Buffer(3);

  buf.writeUInt8(ATT_OP_READ_REQ, 0);
  buf.writeUInt16LE(handle, 1);

  return buf;
};

L2capBle.prototype.readBlobRequest = function(handle, offset) {
  var buf = new Buffer(5);

  buf.writeUInt8(ATT_OP_READ_BLOB_REQ, 0);
  buf.writeUInt16LE(handle, 1);
  buf.writeUInt16LE(offset, 3);

  return buf;
};

L2capBle.prototype.findInfoRequest = function(startHandle, endHandle) {
  var buf = new Buffer(5);

  buf.writeUInt8(ATT_OP_FIND_INFO_REQ, 0);
  buf.writeUInt16LE(startHandle, 1);
  buf.writeUInt16LE(endHandle, 3);

  return buf;
};

L2capBle.prototype.writeRequest = function(handle, data, withoutResponse) {
  var buf = new Buffer(3 + data.length);

  buf.writeUInt8(withoutResponse ? ATT_OP_WRITE_CMD : ATT_OP_WRITE_REQ , 0);
  buf.writeUInt16LE(handle, 1);

  for (var i = 0; i < data.length; i++) {
    buf.writeUInt8(data.readUInt8(i), i + 3);
  }

  return buf;
};

L2capBle.prototype.handleConfirmation = function() {
  var buf = new Buffer(1);

  buf.writeUInt8(ATT_OP_HANDLE_CNF, 0);

  return buf;
};

L2capBle.prototype.exchangeMtu = function(mtu) {
  this._queueCommand(this.mtuRequest(mtu), function(data) {
    var opcode = data[0];

    if (opcode === ATT_OP_MTU_RESP) {
      var newMtu = data.readUInt16LE(1);

      debug(this._address + ': new MTU is ' + newMtu);

      this._mtu = newMtu;

      this.emit('mtu', this._address, mtu);
    } else {
      this.emit('mtu', this._address, 23);
    }
  }.bind(this));
};

L2capBle.prototype.discoverServices = function(uuids) {
  var services = [];

  var callback = function(data) {
    var opcode = data[0];
    var i = 0;

    if (opcode === ATT_OP_READ_BY_GROUP_RESP) {
      var type = data[1];
      var num = (data.length - 2) / type;

      for (i = 0; i < num; i++) {
        services.push({
          startHandle: data.readUInt16LE(2 + i * type + 0),
          endHandle: data.readUInt16LE(2 + i * type + 2),
          uuid: (type == 6) ? data.readUInt16LE(2 + i * type + 4).toString(16) : data.slice(2 + i * type + 4).slice(0, 16).toString('hex').match(/.{1,2}/g).reverse().join('')
        });
      }
    }

    if (opcode !== ATT_OP_READ_BY_GROUP_RESP || services[services.length - 1].endHandle === 0xffff) {
      var serviceUuids = [];
      for (i = 0; i < services.length; i++) {
        if (uuids.length === 0 || uuids.indexOf(services[i].uuid) !== -1) {
          serviceUuids.push(services[i].uuid);
        }

        this._services[services[i].uuid] = services[i];
      }
      this.emit('servicesDiscover', this._address, serviceUuids);
    } else {
      this._queueCommand(this.readByGroupRequest(services[services.length - 1].endHandle + 1, 0xffff, GATT_PRIM_SVC_UUID), callback);
    }
  }.bind(this);

  this._queueCommand(this.readByGroupRequest(0x0001, 0xffff, GATT_PRIM_SVC_UUID), callback);
};

L2capBle.prototype.discoverIncludedServices = function(serviceUuid, uuids) {
  var service = this._services[serviceUuid];
  var includedServices = [];

  var callback = function(data) {
    var opcode = data[0];
    var i = 0;

    if (opcode === ATT_OP_READ_BY_TYPE_RESP) {
      var type = data[1];
      var num = (data.length - 2) / type;

      for (i = 0; i < num; i++) {
        includedServices.push({
          endHandle: data.readUInt16LE(2 + i * type + 0),
          startHandle: data.readUInt16LE(2 + i * type + 2),
          uuid: (type == 8) ? data.readUInt16LE(2 + i * type + 6).toString(16) : data.slice(2 + i * type + 6).slice(0, 16).toString('hex').match(/.{1,2}/g).reverse().join('')
        });
      }
    }

    if (opcode !== ATT_OP_READ_BY_TYPE_RESP || includedServices[includedServices.length - 1].endHandle === service.endHandle) {
      var includedServiceUuids = [];

      for (i = 0; i < includedServices.length; i++) {
        if (uuids.length === 0 || uuids.indexOf(includedServices[i].uuid) !== -1) {
          includedServiceUuids.push(includedServices[i].uuid);
        }
      }

      this.emit('includedServicesDiscover', this._address, service.uuid, includedServiceUuids);
    } else {
      this._queueCommand(this.readByTypeRequest(includedServices[includedServices.length - 1].endHandle + 1, service.endHandle, GATT_INCLUDE_UUID), callback);
    }
  }.bind(this);

  this._queueCommand(this.readByTypeRequest(service.startHandle, service.endHandle, GATT_INCLUDE_UUID), callback);
};

L2capBle.prototype.discoverCharacteristics = function(serviceUuid, characteristicUuids) {
  var service = this._services[serviceUuid];
  var characteristics = [];

  this._characteristics[serviceUuid] = {};
  this._descriptors[serviceUuid] = {};

  var callback = function(data) {
    var opcode = data[0];
    var i = 0;

    if (opcode === ATT_OP_READ_BY_TYPE_RESP) {
      var type = data[1];
      var num = (data.length - 2) / type;

      for (i = 0; i < num; i++) {
        characteristics.push({
          startHandle: data.readUInt16LE(2 + i * type + 0),
          properties: data.readUInt8(2 + i * type + 2),
          valueHandle: data.readUInt16LE(2 + i * type + 3),
          uuid: (type == 7) ? data.readUInt16LE(2 + i * type + 5).toString(16) : data.slice(2 + i * type + 5).slice(0, 16).toString('hex').match(/.{1,2}/g).reverse().join('')
        });
      }
    }

    if (opcode !== ATT_OP_READ_BY_TYPE_RESP || characteristics[characteristics.length - 1].valueHandle === service.endHandle) {

      var characteristicsDiscovered = [];
      for (i = 0; i < characteristics.length; i++) {
        var properties = characteristics[i].properties;

        var characteristic = {
          properties: [],
          uuid: characteristics[i].uuid
        };

        if (i !== 0) {
          characteristics[i - 1].endHandle = characteristics[i].startHandle - 1;
        }

        if (i === (characteristics.length - 1)) {
          characteristics[i].endHandle = service.endHandle;
        }

        this._characteristics[serviceUuid][characteristics[i].uuid] = characteristics[i];

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

        if (characteristicUuids.length === 0 || characteristicUuids.indexOf(characteristic.uuid) !== -1) {
          characteristicsDiscovered.push(characteristic);
        }
      }

      this.emit('characteristicsDiscover', this._address, serviceUuid, characteristicsDiscovered);
    } else {
      this._queueCommand(this.readByTypeRequest(characteristics[characteristics.length - 1].valueHandle + 1, service.endHandle, GATT_CHARAC_UUID), callback);
    }
  }.bind(this);

  this._queueCommand(this.readByTypeRequest(service.startHandle, service.endHandle, GATT_CHARAC_UUID), callback);
};

L2capBle.prototype.read = function(serviceUuid, characteristicUuid) {
  var characteristic = this._characteristics[serviceUuid][characteristicUuid];

  var readData = new Buffer(0);

  var callback = function(data) {
    var opcode = data[0];

    if (opcode === ATT_OP_READ_RESP || opcode === ATT_OP_READ_BLOB_RESP) {
      readData = new Buffer(readData.toString('hex') + data.slice(1).toString('hex'), 'hex');

      if (data.length === this._mtu) {
        this._queueCommand(this.readBlobRequest(characteristic.valueHandle, readData.length), callback);
      } else {
        this.emit('read', this._address, serviceUuid, characteristicUuid, readData);
      }
    } else {
      this.emit('read', this._address, serviceUuid, characteristicUuid, readData);
    }
  }.bind(this);

  this._queueCommand(this.readRequest(characteristic.valueHandle), callback);
};

L2capBle.prototype.write = function(serviceUuid, characteristicUuid, data, withoutResponse) {
  var characteristic = this._characteristics[serviceUuid][characteristicUuid];

  if (withoutResponse) {
    this._queueCommand(this.writeRequest(characteristic.valueHandle, data, true), null, function() {
      this.emit('write', this._address, serviceUuid, characteristicUuid);
    }.bind(this));
  } else {
    this._queueCommand(this.writeRequest(characteristic.valueHandle, data, false), function(data) {
      var opcode = data[0];

      if (opcode === ATT_OP_WRITE_RESP) {
        this.emit('write', this._address, serviceUuid, characteristicUuid);
      }
    }.bind(this));
  }
};

L2capBle.prototype.broadcast = function(serviceUuid, characteristicUuid, broadcast) {
  var characteristic = this._characteristics[serviceUuid][characteristicUuid];

  this._queueCommand(this.readByTypeRequest(characteristic.startHandle, characteristic.endHandle, GATT_SERVER_CHARAC_CFG_UUID), function(data) {
    var opcode = data[0];
    if (opcode === ATT_OP_READ_BY_TYPE_RESP) {
      var type = data[1];
      var handle = data.readUInt16LE(2);
      var value = data.readUInt16LE(4);

      if (broadcast) {
        value |= 0x0001;
      } else {
        value &= 0xfffe;
      }

      var valueBuffer = new Buffer(2);
      valueBuffer.writeUInt16LE(value, 0);

      this._queueCommand(this.writeRequest(handle, valueBuffer, false), function(data) {
        var opcode = data[0];

        if (opcode === ATT_OP_WRITE_RESP) {
          this.emit('broadcast', this._address, serviceUuid, characteristicUuid, broadcast);
        }
      }.bind(this));
    }
  }.bind(this));
};

L2capBle.prototype.notify = function(serviceUuid, characteristicUuid, notify) {
  var characteristic = this._characteristics[serviceUuid][characteristicUuid];

  this._queueCommand(this.readByTypeRequest(characteristic.startHandle, characteristic.endHandle, GATT_CLIENT_CHARAC_CFG_UUID), function(data) {
    var opcode = data[0];
    if (opcode === ATT_OP_READ_BY_TYPE_RESP) {
      var type = data[1];
      var handle = data.readUInt16LE(2);
      var value = data.readUInt16LE(4);

      var useNotify = characteristic.properties & 0x10;
      var useIndicate = characteristic.properties & 0x20;

      if (notify) {
        if (useNotify) {
          value |= 0x0001;
        } else if (useIndicate) {
          value |= 0x0002;
        }
      } else {
        if (useNotify) {
          value &= 0xfffe;
        } else if (useIndicate) {
          value &= 0xfffd;
        }
      }

      var valueBuffer = new Buffer(2);
      valueBuffer.writeUInt16LE(value, 0);

      this._queueCommand(this.writeRequest(handle, valueBuffer, false), function(data) {
        var opcode = data[0];

        if (opcode === ATT_OP_WRITE_RESP) {
          this.emit('notify', this._address, serviceUuid, characteristicUuid, notify);
        }
      }.bind(this));
    }
  }.bind(this));
};

L2capBle.prototype.discoverDescriptors = function(serviceUuid, characteristicUuid) {
  var characteristic = this._characteristics[serviceUuid][characteristicUuid];
  var descriptors = [];

  this._descriptors[serviceUuid][characteristicUuid] = {};

  var callback = function(data) {
    var opcode = data[0];
    var i = 0;

    if (opcode === ATT_OP_FIND_INFO_RESP) {
      var num = data[1];

      for (i = 0; i < num; i++) {
        descriptors.push({
          handle: data.readUInt16LE(2 + i * 4 + 0),
          uuid: data.readUInt16LE(2 + i * 4 + 2).toString(16)
        });
      }
    }

    if (opcode !== ATT_OP_FIND_INFO_RESP || descriptors[descriptors.length - 1].handle === characteristic.endHandle) {
      var descriptorUuids = [];
      for (i = 0; i < descriptors.length; i++) {
        descriptorUuids.push(descriptors[i].uuid);

        this._descriptors[serviceUuid][characteristicUuid][descriptors[i].uuid] = descriptors[i];
      }

      this.emit('descriptorsDiscover', this._address, serviceUuid, characteristicUuid, descriptorUuids);
    } else {
      this._queueCommand(this.findInfoRequest(descriptors[descriptors.length - 1].handle + 1, characteristic.endHandle), callback);
    }
  }.bind(this);

  this._queueCommand(this.findInfoRequest(characteristic.valueHandle + 1, characteristic.endHandle), callback);
};

L2capBle.prototype.readValue = function(serviceUuid, characteristicUuid, descriptorUuid) {
  var descriptor = this._descriptors[serviceUuid][characteristicUuid][descriptorUuid];

  this._queueCommand(this.readRequest(descriptor.handle), function(data) {
    var opcode = data[0];

    if (opcode === ATT_OP_READ_RESP) {
      this.emit('valueRead', this._address, serviceUuid, characteristicUuid, descriptorUuid, data.slice(1));
    }
  }.bind(this));
};

L2capBle.prototype.writeValue = function(serviceUuid, characteristicUuid, descriptorUuid, data) {
  var descriptor = this._descriptors[serviceUuid][characteristicUuid][descriptorUuid];

  this._queueCommand(this.writeRequest(descriptor.handle, data, false), function(data) {
    var opcode = data[0];

    if (opcode === ATT_OP_WRITE_RESP) {
      this.emit('valueWrite', this._address, serviceUuid, characteristicUuid, descriptorUuid);
    }
  }.bind(this));
};

L2capBle.prototype.readHandle = function(handle) {
  this._queueCommand(this.readRequest(handle), function(data) {
    var opcode = data[0];

    if (opcode === ATT_OP_READ_RESP) {
      this.emit('handleRead', this._address, handle, data.slice(1));
    }
  }.bind(this));
};

L2capBle.prototype.writeHandle = function(handle, data, withoutResponse) {
  if (withoutResponse) {
    this._queueCommand(this.writeRequest(handle, data, true), null, function() {
      this.emit('handleWrite', this._address, handle);
    }.bind(this));
  } else {
    this._queueCommand(this.writeRequest(handle, data, false), function(data) {
      var opcode = data[0];

      if (opcode === ATT_OP_WRITE_RESP) {
        this.emit('handleWrite', this._address, handle);
      }
    }.bind(this));
  }
};

L2capBle.prototype.l2capBleWrite = function(message) {
  if (this._l2capBle) {
    this._l2capBle.stdin.write(message);
  } else if (typeof message === 'string') {
    console.warn('noble: Cannot write to l2cap-ble, message: ' + message.trim());
  } else {
    console.warn('noble: Cannot write to l2cap-ble, unknown message');
  }
};

L2capBle.prototype.l2capBleKill = function(signal) {
  if (this._l2capBle) {
    this._l2capBle.kill(signal);
  } else if (signal) {
    console.warn('noble: Cannot kill l2cap-ble, signal: ' + signal);
  } else {
    console.warn('noble: Cannot kill l2cap-ble, signal: SIGTERM');
  }
};

module.exports = L2capBle;
