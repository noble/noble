var debug = require('debug')('hci');

var events = require('events');
var util = require('util');

var BluetoothHciSocket = require('bluetooth-hci-socket');

var HCI_COMMAND_PKT = 0x01;
var HCI_ACLDATA_PKT = 0x02;
var HCI_EVENT_PKT = 0x04;

var ACL_START_NO_FLUSH = 0x00;
var ACL_CONT  = 0x01;
var ACL_START = 0x02;

var EVT_DISCONN_COMPLETE = 0x05;
var EVT_ENCRYPT_CHANGE = 0x08;
var EVT_CMD_COMPLETE = 0x0e;
var EVT_CMD_STATUS = 0x0f;
var EVT_NUMBER_OF_COMPLETED_PACKETS = 0x13;
var EVT_LE_META_EVENT = 0x3e;

var EVT_LE_CONN_COMPLETE = 0x01;
var EVT_LE_ADVERTISING_REPORT = 0x02;
var EVT_LE_CONN_UPDATE_COMPLETE = 0x03;

var OGF_LINK_CTL = 0x01;
var OCF_DISCONNECT = 0x0006;

var OGF_HOST_CTL = 0x03;
var OCF_SET_EVENT_MASK = 0x0001;
var OCF_RESET = 0x0003;
var OCF_READ_LE_HOST_SUPPORTED = 0x006C;
var OCF_WRITE_LE_HOST_SUPPORTED = 0x006D;

var OGF_INFO_PARAM = 0x04;
var OCF_READ_LOCAL_VERSION = 0x0001;
var OCF_READ_BUFFER_SIZE = 0x0005;
var OCF_READ_BD_ADDR = 0x0009;

var OGF_STATUS_PARAM = 0x05;
var OCF_READ_RSSI = 0x0005;

var OGF_LE_CTL = 0x08;
var OCF_LE_SET_EVENT_MASK = 0x0001;
var OCF_LE_READ_BUFFER_SIZE = 0x0002;
var OCF_LE_SET_SCAN_PARAMETERS = 0x000b;
var OCF_LE_SET_SCAN_ENABLE = 0x000c;
var OCF_LE_CREATE_CONN = 0x000d;
var OCF_LE_CONN_UPDATE = 0x0013;
var OCF_LE_START_ENCRYPTION = 0x0019;

var DISCONNECT_CMD = OCF_DISCONNECT | OGF_LINK_CTL << 10;

var SET_EVENT_MASK_CMD = OCF_SET_EVENT_MASK | OGF_HOST_CTL << 10;
var RESET_CMD = OCF_RESET | OGF_HOST_CTL << 10;
var READ_LE_HOST_SUPPORTED_CMD = OCF_READ_LE_HOST_SUPPORTED | OGF_HOST_CTL << 10;
var WRITE_LE_HOST_SUPPORTED_CMD = OCF_WRITE_LE_HOST_SUPPORTED | OGF_HOST_CTL << 10;

var READ_LOCAL_VERSION_CMD = OCF_READ_LOCAL_VERSION | (OGF_INFO_PARAM << 10);
var READ_BUFFER_SIZE_CMD = OCF_READ_BUFFER_SIZE | (OGF_INFO_PARAM << 10);
var READ_BD_ADDR_CMD = OCF_READ_BD_ADDR | (OGF_INFO_PARAM << 10);

var READ_RSSI_CMD = OCF_READ_RSSI | OGF_STATUS_PARAM << 10;

var LE_SET_EVENT_MASK_CMD = OCF_LE_SET_EVENT_MASK | OGF_LE_CTL << 10;
var LE_READ_BUFFER_SIZE_CMD = OCF_LE_READ_BUFFER_SIZE | OGF_LE_CTL << 10;
var LE_SET_SCAN_PARAMETERS_CMD = OCF_LE_SET_SCAN_PARAMETERS | OGF_LE_CTL << 10;
var LE_SET_SCAN_ENABLE_CMD = OCF_LE_SET_SCAN_ENABLE | OGF_LE_CTL << 10;
var LE_CREATE_CONN_CMD = OCF_LE_CREATE_CONN | OGF_LE_CTL << 10;
var LE_CONN_UPDATE_CMD = OCF_LE_CONN_UPDATE | OGF_LE_CTL << 10;
var LE_START_ENCRYPTION_CMD = OCF_LE_START_ENCRYPTION | OGF_LE_CTL << 10;

