var events = require('events');
var util = require('util');

var NobleMac = require('./native/binding').NobleMac;

util.inherits(NobleMac, events.EventEmitter);

module.exports = new NobleMac();
