const events = require('events');
const util = require('util');

const NobleWinrt = require('../../native/win32/noble').NobleWinrt;

util.inherits(NobleWinrt, events.EventEmitter);

module.exports = new NobleWinrt();
