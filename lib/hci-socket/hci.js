const debug = require('debug')('hci');

const events = require('events');

const BluetoothHciSocket = require('bluetooth-hci-socket');

const HCI_COMMAND_PKT = 0x01;
const HCI_ACLDATA_PKT = 0x02;
const HCI_EVENT_PKT = 0x04;

const ACL_START_NO_FLUSH = 0x00;
const ACL_CONT  = 0x01;
const ACL_START = 0x02;

const EVT_DISCONN_COMPLETE = 0x05;
const EVT_ENCRYPT_CHANGE = 0x08;
const EVT_CMD_COMPLETE = 0x0e;
const EVT_CMD_STATUS = 0x0f;
const EVT_NUMBER_OF_COMPLETED_PACKETS = 0x13;
const EVT_LE_META_EVENT = 0x3e;

const EVT_LE_CONN_COMPLETE = 0x01;
const EVT_LE_ADVERTISING_REPORT = 0x02;
const EVT_LE_CONN_UPDATE_COMPLETE = 0x03;

const OGF_LINK_CTL = 0x01;
const OCF_DISCONNECT = 0x0006;

const OGF_HOST_CTL = 0x03;
const OCF_SET_EVENT_MASK = 0x0001;
const OCF_RESET = 0x0003;
const OCF_READ_LE_HOST_SUPPORTED = 0x006C;
const OCF_WRITE_LE_HOST_SUPPORTED = 0x006D;

const OGF_INFO_PARAM = 0x04;
const OCF_READ_LOCAL_VERSION = 0x0001;
const OCF_READ_BUFFER_SIZE = 0x0005;
const OCF_READ_BD_ADDR = 0x0009;

const OGF_STATUS_PARAM = 0x05;
const OCF_READ_RSSI = 0x0005;

const OGF_LE_CTL = 0x08;
const OCF_LE_SET_EVENT_MASK = 0x0001;
const OCF_LE_READ_BUFFER_SIZE = 0x0002;
const OCF_LE_SET_SCAN_PARAMETERS = 0x000b;
const OCF_LE_SET_SCAN_ENABLE = 0x000c;
const OCF_LE_CREATE_CONN = 0x000d;
const OCF_LE_CONN_UPDATE = 0x0013;
const OCF_LE_START_ENCRYPTION = 0x0019;

const DISCONNECT_CMD = OCF_DISCONNECT | OGF_LINK_CTL << 10;

const SET_EVENT_MASK_CMD = OCF_SET_EVENT_MASK | OGF_HOST_CTL << 10;
const RESET_CMD = OCF_RESET | OGF_HOST_CTL << 10;
const READ_LE_HOST_SUPPORTED_CMD = OCF_READ_LE_HOST_SUPPORTED | OGF_HOST_CTL << 10;
const WRITE_LE_HOST_SUPPORTED_CMD = OCF_WRITE_LE_HOST_SUPPORTED | OGF_HOST_CTL << 10;

const READ_LOCAL_VERSION_CMD = OCF_READ_LOCAL_VERSION | (OGF_INFO_PARAM << 10);
const READ_BUFFER_SIZE_CMD = OCF_READ_BUFFER_SIZE | (OGF_INFO_PARAM << 10);
const READ_BD_ADDR_CMD = OCF_READ_BD_ADDR | (OGF_INFO_PARAM << 10);

const READ_RSSI_CMD = OCF_READ_RSSI | OGF_STATUS_PARAM << 10;

const LE_SET_EVENT_MASK_CMD = OCF_LE_SET_EVENT_MASK | OGF_LE_CTL << 10;
const LE_READ_BUFFER_SIZE_CMD = OCF_LE_READ_BUFFER_SIZE | OGF_LE_CTL << 10;
const LE_SET_SCAN_PARAMETERS_CMD = OCF_LE_SET_SCAN_PARAMETERS | OGF_LE_CTL << 10;
const LE_SET_SCAN_ENABLE_CMD = OCF_LE_SET_SCAN_ENABLE | OGF_LE_CTL << 10;
const LE_CREATE_CONN_CMD = OCF_LE_CREATE_CONN | OGF_LE_CTL << 10;
const LE_CONN_UPDATE_CMD = OCF_LE_CONN_UPDATE | OGF_LE_CTL << 10;
const LE_START_ENCRYPTION_CMD = OCF_LE_START_ENCRYPTION | OGF_LE_CTL << 10;

const HCI_OE_USER_ENDED_CONNECTION = 0x13;

const STATUS_MAPPER = require('./hci-status.json');

