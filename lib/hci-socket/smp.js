var debug = require('debug')('smp');

var events = require('events');
var util = require('util');
var readline = require('readline'); // For getting PIN/passkey

var crypto = require('./crypto');

var SMP_CID = 0x0006;

var SMP_PAIRING_REQUEST = 0x01;
var SMP_PAIRING_RESPONSE = 0x02;
var SMP_PAIRING_CONFIRM = 0x03;
var SMP_PAIRING_RANDOM = 0x04;
var SMP_PAIRING_FAILED = 0x05;
var SMP_ENCRYPT_INFO = 0x06;
var SMP_MASTER_IDENT = 0x07;

// OOB
var SMP_OOB_NO = 0x00
var SMP_OOB_YES = 0x01

// IO Capabilities.
var SMP_IO_DISPLAYONLY = 0x00
var SMP_IO_DISPLAYYESNO = 0x01
var SMP_IO_KEYBOARDONLY = 0x02
var SMP_IO_NOINPUTNOOUTPUT = 0x03
var SMP_IO_KEYBOARDDISPLAY = 0x04

// Authentication types.
var SMP_AUTH_LEGACY = 0x00;
var SMP_AUTH_LESC = 0x01;

// Association Models.
var SMP_MODEL_JUSTWORKS = 0x00;
var SMP_MODEL_PASSKEY = 0x01;
var SMP_MODEL_NUMERIC = 0x02;
var SMP_MODEL_OOB = 0x03;

var Smp = function(aclStream, localAddressType, localAddress, remoteAddressType, remoteAddress) {
  this._aclStream = aclStream;

  this._iat = new Buffer([(localAddressType === 'random') ? 0x01 : 0x00]);
  this._ia = new Buffer(localAddress.split(':').reverse().join(''), 'hex');
  this._rat = new Buffer([(remoteAddressType === 'random') ? 0x01 : 0x00]);
  this._ra = new Buffer(remoteAddress.split(':').reverse().join(''), 'hex');

  this.onAclStreamDataBinded = this.onAclStreamData.bind(this);
  this.onAclStreamEndBinded = this.onAclStreamEnd.bind(this);

  this._aclStream.on('data', this.onAclStreamDataBinded);
  this._aclStream.on('end', this.onAclStreamEndBinded);
};

util.inherits(Smp, events.EventEmitter);

Smp.prototype.sendPairingRequest = function() {
  // Pairing request params
  this._preqIo= null      // IO capabilities
  this._preqLesc = null   // LESC capable?
  this._preqMitm = null   // MITM protection required?
  // Pairing response params
  this._presIo= null      // IO capabilities
  this._presLesc = null   // LESC capable?
  this._presMitm = null   // MITM protection required?
  // Authentication type and association model.
  this._authType = null
  this._assocModel = null
  // Passkey
  this._inputPasskey = null

  this._preq = new Buffer([
    SMP_PAIRING_REQUEST,
    0x02, // IO capability: KeyboardOnly
    0x00, // OOB data: Authentication data not present
    0x01, // Authentication requirement: Bonding - No MITM
    0x10, // Max encryption key size
    0x00, // Initiator key distribution: <none>
    0x01  // Responder key distribution: EncKey
  ]);  

  this.write(this._preq);
};

Smp.prototype.onAclStreamData = function(cid, data) {
  if (cid !== SMP_CID) {
    return;
  }

  var code = data.readUInt8(0);

  if (SMP_PAIRING_RESPONSE === code) {
    this.handlePairingResponse(data);
  } else if (SMP_PAIRING_CONFIRM === code) {
    this.handlePairingConfirm(data);
  } else if (SMP_PAIRING_RANDOM === code) {
    this.handlePairingRandom(data);
  } else if (SMP_PAIRING_FAILED === code) {
    this.handlePairingFailed(data);
  } else if (SMP_ENCRYPT_INFO === code) {
    this.handleEncryptInfo(data);
  } else if (SMP_MASTER_IDENT === code) {
    this.handleMasterIdent(data);
  }
};

Smp.prototype.onAclStreamEnd = function() {
  this._aclStream.removeListener('data', this.onAclStreamDataBinded);
  this._aclStream.removeListener('end', this.onAclStreamEndBinded);

  this.emit('end');
};

Smp.prototype.handlePairingResponse = function(data) {
  this._pres = data;

  // Determine authentication type and assocation model.
  var authMethod = this.identifyAuthenticationMethod()
  this._authType = authMethod[0]
  this._assocModel = authMethod[1]
  
  if (this._authType === SMP_AUTH_LEGACY) {
    if (this._assocModel === SMP_MODEL_JUSTWORKS) {
      this.handleLegacyJustWorksPairing(data)
    } else if (this._assocModel === SMP_MODEL_PASSKEY) {
      this.handleLegacyPasskeyPairing(data)
    } else if (this._assocModel === SMP_MODEL_OOB) {
      this.handleLegacyOOBPairing(data)
    } else {
      console.error('Unexpected value for association model.')
    }
  } else if (this._authType === SMP_AUTH_LESC) {
    console.error('Support for LESC not available at present.')
  } else {
    console.error('Unexpected value for authentication type (must be either LE Legacy or LESC)')
  }
};

