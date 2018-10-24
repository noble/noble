var events = require('events');
var util = require('util');

var debug = require('debug')('hci-usb');
var usb = require('usb');

var HCI_COMMAND_PKT = 0x01;
var HCI_ACLDATA_PKT = 0x02;
var HCI_EVENT_PKT = 0x04;

var OGF_HOST_CTL = 0x03;
var OCF_RESET = 0x0003;

var VENDOR_DEVICE_LIST = [
  {vid: 0x0CF3, pid: 0xE300 }, // Qualcomm Atheros QCA61x4
  {vid: 0x0a5c, pid: 0x21e8 }, // Broadcom BCM20702A0
  {vid: 0x19ff, pid: 0x0239 }, // Broadcom BCM20702A0
  {vid: 0x0a12, pid: 0x0001 }, // CSR
  {vid: 0x0b05, pid: 0x17cb }, // ASUS BT400
  {vid: 0x8087, pid: 0x07da }, // Intel 6235
  {vid: 0x8087, pid: 0x07dc }, // Intel 7260
  {vid: 0x8087, pid: 0x0a2a }, // Intel 7265
  {vid: 0x8087, pid: 0x0a2b }, // Intel 8265
  {vid: 0x0489, pid: 0xe07a }, // Broadcom BCM20702A1
  {vid: 0x0a5c, pid: 0x6412 }, // Broadcom BCM2045A0
  {vid: 0x050D, pid: 0x065A }, // Belkin BCM20702A0
];

function BluetoothHciSocket() {
  this._hciEventEndpointBuffer = new Buffer(0);
  this._aclDataInEndpointBuffer = new Buffer(0);
}

util.inherits(BluetoothHciSocket, events.EventEmitter);

BluetoothHciSocket.prototype.setFilter = function(filter) {
  // no-op
};

BluetoothHciSocket.prototype.bindRaw = function() {
  this._mode = 'raw';

  usb.on('attach', this.onDeviceAttached.bind(this))
  usb.on('detach', this.onDeviceDetached.bind(this))

  this._usbDevice = VENDOR_DEVICE_LIST
      .map(d => usb.findByIds(d.vid, d.pid))
      .find(d => d != null);

  if (!this._usbDevice) {
    this._usbDevice = null
    this.emit('up', false)
    return
  }
  this.start()
}

BluetoothHciSocket.prototype.onDeviceAttached = function(device) {
  if(!device || !device.deviceDescriptor) {
    return
  }
  let found = VENDOR_DEVICE_LIST.find(function(a) {
    return a.vid === device.deviceDescriptor.idVendor && a.pid === device.deviceDescriptor.idProduct
  })
  if (found && !this._usbDevice) {
    this._usbDevice = device
    this.start()
  } else {
    // attached unknown device
  }
}

BluetoothHciSocket.prototype.onDeviceDetached = function(device) {
  if (device === this._usbDevice) {
    this._usbDevice = null
    this.emit('up', false)
  }
}

BluetoothHciSocket.prototype.start = function() {
  try {
    this._usbDevice.open();
  } catch (error) {
    // error opening device e.g. use by another process
    this._usbDevice = null
    this.emit('up', false)
    return
  }

  this._usbDeviceInterface = this._usbDevice.interfaces[0];

  this._aclDataOutEndpoint = this._usbDeviceInterface.endpoint(0x02);

  this._hciEventEndpoint = this._usbDeviceInterface.endpoint(0x81);
  this._aclDataInEndpoint = this._usbDeviceInterface.endpoint(0x82);

  this._usbDeviceInterface.claim();

  this.reset();

  // we have to register for the errors else they will be thrown
  this._hciEventEndpoint.on('data', this.onHciEventEndpointData.bind(this));
  this._hciEventEndpoint.on('error', this.onHciEventEndpointError.bind(this));
  this._hciEventEndpoint.startPoll();

  this._aclDataInEndpoint.on('data', this.onAclDataInEndpointData.bind(this));
  this._aclDataInEndpoint.on('error', this.onAclDataInEndpointError.bind(this));
  this._aclDataInEndpoint.startPoll();
};

