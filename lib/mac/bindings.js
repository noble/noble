const os = require('os');
const osRelease = parseFloat(os.release());

if (osRelease < 14) {
  throw new Error('Mac OS versions earlier than Yosemite are no longer supported.');
} else if (osRelease < 15) {
  module.exports = require('./yosemite');
} else {
  module.exports = require('./highsierra');
}
