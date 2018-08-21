const Noble = require('./lib/noble');
const bindings = require('./lib/resolve-bindings')();

module.exports = new Noble(bindings);