/* BLUETOOTH SPECIFICATION Version 5.0 | Vol 3, Part H, Section 2.3.5.1 */
Smp.prototype.identifyAuthenticationMethod = function () {
  if ((this._preq === null) || (this._pres === null)) {
    console.error('Either pairing request or pairing response is null. Cannot proceed...')
    return
  }

  // Get field values from Pairing Request.
  this._preqIo = this._preq.readUInt8(1)
  this._preqOob = this._preq.readUInt8(2)
  var preqAuthReqHex = this._preq.readUInt8(3)
  this._preqMitm = (preqAuthReqHex >> 2) & 1
  this._preqLesc = (preqAuthReqHex >> 3) & 1

  // Get field values from Pairing Response.
  this._presIo = this._pres.readUInt8(1)
  this._presOob = this._pres.readUInt8(2)
  var presAuthReq = this._pres.readUInt8(3)
  this._presMitm = (presAuthReq >> 2) & 1
  this._presLesc = (presAuthReq >> 3) & 1

  var authType = null
  if ((this._preqLesc === 1) && (this._presLesc === 1)) {
    authType = SMP_AUTH_LESC
  } else {
    authType = SMP_AUTH_LEGACY
  }

  var assocModel = null
  if (authType === SMP_AUTH_LEGACY) {
    if ((this._preqOob === SMP_OOB_YES) && (this._presOob === SMP_OOB_YES)) {
      // If both devices have OOB set, then use OOB.
      assocModel = SMP_MODEL_OOB    
    } else if ((this._preqMitm === 0) && (this._presMitm === 0)) {
      // If neither device requires MITM protection, then use Just Works.
      assocModel = SMP_MODEL_JUSTWORKS
    } else {
      // If either device requires MITM protection, then consider IO capabilities.
      assocModel = this.parseIoCapabilities(this._preqIo, this._presIo, authType)
    }
  } else {
    assocModel = null
  }
  
  return [authType, assocModel]
}

Smp.prototype.parseIoCapabilities = function (reqIo, resIo, authType) {
  var ioAssocModel = null
  if (authType === SMP_AUTH_LEGACY) {
    if ((reqIo === SMP_IO_NOINPUTNOOUTPUT) || (resIo === SMP_IO_NOINPUTNOOUTPUT)) {
      // Both devices are No Input No Output => Just Works.
      ioAssocModel = SMP_MODEL_JUSTWORKS
    } else if ((reqIo === SMP_IO_DISPLAYONLY) && (resIO === SMP_IO_DISPLAYONLY)) {
      // Both devices are Display Only => Just Works.
      ioAssocModel = SMP_MODEL_JUSTWORKS
    } else if ((reqIo === SMP_IO_DISPLAYYESNO) || (resIo === SMP_IO_DISPLAYYESNO)) {
      // At least one device is Display YesNo => Just Works.
      ioAssocModel = SMP_MODEL_JUSTWORKS
    } else {
      // IO capabilities for LE Legacy result in Passkey Entry.
      ioAssocModel = SMP_MODEL_PASSKEY
    }
  } else {
    // LESC not supported right now.
  }
  return ioAssocModel
}

Smp.prototype.handleLegacyJustWorksPairing = function (data) {
  this._tk = new Buffer('00000000000000000000000000000000', 'hex');
  this._r = crypto.r();

  this.write(Buffer.concat([
    new Buffer([SMP_PAIRING_CONFIRM]),
    crypto.c1(this._tk, this._r, this._pres, this._preq, this._iat, this._ia, this._rat, this._ra)
  ]));
};

Smp.prototype.handleLegacyPasskeyPairing = function (data) {
  const inputPasskeyTerminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  })
  
  inputPasskeyTerminal.question('\nType in the device PIN/passkey (if one has not been provided by the device manufacturer, try 000000).\nPIN: ', (answer) => {
    this._inputPasskey = answer
    // Convert to hex
    var passkeyBuffer = Buffer.alloc(16,0)
    passkeyBuffer.writeUInt32LE(Number(this._inputPasskey), 0)
    
    this._tk = Buffer.from(passkeyBuffer)
    this._r = crypto.r();

    this.write(Buffer.concat([
      new Buffer([SMP_PAIRING_CONFIRM]),
      crypto.c1(this._tk, this._r, this._pres, this._preq, this._iat, this._ia, this._rat, this._ra)
    ]));
  })
};
 
Smp.prototype.handlePairingConfirm = function(data) {
  this._pcnf = data;

  this.write(Buffer.concat([
    new Buffer([SMP_PAIRING_RANDOM]),
    this._r
  ]));
};

Smp.prototype.handlePairingRandom = function(data) {
  var r = data.slice(1);

  var pcnf = Buffer.concat([
    new Buffer([SMP_PAIRING_CONFIRM]),
    crypto.c1(this._tk, r, this._pres, this._preq, this._iat, this._ia, this._rat, this._ra)
  ]);

  if (this._pcnf.toString('hex') === pcnf.toString('hex')) {
    var stk = crypto.s1(this._tk, r, this._r);

    this.emit('stk', stk);
  } else {
    this.write(new Buffer([
      SMP_PAIRING_RANDOM,
      SMP_PAIRING_CONFIRM
    ]));

    this.emit('fail');
  }
};

Smp.prototype.handlePairingFailed = function(data) {
  this.emit('fail');
};

Smp.prototype.handleEncryptInfo = function(data) {
  var ltk = data.slice(1);

  this.emit('ltk', ltk);
};

Smp.prototype.handleMasterIdent = function(data) {
  var ediv = data.slice(1, 3);
  var rand = data.slice(3);

  this.emit('masterIdent', ediv, rand);
};

Smp.prototype.write = function(data) {
  this._aclStream.write(SMP_CID, data);
};

module.exports = Smp;
