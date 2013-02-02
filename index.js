var events = require('events');

var bindings = require('./build/Release/binding.node');
var Noble = bindings.Noble;

inherits(Noble, events.EventEmitter);

module.exports = new Noble();

// extend prototype
function inherits(target, source) {
  for (var k in source.prototype)
    target.prototype[k] = source.prototype[k];
}