class Hci extends events.EventEmitter {
  constructor(deviceId = 0, useUserChannel = false) {
    super();
    this._socket = new BluetoothHciSocket();
    this._isDevUp = null;
    this._state = null;
    this._deviceId = deviceId;
    this._useUserChannel = useUserChannel;
    // le-u min payload size + l2cap header size
    // see Bluetooth spec 4.2 [Vol 3, Part A, Chapter 4]
    this._aclMtu = 23 + 4;
    this._aclMaxInProgress = 1;

    this.resetBuffers();

    this.on('stateChange', this.onStateChange.bind(this));
  }

  init() {
    this._socket.on('data', this.onSocketData.bind(this));
    this._socket.on('error', this.onSocketError.bind(this));

    if (this._useUserChannel) {
      this._socket.bindUser(this._deviceId);
      this._socket.start();

      this.reset();
    } else {
      this._socket.bindRaw(this._deviceId);
      this._socket.start();

      this.pollIsDevUp();
    }
  }

  resetBuffers() {
    this._handleAclsInProgress = {};
    this._handleBuffers = {};
    this._aclOutQueue = [];
  }

  pollIsDevUp() {
    const isDevUp = this._socket.isDevUp();

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
  }

  initDev() {
    this.resetBuffers();
    this.setEventMask();
    this.setLeEventMask();
    this.readLocalVersion();
    this.writeLeHostSupported();
    this.readLeHostSupported();
    this.readBdAddr();
    this.leReadBufferSize();
  }

  setSocketFilter() {
    const filter = Buffer.alloc(14);
    const typeMask = (1 << HCI_COMMAND_PKT) | (1 << HCI_EVENT_PKT) | (1 << HCI_ACLDATA_PKT);
    const eventMask1 = (1 << EVT_DISCONN_COMPLETE) | (1 << EVT_ENCRYPT_CHANGE) | (1 << EVT_CMD_COMPLETE) | (1 << EVT_CMD_STATUS) | ( 1 << EVT_NUMBER_OF_COMPLETED_PACKETS);
    const eventMask2 = (1 << (EVT_LE_META_EVENT - 32));
    const opcode = 0;

    filter.writeUInt32LE(typeMask, 0);
    filter.writeUInt32LE(eventMask1, 4);
    filter.writeUInt32LE(eventMask2, 8);
    filter.writeUInt16LE(opcode, 12);

    debug(`setting filter to: ${filter.toString('hex')}`);
    this._socket.setFilter(filter);
  }

  setEventMask() {
    const cmd = Buffer.alloc(12);
    const eventMask = Buffer.from('fffffbff07f8bf3d', 'hex');

    // header
    cmd.writeUInt8(HCI_COMMAND_PKT, 0);
    cmd.writeUInt16LE(SET_EVENT_MASK_CMD, 1);

    // length
    cmd.writeUInt8(eventMask.length, 3);

    eventMask.copy(cmd, 4);

    debug(`set event mask - writing: ${cmd.toString('hex')}`);
    this._socket.write(cmd);
  }

  reset() {
    const cmd = Buffer.alloc(4);

    // header
    cmd.writeUInt8(HCI_COMMAND_PKT, 0);
    cmd.writeUInt16LE(OCF_RESET | OGF_HOST_CTL << 10, 1);

    // length
    cmd.writeUInt8(0x00, 3);

    debug(`reset - writing: ${cmd.toString('hex')}`);
    this._socket.write(cmd);
  }

  readLocalVersion() {
    const cmd = Buffer.alloc(4);

    // header
    cmd.writeUInt8(HCI_COMMAND_PKT, 0);
    cmd.writeUInt16LE(READ_LOCAL_VERSION_CMD, 1);

    // length
    cmd.writeUInt8(0x0, 3);

    debug(`read local version - writing: ${cmd.toString('hex')}`);
    this._socket.write(cmd);
  }

  readBdAddr() {
    const cmd = Buffer.alloc(4);

    // header
    cmd.writeUInt8(HCI_COMMAND_PKT, 0);
    cmd.writeUInt16LE(READ_BD_ADDR_CMD, 1);

    // length
    cmd.writeUInt8(0x0, 3);

    debug(`read bd addr - writing: ${cmd.toString('hex')}`);
    this._socket.write(cmd);
  }

  setLeEventMask() {
    const cmd = Buffer.alloc(12);
    const leEventMask = Buffer.from('1f00000000000000', 'hex');

    // header
    cmd.writeUInt8(HCI_COMMAND_PKT, 0);
    cmd.writeUInt16LE(LE_SET_EVENT_MASK_CMD, 1);

    // length
    cmd.writeUInt8(leEventMask.length, 3);

    leEventMask.copy(cmd, 4);

    debug(`set le event mask - writing: ${cmd.toString('hex')}`);
    this._socket.write(cmd);
  }

