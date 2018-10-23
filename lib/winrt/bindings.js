const events = require('events');
const util = require('util');

const NobleWinrt = require('./native/binding').NobleWinrt;

util.inherits(NobleWinrt, events.EventEmitter);

module.exports = new NobleWinrt();
