const events = require('events');
const util = require('util');

const NobleMac = require('../../native/darwin/noble').NobleMac;

util.inherits(NobleMac, events.EventEmitter);

module.exports = new NobleMac();