BluetoothHciSocket.prototype.bindControl = function() {
  this._mode = 'control';
};

BluetoothHciSocket.prototype.stop = function() {
  if (this._mode === 'raw' || this._mode === 'user') {
    this._hciEventEndpoint.stopPoll();
    this._hciEventEndpoint.removeAllListeners();

    this._aclDataInEndpoint.stopPoll();
    this._aclDataInEndpoint.removeAllListeners();
  }
};

BluetoothHciSocket.prototype.write = function(data) {
  debug('write: ' + data.toString('hex'));
  if(!this._usbDevice) {
    return
  }

  if (this._mode === 'raw' || this._mode === 'user') {
    var type = data.readUInt8(0);

    try {
      if (HCI_COMMAND_PKT === type) {
        this._usbDevice.controlTransfer(usb.LIBUSB_REQUEST_TYPE_CLASS | usb.LIBUSB_RECIPIENT_INTERFACE, 0, 0, 0, data.slice(1), function() {});
      } else if(HCI_ACLDATA_PKT === type) {
        this._aclDataOutEndpoint.transfer(data.slice(1));
      }
    } catch (error) {
      console.log('write catched:', error)
    }
  }
};

BluetoothHciSocket.prototype.onHciEventEndpointError = function(error) {
  debug('onHciEventEndpointError caught: ' + error)
}

BluetoothHciSocket.prototype.onHciEventEndpointData = function(data) {
  debug('HCI event: ' + data.toString('hex'));

  if (data.length === 0) {
    return;
  }

  // add to buffer
  this._hciEventEndpointBuffer = Buffer.concat([
    this._hciEventEndpointBuffer,
    data
  ]);

  if (this._hciEventEndpointBuffer.length < 2) {
    return;
  }

  // check if desired length
  var pktLen = this._hciEventEndpointBuffer.readUInt8(1);
  if (pktLen <= (this._hciEventEndpointBuffer.length - 2)) {

    var buf = this._hciEventEndpointBuffer.slice(0, pktLen + 2);

    if (this._mode === 'raw' && buf.length === 6 && ('0e0401030c00' === buf.toString('hex') || '0e0402030c00' === buf.toString('hex'))) {
      debug('reset complete');
      this.emit('up', true);
    }

    // fire event
    this.emit('data', Buffer.concat([
      new Buffer([HCI_EVENT_PKT]),
      buf
    ]));

    // reset buffer
    this._hciEventEndpointBuffer = this._hciEventEndpointBuffer.slice(pktLen + 2);
  }
};

BluetoothHciSocket.prototype.onAclDataInEndpointError = function(error) {
  debug('onAclDataInEndpointError caught: ' + error)
}

BluetoothHciSocket.prototype.onAclDataInEndpointData = function(data) {
  debug('ACL Data In: ' + data.toString('hex'));

  if (data.length === 0) {
    return;
  }

  // add to buffer
  this._aclDataInEndpointBuffer = Buffer.concat([
    this._aclDataInEndpointBuffer,
    data
  ]);

  if (this._aclDataInEndpointBuffer.length < 4) {
    return;
  }

  // check if desired length
  var pktLen = this._aclDataInEndpointBuffer.readUInt16LE(2);
  if (pktLen <= (this._aclDataInEndpointBuffer.length - 4)) {

    var buf = this._aclDataInEndpointBuffer.slice(0, pktLen + 4);

    // fire event
    this.emit('data', Buffer.concat([
      new Buffer([HCI_ACLDATA_PKT]),
      buf
    ]));

    // reset buffer
    this._aclDataInEndpointBuffer = this._aclDataInEndpointBuffer.slice(pktLen + 4);
  }
};

BluetoothHciSocket.prototype.reset = function() {
  var cmd = new Buffer(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(OCF_RESET | OGF_HOST_CTL << 10, 1);

  // length
  cmd.writeUInt8(0x00, 3);

  debug('reset');
  this.write(cmd);
};

module.exports = BluetoothHciSocket;
