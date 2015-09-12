var debug = require('debug')('gap');

var events = require('events');
var util = require('util');

var Gap = function(hci) {
  this._hci = hci;

  this._scanState = null;
  this._discoveries = {};

  this._hci.on('error', this.onHciError.bind(this));
  this._hci.on('leScanParametersSet', this.onHciLeScanParametersSet.bind(this));
  this._hci.on('leScanEnableSet', this.onHciLeScanEnableSet.bind(this));
  this._hci.on('leAdvertisingReport', this.onHciLeAdvertisingReport.bind(this));
};

util.inherits(Gap, events.EventEmitter);

Gap.prototype.startScanning = function(allowDuplicates) {
  this._scanState = 'starting';

  this._hci.setScanEnabled(true, !allowDuplicates);
};

Gap.prototype.stopScanning = function() {
  this._scanState = 'stopping';

  this._hci.setScanEnabled(false, true);
};

Gap.prototype.onHciError = function(error) {

};

Gap.prototype.onHciLeScanParametersSet = function() {

};

Gap.prototype.onHciLeScanEnableSet = function() {
  if (this._scanState === 'starting') {
    this._scanState = 'stared';

    this.emit('scanStart');
  } else if (this._scanState === 'stopping') {
    this._scanState = 'stopped';

    this.emit('scanStop');
  }
};

Gap.prototype.onHciLeAdvertisingReport = function(status, type, address, addressType, eir, rssi) {
  var previouslyDiscovered = !!this._discoveries[address];
  var advertisement =  previouslyDiscovered ? this._discoveries[address].advertisement : {
    localName: undefined,
    txPowerLevel: undefined,
    manufacturerData: undefined,
    serviceData: [],
    serviceUuids: []
  };

  var discoveryCount = previouslyDiscovered ? this._discoveries[address].count : 0;
  var hasScanResponse = previouslyDiscovered ? this._discoveries[address].hasScanResponse : false;

  if (type === 0x04) {
    hasScanResponse = true;
  } else {
    // reset service data every non-scan response event
    advertisement.serviceData = [];
    advertisement.serviceUuids = [];
  }

  discoveryCount++;

  var i = 0;
  var j = 0;
  var serviceUuid = null;

  while ((i + 1) < eir.length) {
    var length = eir.readUInt8(i);

    if (length < 1) {
      debug('invalid EIR data, length = ' + length);
      break;
    }

    var eirType = eir.readUInt8(i + 1); // https://www.bluetooth.org/en-us/specification/assigned-numbers/generic-access-profile

    if ((i + length + 1) > eir.length) {
      debug('invalid EIR data, out of range of buffer length');
      break;
    }

    var bytes = eir.slice(i + 2).slice(0, length - 1);

    switch(eirType) {
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

  var connectable = (type === 0x04) ? this._discoveries[address].connectable : (type !== 0x03);

  this._discoveries[address] = {
    address: address,
    addressType: addressType,
    connectable: connectable,
    advertisement: advertisement,
    rssi: rssi,
    count: discoveryCount,
    hasScanResponse: hasScanResponse
  };

  // only report after a scan response event or more than one discovery without a scan response, so more data can be collected
  if (type === 0x04 || (discoveryCount > 1 && !hasScanResponse) || process.env.NOBLE_REPORT_ALL_HCI_EVENTS) {
    this.emit('discover', status, address, addressType, connectable, advertisement, rssi);
  }
};

module.exports = Gap;