  readLeHostSupported() {
    const cmd = Buffer.alloc(4);

    // header
    cmd.writeUInt8(HCI_COMMAND_PKT, 0);
    cmd.writeUInt16LE(READ_LE_HOST_SUPPORTED_CMD, 1);

    // length
    cmd.writeUInt8(0x00, 3);

    debug(`read LE host supported - writing: ${cmd.toString('hex')}`);
    this._socket.write(cmd);
  }

  writeLeHostSupported() {
    const cmd = Buffer.alloc(6);

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
  }

  setScanParameters() {
    const cmd = Buffer.alloc(11);

    // header
    cmd.writeUInt8(HCI_COMMAND_PKT, 0);
    cmd.writeUInt16LE(LE_SET_SCAN_PARAMETERS_CMD, 1);

    // length
    cmd.writeUInt8(0x07, 3);

    // data
    cmd.writeUInt8(0x01, 4); // type: 0 -> passive, 1 -> active
    cmd.writeUInt16LE(0x00A0, 5); // scan interval, in units of 0.625 ms
    cmd.writeUInt16LE(0x00A0, 7); // scan window, in units of 0.625 ms
    cmd.writeUInt8(0x00, 9); // own address type: 0 -> public, 1 -> random
    cmd.writeUInt8(0x00, 10); // filter: 0 -> all event types

    debug(`set scan parameters - writing: ${cmd.toString('hex')}`);
    this._socket.write(cmd);
  }

  setScanEnabled(enabled, filterDuplicates) {
    const cmd = Buffer.alloc(6);

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
  }

  createLeConn(address, addressType) {
    const cmd = Buffer.alloc(29);

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
  }

  connUpdateLe(handle, minInterval, maxInterval, latency, supervisionTimeout) {
    const cmd = Buffer.alloc(18);

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
  }

  startLeEncryption(handle, random, diversifier, key) {
    const cmd = Buffer.alloc(32);

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
  }

  disconnect(handle, reason) {
    const cmd = Buffer.alloc(7);

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
  }

  readRssi(handle) {
    const cmd = Buffer.alloc(6);

    // header
    cmd.writeUInt8(HCI_COMMAND_PKT, 0);
    cmd.writeUInt16LE(READ_RSSI_CMD, 1);

    // length
    cmd.writeUInt8(0x02, 3);

    // data
    cmd.writeUInt16LE(handle, 4); // handle

    debug(`read rssi - writing: ${cmd.toString('hex')}`);
    this._socket.write(cmd);
  }

  leReadBufferSize() {
    const cmd = Buffer.alloc(4);

    // header
    cmd.writeUInt8(HCI_COMMAND_PKT, 0);
    cmd.writeUInt16LE(LE_READ_BUFFER_SIZE_CMD, 1);

    // length
    cmd.writeUInt8(0x0, 3);

    debug(`le read buffer size - writing: ${cmd.toString('hex')}`);
    this._socket.write(cmd);
  }

  readBufferSize() {
    const cmd = Buffer.alloc(4);

    // header
    cmd.writeUInt8(HCI_COMMAND_PKT, 0);
    cmd.writeUInt16LE(READ_BUFFER_SIZE_CMD, 1);

    // length
    cmd.writeUInt8(0x0, 3);

    debug(`read buffer size - writing: ${cmd.toString('hex')}`);
    this._socket.write(cmd);
  }

