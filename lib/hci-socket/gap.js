const debug = require('debug')('gap');

const events = require('events');
const os = require('os');
const util = require('util');

const isChip = (os.platform() === 'linux') && (os.release().indexOf('-ntc') !== -1);

const Gap = function (hci) {
  this._hci = hci;

  this._scanState = null;
  this._scanFilterDuplicates = null;
  this._discoveries = {};

  this._hci.on('error', this.onHciError.bind(this));
  this._hci.on('leScanParametersSet', this.onHciLeScanParametersSet.bind(this));
  this._hci.on('leScanEnableSet', this.onHciLeScanEnableSet.bind(this));
  this._hci.on('leAdvertisingReport', this.onHciLeAdvertisingReport.bind(this));

  this._hci.on('leScanEnableSetCmd', this.onLeScanEnableSetCmd.bind(this));
};

util.inherits(Gap, events.EventEmitter);

Gap.prototype.startScanning = function (allowDuplicates) {
  this._scanState = 'starting';
  this._scanFilterDuplicates = !allowDuplicates;

  // Always set scan parameters before scanning
  // https://www.bluetooth.org/docman/handlers/downloaddoc.ashx?doc_id=229737
  // p106 - p107
  this._hci.setScanEnabled(false, true);
  this._hci.setScanParameters();

  if (isChip) {
    // work around for Next Thing Co. C.H.I.P, always allow duplicates, to get scan response
    this._scanFilterDuplicates = false;
  }

  this._hci.setScanEnabled(true, this._scanFilterDuplicates);
};

Gap.prototype.stopScanning = function () {
  this._scanState = 'stopping';

  this._hci.setScanEnabled(false, true);
};

Gap.prototype.onHciError = function (error) {
  console.warn(error); // TODO: Better error handling
};

Gap.prototype.onHciLeScanParametersSet = function () {

};

// Called when receive an event "Command Complete" for "LE Set Scan Enable"
Gap.prototype.onHciLeScanEnableSet = function (status) {
  // Check the status we got from the command complete function.
  if (status !== 0) {
    // If it is non-zero there was an error, and we should not change
    // our status as a result.
    return;
  }

  if (this._scanState === 'starting') {
    this._scanState = 'started';

    this.emit('scanStart', this._scanFilterDuplicates);
  } else if (this._scanState === 'stopping') {
    this._scanState = 'stopped';

    this.emit('scanStop');
  }
};

// Called when we see the actual command "LE Set Scan Enable"
Gap.prototype.onLeScanEnableSetCmd = function (enable, filterDuplicates) {
  // Check to see if the new settings differ from what we expect.
  // If we are scanning, then a change happens if the new command stops
  // scanning or if duplicate filtering changes.
  // If we are not scanning, then a change happens if scanning was enabled.
  if ((this._scanState === 'starting' || this._scanState === 'started')) {
    if (!enable) {
      this.emit('scanStop');
    } else if (this._scanFilterDuplicates !== filterDuplicates) {
      this._scanFilterDuplicates = filterDuplicates;

      this.emit('scanStart', this._scanFilterDuplicates);
    }
  } else if ((this._scanState === 'stopping' || this._scanState === 'stopped') && enable) {
    // Someone started scanning on us.
    this.emit('scanStart', this._scanFilterDuplicates);
  }
};