var HCI_OE_USER_ENDED_CONNECTION = 0x13;

var STATUS_MAPPER = require('./hci-status');

var Hci = function() {
  this._socket = new BluetoothHciSocket();
  this._isDevUp = null;
  this._state = null;
  this._deviceId = null;
  // le-u min payload size + l2cap header size
  // see Bluetooth spec 4.2 [Vol 3, Part A, Chapter 4]
  this._aclMtu = 23 + 4;
  this._aclMaxInProgress = 1;

  this.resetBuffers();

  this.on('stateChange', this.onStateChange.bind(this));
};

util.inherits(Hci, events.EventEmitter);

Hci.STATUS_MAPPER = STATUS_MAPPER;

Hci.prototype.init = function() {
  this._socket.on('data', this.onSocketData.bind(this));
  this._socket.on('error', this.onSocketError.bind(this));

  var deviceId = process.env.NOBLE_HCI_DEVICE_ID ? parseInt(process.env.NOBLE_HCI_DEVICE_ID, 10) : undefined;

  if (process.env.HCI_CHANNEL_USER) {
    this._deviceId = this._socket.bindUser(deviceId);
    this._socket.start();

    this.reset();
  } else {
    this._deviceId = this._socket.bindRaw(deviceId);
    this._socket.start();

    this.pollIsDevUp();
  }
};

Hci.prototype.resetBuffers = function() {
  this._handleAclsInProgress = {};
  this._handleBuffers = {};
  this._aclOutQueue = [];
};

Hci.prototype.pollIsDevUp = function() {
  var isDevUp = this._socket.isDevUp();

  if (this._isDevUp !== isDevUp) {
    if (isDevUp) {
      this.setSocketFilter();
      this.initDev();
    } else {
      this.emit('stateChange', 'poweredOff');
    }

    this._isDevUp = isDevUp;
  }

  setTimeout(this.pollIsDevUp.bind(this), 1000);
};

Hci.prototype.initDev = function() {
  this.resetBuffers();
  this.setEventMask();
  this.setLeEventMask();
  this.readLocalVersion();
  this.writeLeHostSupported();
  this.readLeHostSupported();
  this.readBdAddr();
  this.leReadBufferSize();
};

Hci.prototype.setSocketFilter = function() {
  var filter = Buffer.alloc(14);
  var typeMask = (1 << HCI_COMMAND_PKT) | (1 << HCI_EVENT_PKT) | (1 << HCI_ACLDATA_PKT);
  var eventMask1 = (1 << EVT_DISCONN_COMPLETE) | (1 << EVT_ENCRYPT_CHANGE) | (1 << EVT_CMD_COMPLETE) | (1 << EVT_CMD_STATUS) | ( 1 << EVT_NUMBER_OF_COMPLETED_PACKETS);
  var eventMask2 = (1 << (EVT_LE_META_EVENT - 32));
  var opcode = 0;

  filter.writeUInt32LE(typeMask, 0);
  filter.writeUInt32LE(eventMask1, 4);
  filter.writeUInt32LE(eventMask2, 8);
  filter.writeUInt16LE(opcode, 12);

  debug(`setting filter to: ${filter.toString('hex')}`);
  this._socket.setFilter(filter);
};

