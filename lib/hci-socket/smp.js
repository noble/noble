const events = require('events');
const util = require('util');

const crypto = require('./crypto');

const SMP_CID = 0x0006;

const SMP_PAIRING_REQUEST = 0x01;
const SMP_PAIRING_RESPONSE = 0x02;
const SMP_PAIRING_CONFIRM = 0x03;
const SMP_PAIRING_RANDOM = 0x04;
const SMP_PAIRING_FAILED = 0x05;
const SMP_ENCRYPT_INFO = 0x06;
const SMP_MASTER_IDENT = 0x07;

const Smp = function (aclStream, localAddressType, localAddress, remoteAddressType, remoteAddress) {
  this._aclStream = aclStream;

  this._iat = Buffer.from([(localAddressType === 'random') ? 0x01 : 0x00]);
  this._ia = Buffer.from(localAddress.split(':').reverse().join(''), 'hex');
  this._rat = Buffer.from([(remoteAddressType === 'random') ? 0x01 : 0x00]);
  this._ra = Buffer.from(remoteAddress.split(':').reverse().join(''), 'hex');

  this.onAclStreamDataBinded = this.onAclStreamData.bind(this);
  this.onAclStreamEndBinded = this.onAclStreamEnd.bind(this);

  this._aclStream.on('data', this.onAclStreamDataBinded);
  this._aclStream.on('end', this.onAclStreamEndBinded);
};

util.inherits(Smp, events.EventEmitter);

Smp.prototype.sendPairingRequest = function () {
  this._preq = Buffer.from([
    SMP_PAIRING_REQUEST,
    0x03, // IO capability: NoInputNoOutput
    0x00, // OOB data: Authentication data not present
    0x01, // Authentication requirement: Bonding - No MITM
    0x10, // Max encryption key size
    0x00, // Initiator key distribution: <none>
    0x01 // Responder key distribution: EncKey
  ]);

  this.write(this._preq);
};

Smp.prototype.onAclStreamData = function (cid, data) {
  if (cid !== SMP_CID) {
    return;
  }

  const code = data.readUInt8(0);

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

Smp.prototype.onAclStreamEnd = function () {
  this._aclStream.removeListener('data', this.onAclStreamDataBinded);
  this._aclStream.removeListener('end', this.onAclStreamEndBinded);

  this.emit('end');
};

Smp.prototype.handlePairingResponse = function (data) {
  this._pres = data;

  this._tk = Buffer.from('00000000000000000000000000000000', 'hex');
  this._r = crypto.r();

  this.write(Buffer.concat([
    Buffer.from([SMP_PAIRING_CONFIRM]),
    crypto.c1(this._tk, this._r, this._pres, this._preq, this._iat, this._ia, this._rat, this._ra)
  ]));
};

Smp.prototype.handlePairingConfirm = function (data) {
  this._pcnf = data;

  this.write(Buffer.concat([
    Buffer.from([SMP_PAIRING_RANDOM]),
    this._r
  ]));
};

Smp.prototype.handlePairingRandom = function (data) {
  const r = data.slice(1);

  const pcnf = Buffer.concat([
    Buffer.from([SMP_PAIRING_CONFIRM]),
    crypto.c1(this._tk, r, this._pres, this._preq, this._iat, this._ia, this._rat, this._ra)
  ]);

  if (this._pcnf.toString('hex') === pcnf.toString('hex')) {
    const stk = crypto.s1(this._tk, r, this._r);

    this.emit('stk', stk);
  } else {
    this.write(Buffer.from([
      SMP_PAIRING_RANDOM,
      SMP_PAIRING_CONFIRM
    ]));

    this.emit('fail');
  }
};

Smp.prototype.handlePairingFailed = function (data) {
  this.emit('fail');
};

Smp.prototype.handleEncryptInfo = function (data) {
  const ltk = data.slice(1);

  this.emit('ltk', ltk);
};

Smp.prototype.handleMasterIdent = function (data) {
  const ediv = data.slice(1, 3);
  const rand = data.slice(3);

  this.emit('masterIdent', ediv, rand);
};

Smp.prototype.write = function (data) {
  this._aclStream.write(SMP_CID, data);
};

module.exports = Smp;
