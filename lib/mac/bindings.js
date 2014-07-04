var os = require('os');
var osRelease = parseFloat(os.release());

if (osRelease < 13  ) {
  module.exports = require('./legacy');
} else if (osRelease < 14) {
  module.exports = require('./mavericks');
} else {
  module.exports = require('./yosemite');
}
