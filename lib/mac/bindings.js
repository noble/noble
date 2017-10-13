var os = require('os');
var osRelease = parseFloat(os.release());

if (osRelease < 13  ) {
  module.exports = require('./legacy');
} else if (osRelease < 14) {
  module.exports = require('./mavericks');
} else if (osRelease < 17) {
  module.exports = require('./yosemite');
} else {
  module.exports = require('./highsierra');
}
