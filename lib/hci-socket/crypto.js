var crypto = require('crypto');

function r() {
  return crypto.randomBytes(16);
}

function c1(k, r, pres, preq, iat, ia, rat, ra) {
  var p1 = Buffer.concat([
    iat,
    rat,
    preq,
    pres
  ]);

  var p2 = Buffer.concat([
    ra,
    ia,
    new Buffer('00000000', 'hex')
  ]);

  var res = xor(r, p1);
  res = e(k, res);
  res = xor(res, p2);
  res = e(k, res);

  return res;
}

function s1(k, r1, r2) {
  return e(k, Buffer.concat([
    r2.slice(0, 8),
    r1.slice(0, 8)
  ]));
}

function e(key, data) {
  key = swap(key);
  data = swap(data);

  var cipher = crypto.createCipheriv('aes-128-ecb', key, '');
  cipher.setAutoPadding(false);

  return swap(Buffer.concat([
    cipher.update(data),
    cipher.final()
  ]));
}

function xor(b1, b2) {
  var result = new Buffer(b1.length);

  for (var i = 0; i < b1.length; i++) {
    result[i] = b1[i] ^ b2[i];
  }

  return result;
}

function swap(input) {
  var output = new Buffer(input.length);

  for (var i = 0; i < output.length; i++) {
    output[i] = input[input.length - i - 1];
  }

  return output;
}

module.exports = {
  r: r,
  c1: c1,
  s1: s1,
  e: e
};