Hci.prototype.setEventMask = function() {
  var cmd = Buffer.alloc(12);
  var eventMask = Buffer.from('fffffbff07f8bf3d', 'hex');

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(SET_EVENT_MASK_CMD, 1);

  // length
  cmd.writeUInt8(eventMask.length, 3);

  eventMask.copy(cmd, 4);

  debug(`set event mask - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.reset = function() {
  var cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(OCF_RESET | OGF_HOST_CTL << 10, 1);

  // length
  cmd.writeUInt8(0x00, 3);

  debug(`reset - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readLocalVersion = function() {
  var cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(READ_LOCAL_VERSION_CMD, 1);

  // length
  cmd.writeUInt8(0x0, 3);

  debug(`read local version - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readBdAddr = function() {
  var cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(READ_BD_ADDR_CMD, 1);

  // length
  cmd.writeUInt8(0x0, 3);

  debug(`read bd addr - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.setLeEventMask = function() {
  var cmd = Buffer.alloc(12);
  var leEventMask = Buffer.from('1f00000000000000', 'hex');

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_SET_EVENT_MASK_CMD, 1);

  // length
  cmd.writeUInt8(leEventMask.length, 3);

  leEventMask.copy(cmd, 4);

  debug(`set le event mask - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readLeHostSupported = function() {
  var cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(READ_LE_HOST_SUPPORTED_CMD, 1);

  // length
  cmd.writeUInt8(0x00, 3);

  debug(`read LE host supported - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.writeLeHostSupported = function() {
  var cmd = Buffer.alloc(6);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(WRITE_LE_HOST_SUPPORTED_CMD, 1);

  // length
  cmd.writeUInt8(0x02, 3);

  // data
  cmd.writeUInt8(0x01, 4); // le
  cmd.writeUInt8(0x00, 5); // simul

  debug(`write LE host supported - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.setScanParameters = function() {
  var cmd = Buffer.alloc(11);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_SET_SCAN_PARAMETERS_CMD, 1);

  // length
  cmd.writeUInt8(0x07, 3);

  // data
  cmd.writeUInt8(0x01, 4); // type: 0 -> passive, 1 -> active
  cmd.writeUInt16LE(0x0010, 5); // internal, ms * 1.6
  cmd.writeUInt16LE(0x0010, 7); // window, ms * 1.6
  cmd.writeUInt8(0x00, 9); // own address type: 0 -> public, 1 -> random
  cmd.writeUInt8(0x00, 10); // filter: 0 -> all event types

  debug(`set scan parameters - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.setScanEnabled = function(enabled, filterDuplicates) {
  var cmd = Buffer.alloc(6);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_SET_SCAN_ENABLE_CMD, 1);

  // length
  cmd.writeUInt8(0x02, 3);

  // data
  cmd.writeUInt8(enabled ? 0x01 : 0x00, 4); // enable: 0 -> disabled, 1 -> enabled
  cmd.writeUInt8(filterDuplicates ? 0x01 : 0x00, 5); // duplicates: 0 -> duplicates, 0 -> duplicates

  debug(`set scan enabled - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.createLeConn = function(address, addressType) {
  var cmd = Buffer.alloc(29);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_CREATE_CONN_CMD, 1);

  // length
  cmd.writeUInt8(0x19, 3);

  // data
  cmd.writeUInt16LE(0x0060, 4); // interval
  cmd.writeUInt16LE(0x0030, 6); // window
  cmd.writeUInt8(0x00, 8); // initiator filter

  cmd.writeUInt8(addressType === 'random' ? 0x01 : 0x00, 9); // peer address type
  Buffer.from(address.split(':').reverse().join(''), 'hex').copy(cmd, 10); // peer address

  cmd.writeUInt8(0x00, 16); // own address type

  cmd.writeUInt16LE(0x0006, 17); // min interval
  cmd.writeUInt16LE(0x000c, 19); // max interval
  cmd.writeUInt16LE(0x0000, 21); // latency
  cmd.writeUInt16LE(0x00c8, 23); // supervision timeout
  cmd.writeUInt16LE(0x0004, 25); // min ce length
  cmd.writeUInt16LE(0x0006, 27); // max ce length

  debug(`create le conn - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.connUpdateLe = function(handle, minInterval, maxInterval, latency, supervisionTimeout) {
  var cmd = Buffer.alloc(18);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_CONN_UPDATE_CMD, 1);

  // length
  cmd.writeUInt8(0x0e, 3);

  // data
  cmd.writeUInt16LE(handle, 4);
  cmd.writeUInt16LE(Math.floor(minInterval / 1.25), 6); // min interval
  cmd.writeUInt16LE(Math.floor(maxInterval / 1.25), 8); // max interval
  cmd.writeUInt16LE(latency, 10); // latency
  cmd.writeUInt16LE(Math.floor(supervisionTimeout / 10), 12); // supervision timeout
  cmd.writeUInt16LE(0x0000, 14); // min ce length
  cmd.writeUInt16LE(0x0000, 16); // max ce length

  debug(`conn update le - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.startLeEncryption = function(handle, random, diversifier, key) {
  var cmd = Buffer.alloc(32);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_START_ENCRYPTION_CMD, 1);

  // length
  cmd.writeUInt8(0x1c, 3);

  // data
  cmd.writeUInt16LE(handle, 4); // handle
  random.copy(cmd, 6);
  diversifier.copy(cmd, 14);
  key.copy(cmd, 16);

  debug(`start le encryption - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.disconnect = function(handle, reason) {
  var cmd = Buffer.alloc(7);

  reason = reason || HCI_OE_USER_ENDED_CONNECTION;

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(DISCONNECT_CMD, 1);

  // length
  cmd.writeUInt8(0x03, 3);

  // data
  cmd.writeUInt16LE(handle, 4); // handle
  cmd.writeUInt8(reason, 6); // reason

  debug(`disconnect - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readRssi = function(handle) {
  var cmd = Buffer.alloc(6);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(READ_RSSI_CMD, 1);

  // length
  cmd.writeUInt8(0x02, 3);

  // data
  cmd.writeUInt16LE(handle, 4); // handle

  debug(`read rssi - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.leReadBufferSize = function() {
  var cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_READ_BUFFER_SIZE_CMD, 1);

  // length
  cmd.writeUInt8(0x0, 3);

  debug(`le read buffer size - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readBufferSize = function() {
  var cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(READ_BUFFER_SIZE_CMD, 1);

  // length
  cmd.writeUInt8(0x0, 3);

  debug(`read buffer size - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.queueAclDataPkt = function(handle, cid, data) {
  var hf = handle | ACL_START_NO_FLUSH << 12;
  // l2cap pdu may be fragmented on hci level
  var l2capPdu = Buffer.alloc(4 + data.length);
  l2capPdu.writeUInt16LE(data.length, 0);
  l2capPdu.writeUInt16LE(cid, 2);
  data.copy(l2capPdu, 4);
  var fragId = 0;

  while (l2capPdu.length) {
    var frag = l2capPdu.slice(0, this._aclMtu);
    l2capPdu = l2capPdu.slice(frag.length);
    var pkt = Buffer.alloc(5 + frag.length);

    // hci header
    pkt.writeUInt8(HCI_ACLDATA_PKT, 0);
    pkt.writeUInt16LE(hf, 1);
    hf |= ACL_CONT << 12;
    pkt.writeUInt16LE(frag.length, 3); // hci pdu length

    frag.copy(pkt, 5);

    this._aclOutQueue.push({
      handle: handle,
      pkt: pkt,
      fragId: fragId++
    });
  }

  this.pushAclOutQueue();
};

Hci.prototype.pushAclOutQueue = function() {
  var inProgress = 0;
  for (var handle in this._handleAclsInProgress) {
    inProgress += this._handleAclsInProgress[handle];
  }
  while (inProgress < this._aclMaxInProgress && this._aclOutQueue.length) {
    inProgress++;
    this.writeOneAclDataPkt();
  }

  if (inProgress >= this._aclMaxInProgress && this._aclOutQueue.length) {
    debug('acl out queue congested');
    debug(`\tin progress = ${inProgress}`);
    debug(`\twaiting = ${this._aclOutQueue.length}`);
  }
};

Hci.prototype.writeOneAclDataPkt = function() {
  var pkt = this._aclOutQueue.shift();
  this._handleAclsInProgress[pkt.handle]++;
  debug(`write acl data pkt frag ${pkt.fragId} handle ${pkt.handle} - writing: ${pkt.pkt.toString('hex')}`);
  this._socket.write(pkt.pkt);
};

Hci.prototype.onSocketData = function(data) {
  debug(`onSocketData: ${data.toString('hex')}`);

  var eventType = data.readUInt8(0);
  var handle;

  debug(`\tevent type = ${eventType}`);

  if (HCI_EVENT_PKT === eventType) {
    var subEventType = data.readUInt8(1);

    debug(`\tsub event type = ${subEventType}`);

    if (subEventType === EVT_DISCONN_COMPLETE) {
      handle =  data.readUInt16LE(4);
      var reason = data.readUInt8(6);

      debug(`\t\thandle = ${handle}`);
      debug(`\t\treason = ${reason}`);

      /* As per Bluetooth Core specs:
      When the Host receives a Disconnection Complete, Disconnection Physical
      Link Complete or Disconnection Logical Link Complete event, the Host shall
      assume that all unacknowledged HCI Data Packets that have been sent to the
      Controller for the returned Handle have been flushed, and that the
      corresponding data buffers have been freed. */
      delete this._handleAclsInProgress[handle];
      var aclOutQueue = [];
      var discarded = 0;
      for (var i in this._aclOutQueue) {
        if (this._aclOutQueue[i].handle !== handle) {
          aclOutQueue.push(this._aclOutQueue[i]);
        } else {
          discarded++;
        }
      }
      if (discarded) {
        debug(`\t\tacls discarded = ${discarded}`);
      }
      this._aclOutQueue = aclOutQueue;
      this.pushAclOutQueue();
      this.emit('disconnComplete', handle, reason);
    } else if (subEventType === EVT_ENCRYPT_CHANGE) {
      handle =  data.readUInt16LE(4);
      var encrypt = data.readUInt8(6);

      debug(`\t\thandle = ${handle}`);
      debug(`\t\tencrypt = ${encrypt}`);

      this.emit('encryptChange', handle, encrypt);
    } else if (subEventType === EVT_CMD_COMPLETE) {
      var ncmd = data.readUInt8(3);
      var cmd = data.readUInt16LE(4);
      var status = data.readUInt8(6);
      var result = data.slice(7);

      debug(`\t\tncmd = ${ncmd}`);
      debug(`\t\tcmd = ${cmd}`);
      debug(`\t\tstatus = ${status}`);
      debug(`\t\tresult = ${result.toString('hex')}`);

      this.processCmdCompleteEvent(cmd, status, result);
    } else if (subEventType === EVT_CMD_STATUS) {
      status = data.readUInt8(3);
      cmd = data.readUInt16LE(5);

      debug(`\t\tstatus = ${status}`);
      debug(`\t\tcmd = ${cmd}`);

      this.processCmdStatusEvent(cmd, status);
    } else if (subEventType === EVT_LE_META_EVENT) {
      var leMetaEventType = data.readUInt8(3);
      var leMetaEventStatus = data.readUInt8(4);
      var leMetaEventData = data.slice(5);

      debug(`\t\tLE meta event type = ${leMetaEventType}`);
      debug(`\t\tLE meta event status = ${leMetaEventStatus}`);
      debug(`\t\tLE meta event data = ${leMetaEventData.toString('hex')}`);

      this.processLeMetaEvent(leMetaEventType, leMetaEventStatus, leMetaEventData);
    } else if (subEventType === EVT_NUMBER_OF_COMPLETED_PACKETS) {
      var handles = data.readUInt8(3);
      for (var h = 0; h < handles; h++) {
        handle = data.readUInt16LE(4 + h * 4);
        var pkts = data.readUInt16LE(6 + h * 4);
        debug(`\thandle = ${handle}`);
        debug(`\t\tcompleted = ${pkts}`);
        if (this._handleAclsInProgress[handle] === undefined) {
          debug('\t\talready closed');
          continue;
        }
        if (pkts > this._handleAclsInProgress[handle]) {
          // Linux kernel may send acl packets by itself, so be ready for underflow
          this._handleAclsInProgress[handle] = 0;
        } else {
          this._handleAclsInProgress[handle] -= pkts;
        }
        debug(`\t\tin progress = ${this._handleAclsInProgress[handle]}`);
      }
      this.pushAclOutQueue();
    }
  } else if (HCI_ACLDATA_PKT === eventType) {
    var flags = data.readUInt16LE(1) >> 12;
    handle = data.readUInt16LE(1) & 0x0fff;

    if (ACL_START === flags) {
      var cid = data.readUInt16LE(7);

      var length = data.readUInt16LE(5);
      var pktData = data.slice(9);

      debug(`\t\tcid = ${cid}`);

      if (length === pktData.length) {
        debug(`\t\thandle = ${handle}`);
        debug(`\t\tdata = ${pktData.toString('hex')}`);

        this.emit('aclDataPkt', handle, cid, pktData);
      } else {
        this._handleBuffers[handle] = {
          length: length,
          cid: cid,
          data: pktData
        };
      }
    } else if (ACL_CONT === flags) {
      if (!this._handleBuffers[handle] || !this._handleBuffers[handle].data) {
        return;
      }

      this._handleBuffers[handle].data = Buffer.concat([
        this._handleBuffers[handle].data,
        data.slice(5)
      ]);

      if (this._handleBuffers[handle].data.length === this._handleBuffers[handle].length) {
        this.emit('aclDataPkt', handle, this._handleBuffers[handle].cid, this._handleBuffers[handle].data);

        delete this._handleBuffers[handle];
      }
    }
  } else if (HCI_COMMAND_PKT === eventType) {
    cmd = data.readUInt16LE(1);
    var len = data.readUInt8(3);

    debug(`\t\tcmd = ${cmd}`);
    debug(`\t\tdata len = ${len}`);

    if (cmd === LE_SET_SCAN_ENABLE_CMD) {
      var enable = (data.readUInt8(4) === 0x1);
      var filterDuplicates = (data.readUInt8(5) === 0x1);

      debug('\t\t\tLE enable scan command');
      debug(`\t\t\tenable scanning = ${enable}`);
      debug(`\t\t\tfilter duplicates = ${filterDuplicates}`);

      this.emit('leScanEnableSetCmd', enable, filterDuplicates);
    }
  }
};

Hci.prototype.onSocketError = function(error) {
  debug(`onSocketError: ${error.message}`);

  if (error.message === 'Operation not permitted') {
    this.emit('stateChange', 'unauthorized');
  } else if (error.message === 'Network is down') {
    // no-op
  }
};

Hci.prototype.processCmdCompleteEvent = function(cmd, status, result) {
  if (cmd === RESET_CMD) {
    /*
    * @todo this.initDev does more than this, but bleno has it.
    this.setEventMask();
    this.setLeEventMask();
    this.readLocalVersion();
    this.readBdAddr();
    */
    this.initDev();
  } else if (cmd === READ_LE_HOST_SUPPORTED_CMD) {
    if (status === 0) {
      var le = result.readUInt8(0);
      var simul = result.readUInt8(1);

      debug(`\t\t\tle = ${le}`);
      debug(`\t\t\tsimul = ${simul}`);
    }
  } else if (cmd === READ_LOCAL_VERSION_CMD) {
    var hciVer = result.readUInt8(0);
    var hciRev = result.readUInt16LE(1);
    var lmpVer = result.readInt8(3);
    var manufacturer = result.readUInt16LE(4);
    var lmpSubVer = result.readUInt16LE(6);

    if (hciVer < 0x06) {
      this.emit('stateChange', 'unsupported');
    } else if (this._state !== 'poweredOn') {
      this.setScanEnabled(false, true);
      this.setScanParameters();
    }

    this.emit('readLocalVersion', hciVer, hciRev, lmpVer, manufacturer, lmpSubVer);
  } else if (cmd === READ_BD_ADDR_CMD) {
    this.addressType = 'public';
    this.address = result.toString('hex').match(/.{1,2}/g).reverse().join(':');

    debug(`address = ${this.address}`);

    this.emit('addressChange', this.address);
  } else if (cmd === LE_SET_SCAN_PARAMETERS_CMD) {
    this.emit('stateChange', 'poweredOn');

    this.emit('leScanParametersSet');
  } else if (cmd === LE_SET_SCAN_ENABLE_CMD) {
    this.emit('leScanEnableSet', status);
  } else if (cmd === READ_RSSI_CMD) {
    var handle = result.readUInt16LE(0);
    var rssi = result.readInt8(2);

    debug(`\t\t\thandle = ${handle}`);
    debug(`\t\t\trssi = ${rssi}`);

    this.emit('rssiRead', handle, rssi);
  } else if (cmd === LE_READ_BUFFER_SIZE_CMD) {
    if (!status) {
      this.processLeReadBufferSize(result);
    }
  } else if (cmd === READ_BUFFER_SIZE_CMD) {
    if (!status) {
      var aclMtu = result.readUInt16LE(0);
      var aclMaxInProgress = result.readUInt16LE(3);
      // sanity
      if (aclMtu && aclMaxInProgress) {
        debug(`br/edr acl mtu = ${aclMtu}`);
        debug(`br/edr acl max pkts = ${aclMaxInProgress}`);
        this._aclMtu = aclMtu;
        this._aclMaxInProgress = aclMaxInProgress;
      }
    }
  }
};

Hci.prototype.processLeReadBufferSize = function(result) {
  var aclMtu = result.readUInt16LE(0);
  var aclMaxInProgress = result.readUInt8(2);
  if (!aclMtu) {
    // as per Bluetooth specs
    debug('falling back to br/edr buffer size');
    this.readBufferSize();
  } else {
    debug(`le acl mtu = ${aclMtu}`);
    debug(`le acl max in progress = ${aclMaxInProgress}`);
    this._aclMtu = aclMtu;
    this._aclMaxInProgress = aclMaxInProgress;
  }
};

Hci.prototype.processLeMetaEvent = function(eventType, status, data) {
  if (eventType === EVT_LE_CONN_COMPLETE) {
    this.processLeConnComplete(status, data);
  } else if (eventType === EVT_LE_ADVERTISING_REPORT) {
    this.processLeAdvertisingReport(status, data);
  } else if (eventType === EVT_LE_CONN_UPDATE_COMPLETE) {
    this.processLeConnUpdateComplete(status, data);
  }
};

Hci.prototype.processLeConnComplete = function(status, data) {
  var handle = data.readUInt16LE(0);
  var role = data.readUInt8(2);
  var addressType = data.readUInt8(3) === 0x01 ? 'random': 'public';
  var address = data.slice(4, 10).toString('hex').match(/.{1,2}/g).reverse().join(':');
  var interval = data.readUInt16LE(10) * 1.25;
  var latency = data.readUInt16LE(12); // TODO: multiplier?
  var supervisionTimeout = data.readUInt16LE(14) * 10;
  var masterClockAccuracy = data.readUInt8(16); // TODO: multiplier?

  debug(`\t\t\thandle = ${handle}`);
  debug(`\t\t\trole = ${role}`);
  debug(`\t\t\taddress type = ${addressType}`);
  debug(`\t\t\taddress = ${address}`);
  debug(`\t\t\tinterval = ${interval}`);
  debug(`\t\t\tlatency = ${latency}`);
  debug(`\t\t\tsupervision timeout = ${supervisionTimeout}`);
  debug(`\t\t\tmaster clock accuracy = ${masterClockAccuracy}`);

  this._handleAclsInProgress[handle] = 0;

  this.emit('leConnComplete', status, handle, role, addressType, address, interval, latency, supervisionTimeout, masterClockAccuracy);
};

Hci.prototype.processLeAdvertisingReport = function(count, data) {
  for (var i = 0; i < count; i++) {
    var type = data.readUInt8(0);
    var addressType = data.readUInt8(1) === 0x01 ? 'random' : 'public';
    var address = data.slice(2, 8).toString('hex').match(/.{1,2}/g).reverse().join(':');
    var eirLength = data.readUInt8(8);
    var eir = data.slice(9, eirLength + 9);
    var rssi = data.readInt8(eirLength + 9);

    debug(`\t\t\ttype = ${type}`);
    debug(`\t\t\taddress = ${address}`);
    debug(`\t\t\taddress type = ${addressType}`);
    debug(`\t\t\teir = ${eir.toString('hex')}`);
    debug(`\t\t\trssi = ${rssi}`);

    this.emit('leAdvertisingReport', 0, type, address, addressType, eir, rssi);

    data = data.slice(eirLength + 10);
  }
};

Hci.prototype.processLeConnUpdateComplete = function(status, data) {
  var handle = data.readUInt16LE(0);
  var interval = data.readUInt16LE(2) * 1.25;
  var latency = data.readUInt16LE(4); // TODO: multiplier?
  var supervisionTimeout = data.readUInt16LE(6) * 10;

  debug(`\t\t\thandle = ${handle}`);
  debug(`\t\t\tinterval = ${interval}`);
  debug(`\t\t\tlatency = ${latency}`);
  debug(`\t\t\tsupervision timeout = ${supervisionTimeout}`);

  this.emit('leConnUpdateComplete', status, handle, interval, latency, supervisionTimeout);
};

Hci.prototype.processCmdStatusEvent = function(cmd, status) {
  if (cmd === LE_CREATE_CONN_CMD) {
    if (status !== 0) {
      this.emit('leConnComplete', status);
    }
  }
};

Hci.prototype.onStateChange = function(state) {
  this._state = state;
};

module.exports = Hci;
