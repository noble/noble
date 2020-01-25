const events = require('events');
const util = require('util');

const NobleMac = require('./native/binding').NobleMac;

util.inherits(NobleMac, events.EventEmitter);

module.exports = new NobleMac();