Gap.prototype.onHciLeAdvertisingReport = function (status, type, address, addressType, eir, rssi) {
  const previouslyDiscovered = !!this._discoveries[address];
  const advertisement = previouslyDiscovered ? this._discoveries[address].advertisement : {
    localName: undefined,
    txPowerLevel: undefined,
    manufacturerData: undefined,
    serviceData: [],
    serviceUuids: [],
    solicitationServiceUuids: []
  };

  let discoveryCount = previouslyDiscovered ? this._discoveries[address].count : 0;
  let hasScanResponse = previouslyDiscovered ? this._discoveries[address].hasScanResponse : false;

  if (type === 0x04) {
    hasScanResponse = true;
  } else {
    // reset service data every non-scan response event
    advertisement.serviceData = [];
    advertisement.serviceUuids = [];
    advertisement.serviceSolicitationUuids = [];
  }

  discoveryCount++;

  let i = 0;

  while ((i + 1) < eir.length) {
    var length = eir.readUInt8(i);

    if (length < 1) {
      debug(`invalid EIR data, length = ${length}`);
      break;
    }

    const eirType = eir.readUInt8(i + 1); // https://www.bluetooth.org/en-us/specification/assigned-numbers/generic-access-profile

    if ((i + length + 1) > eir.length) {
      debug('invalid EIR data, out of range of buffer length');
      break;
    }

    const bytes = eir.slice(i + 2).slice(0, length - 1);

    switch (eirType) {
      case 0x02: // Incomplete List of 16-bit Service Class UUID
      case 0x03: // Complete List of 16-bit Service Class UUIDs
        for (let j = 0; j < bytes.length; j += 2) {
          const serviceUuid = bytes.readUInt16LE(j).toString(16);
          if (advertisement.serviceUuids.indexOf(serviceUuid) === -1) {
            advertisement.serviceUuids.push(serviceUuid);
          }
        }
        break;

      case 0x06: // Incomplete List of 128-bit Service Class UUIDs
      case 0x07: // Complete List of 128-bit Service Class UUIDs
        for (let j = 0; j < bytes.length; j += 16) {
          const serviceUuid = bytes.slice(j, j + 16).toString('hex').match(/.{1,2}/g).reverse().join('');
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

      case 0x14: // List of 16 bit solicitation UUIDs
        for (let j = 0; j < bytes.length; j += 2) {
          const serviceSolicitationUuid = bytes.readUInt16LE(j).toString(16);
          if (advertisement.serviceSolicitationUuids.indexOf(serviceSolicitationUuid) === -1) {
            advertisement.serviceSolicitationUuids.push(serviceSolicitationUuid);
          }
        }
        break;

      case 0x15: // List of 128 bit solicitation UUIDs
        for (let j = 0; j < bytes.length; j += 16) {
          const serviceSolicitationUuid = bytes.slice(j, j + 16).toString('hex').match(/.{1,2}/g).reverse().join('');
          if (advertisement.serviceSolicitationUuids.indexOf(serviceSolicitationUuid) === -1) {
            advertisement.serviceSolicitationUuids.push(serviceSolicitationUuid);
          }
        }
        break;

      case 0x16: // 16-bit Service Data, there can be multiple occurences
        advertisement.serviceData.push({
          uuid: bytes.slice(0, 2).toString('hex').match(/.{1,2}/g).reverse().join(''),
          data: bytes.slice(2, bytes.length)
        });
        break;

      case 0x20: // 32-bit Service Data, there can be multiple occurences
        advertisement.serviceData.push({
          uuid: bytes.slice(0, 4).toString('hex').match(/.{1,2}/g).reverse().join(''),
          data: bytes.slice(4, bytes.length)
        });
        break;

      case 0x21: // 128-bit Service Data, there can be multiple occurences
        advertisement.serviceData.push({
          uuid: bytes.slice(0, 16).toString('hex').match(/.{1,2}/g).reverse().join(''),
          data: bytes.slice(16, bytes.length)
        });
        break;

      case 0x1f: // List of 32 bit solicitation UUIDs
        for (let j = 0; j < bytes.length; j += 4) {
          const serviceSolicitationUuid = bytes.readUInt32LE(j).toString(16);
          if (advertisement.serviceSolicitationUuids.indexOf(serviceSolicitationUuid) === -1) {
            advertisement.serviceSolicitationUuids.push(serviceSolicitationUuid);
          }
        }
        break;

      case 0xff: // Manufacturer Specific Data
        advertisement.manufacturerData = bytes;
        break;
    }

    i += (length + 1);
  }

  debug(`advertisement = ${JSON.stringify(advertisement, null, 0)}`);

  const connectable = (type === 0x04 && previouslyDiscovered) ? this._discoveries[address].connectable : (type !== 0x03);

  this._discoveries[address] = {
    address: address,
    addressType: addressType,
    connectable: connectable,
    advertisement: advertisement,
    rssi: rssi,
    count: discoveryCount,
    hasScanResponse: hasScanResponse
  };

  // only report after a scan response event or if non-connectable or more than one discovery without a scan response, so more data can be collected
  if (type === 0x04 || !connectable || (discoveryCount > 1 && !hasScanResponse) || process.env.NOBLE_REPORT_ALL_HCI_EVENTS) {
    this.emit('discover', status, address, addressType, connectable, advertisement, rssi);
  }
};

module.exports = Gap;
