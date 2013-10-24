var os = require('os');
var osRelease = parseFloat(os.release());

if (osRelease < 13  ) {
  module.exports = require('./legacy');
} else {
  module.exports = require('./mavericks');
}