  queueAclDataPkt(handle, cid, data) {
    let hf = handle | ACL_START_NO_FLUSH << 12;
    // l2cap pdu may be fragmented on hci level
    let l2capPdu = Buffer.alloc(4 + data.length);
    l2capPdu.writeUInt16LE(data.length, 0);
    l2capPdu.writeUInt16LE(cid, 2);
    data.copy(l2capPdu, 4);
    let fragId = 0;

    while (l2capPdu.length) {
      const frag = l2capPdu.slice(0, this._aclMtu);
      l2capPdu = l2capPdu.slice(frag.length);
      const pkt = Buffer.alloc(5 + frag.length);

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
  }

  pushAclOutQueue() {
    let inProgress = 0;
    for (const handle in this._handleAclsInProgress) {
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
  }

  writeOneAclDataPkt() {
    const pkt = this._aclOutQueue.shift();
    this._handleAclsInProgress[pkt.handle]++;
    debug(`write acl data pkt frag ${pkt.fragId} handle ${pkt.handle} - writing: ${pkt.pkt.toString('hex')}`);
    this._socket.write(pkt.pkt);
  }

  onSocketData(data) {
    debug(`onSocketData: ${data.toString('hex')}`);

    const eventType = data.readUInt8(0);

    debug(`\tevent type = ${eventType}`);

    if (HCI_EVENT_PKT === eventType) {
      const subEventType = data.readUInt8(1);

      debug(`\tsub event type = ${subEventType}`);

      if (subEventType === EVT_DISCONN_COMPLETE) {
        const handle =  data.readUInt16LE(4);
        const reason = data.readUInt8(6);

        debug(`\t\thandle = ${handle}`);
        debug(`\t\treason = ${reason}`);

        /* As per Bluetooth Core specs:
        When the Host receives a Disconnection Complete, Disconnection Physical
        Link Complete or Disconnection Logical Link Complete event, the Host shall
        assume that all unacknowledged HCI Data Packets that have been sent to the
        Controller for the returned Handle have been flushed, and that the
        corresponding data buffers have been freed. */
        delete this._handleAclsInProgress[handle];
        const aclOutQueue = [];
        let discarded = 0;
        for (const i in this._aclOutQueue) {
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
        const handle =  data.readUInt16LE(4);
        const encrypt = data.readUInt8(6);

        debug(`\t\thandle = ${handle}`);
        debug(`\t\tencrypt = ${encrypt}`);

        this.emit('encryptChange', handle, encrypt);
      } else if (subEventType === EVT_CMD_COMPLETE) {
        const ncmd = data.readUInt8(3);
        const cmd = data.readUInt16LE(4);
        const status = data.readUInt8(6);
        const result = data.slice(7);

        debug(`\t\tncmd = ${ncmd}`);
        debug(`\t\tcmd = ${cmd}`);
        debug(`\t\tstatus = ${status}`);
        debug(`\t\tresult = ${result.toString('hex')}`);

        this.processCmdCompleteEvent(cmd, status, result);
      } else if (subEventType === EVT_CMD_STATUS) {
        const status = data.readUInt8(3);
        const cmd = data.readUInt16LE(5);

        debug(`\t\tstatus = ${status}`);
        debug(`\t\tcmd = ${cmd}`);

        this.processCmdStatusEvent(cmd, status);
      } else if (subEventType === EVT_LE_META_EVENT) {
        const leMetaEventType = data.readUInt8(3);
        const leMetaEventStatus = data.readUInt8(4);
        const leMetaEventData = data.slice(5);

        debug(`\t\tLE meta event type = ${leMetaEventType}`);
        debug(`\t\tLE meta event status = ${leMetaEventStatus}`);
        debug(`\t\tLE meta event data = ${leMetaEventData.toString('hex')}`);

        this.processLeMetaEvent(leMetaEventType, leMetaEventStatus, leMetaEventData);
      } else if (subEventType === EVT_NUMBER_OF_COMPLETED_PACKETS) {
        const handles = data.readUInt8(3);
        for (let h = 0; h < handles; h++) {
          const handle = data.readUInt16LE(4 + h * 4);
          const pkts = data.readUInt16LE(6 + h * 4);
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
      const flags = data.readUInt16LE(1) >> 12;
      const handle = data.readUInt16LE(1) & 0x0fff;

      if (ACL_START === flags) {
        const cid = data.readUInt16LE(7);

        const length = data.readUInt16LE(5);
        const pktData = data.slice(9);

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
      const cmd = data.readUInt16LE(1);
      const len = data.readUInt8(3);

      debug(`\t\tcmd = ${cmd}`);
      debug(`\t\tdata len = ${len}`);

      if (cmd === LE_SET_SCAN_ENABLE_CMD) {
        const enable = (data.readUInt8(4) === 0x1);
        const filterDuplicates = (data.readUInt8(5) === 0x1);

        debug('\t\t\tLE enable scan command');
        debug(`\t\t\tenable scanning = ${enable}`);
        debug(`\t\t\tfilter duplicates = ${filterDuplicates}`);

        this.emit('leScanEnableSetCmd', enable, filterDuplicates);
      }
    }
  }

  onSocketError(error) {
    debug(`onSocketError: ${error.message}`);

    if (error.message === 'Operation not permitted') {
      this.emit('stateChange', 'unauthorized');
    } else if (error.message === 'Network is down') {
      // no-op
    }
  }

  processCmdCompleteEvent(cmd, status, result) {
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
        const le = result.readUInt8(0);
        const simul = result.readUInt8(1);

        debug(`\t\t\tle = ${le}`);
        debug(`\t\t\tsimul = ${simul}`);
      }
    } else if (cmd === READ_LOCAL_VERSION_CMD) {
      const hciVer = result.readUInt8(0);
      const hciRev = result.readUInt16LE(1);
      const lmpVer = result.readInt8(3);
      const manufacturer = result.readUInt16LE(4);
      const lmpSubVer = result.readUInt16LE(6);

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
      const handle = result.readUInt16LE(0);
      const rssi = result.readInt8(2);

      debug(`\t\t\thandle = ${handle}`);
      debug(`\t\t\trssi = ${rssi}`);

      this.emit('rssiRead', handle, rssi);
    } else if (cmd === LE_READ_BUFFER_SIZE_CMD) {
      if (!status) {
        this.processLeReadBufferSize(result);
      }
    } else if (cmd === READ_BUFFER_SIZE_CMD) {
      if (!status) {
        const aclMtu = result.readUInt16LE(0);
        const aclMaxInProgress = result.readUInt16LE(3);
        // sanity
        if (aclMtu && aclMaxInProgress) {
          debug(`br/edr acl mtu = ${aclMtu}`);
          debug(`br/edr acl max pkts = ${aclMaxInProgress}`);
          this._aclMtu = aclMtu;
          this._aclMaxInProgress = aclMaxInProgress;
        }
      }
    }
  }

  processLeReadBufferSize(result) {
    const aclMtu = result.readUInt16LE(0);
    const aclMaxInProgress = result.readUInt8(2);
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
  }

  processLeMetaEvent(eventType, status, data) {
    if (eventType === EVT_LE_CONN_COMPLETE) {
      this.processLeConnComplete(status, data);
    } else if (eventType === EVT_LE_ADVERTISING_REPORT) {
      this.processLeAdvertisingReport(status, data);
    } else if (eventType === EVT_LE_CONN_UPDATE_COMPLETE) {
      this.processLeConnUpdateComplete(status, data);
    }
  }

  processLeConnComplete(status, data) {
    const handle = data.readUInt16LE(0);
    const role = data.readUInt8(2);
    const addressType = data.readUInt8(3) === 0x01 ? 'random': 'public';
    const address = data.slice(4, 10).toString('hex').match(/.{1,2}/g).reverse().join(':');
    const interval = data.readUInt16LE(10) * 1.25;
    const latency = data.readUInt16LE(12); // TODO: multiplier?
    const supervisionTimeout = data.readUInt16LE(14) * 10;
    const masterClockAccuracy = data.readUInt8(16); // TODO: multiplier?

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
  }

  processLeAdvertisingReport(count, data) {
    for (let i = 0; i < count; i++) {
      const type = data.readUInt8(0);
      const addressType = data.readUInt8(1) === 0x01 ? 'random' : 'public';
      const address = data.slice(2, 8).toString('hex').match(/.{1,2}/g).reverse().join(':');
      const eirLength = data.readUInt8(8);
      const eir = data.slice(9, eirLength + 9);
      const rssi = data.readInt8(eirLength + 9);

      debug(`\t\t\ttype = ${type}`);
      debug(`\t\t\taddress = ${address}`);
      debug(`\t\t\taddress type = ${addressType}`);
      debug(`\t\t\teir = ${eir.toString('hex')}`);
      debug(`\t\t\trssi = ${rssi}`);

      this.emit('leAdvertisingReport', 0, type, address, addressType, eir, rssi);

      data = data.slice(eirLength + 10);
    }
  }

  processLeConnUpdateComplete(status, data) {
    const handle = data.readUInt16LE(0);
    const interval = data.readUInt16LE(2) * 1.25;
    const latency = data.readUInt16LE(4); // TODO: multiplier?
    const supervisionTimeout = data.readUInt16LE(6) * 10;

    debug(`\t\t\thandle = ${handle}`);
    debug(`\t\t\tinterval = ${interval}`);
    debug(`\t\t\tlatency = ${latency}`);
    debug(`\t\t\tsupervision timeout = ${supervisionTimeout}`);

    this.emit('leConnUpdateComplete', status, handle, interval, latency, supervisionTimeout);
  }

  processCmdStatusEvent(cmd, status) {
    if (cmd === LE_CREATE_CONN_CMD) {
      if (status !== 0) {
        this.emit('leConnComplete', status);
      }
    }
  }

  onStateChange(state) {
    this._state = state;
  }
}

Hci.STATUS_MAPPER = STATUS_MAPPER;

module.exports = Hci;
