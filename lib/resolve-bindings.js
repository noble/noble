const os = require('os');

module.exports = function (options) {
  const platform = os.platform();

  if (process.env.NOBLE_WEBSOCKET) {
    return new (require('./websocket/bindings'))(options);
  } else if (process.env.NOBLE_DISTRIBUTED) {
    return new (require('./distributed/bindings'))(options);
  } else if (platform === 'darwin') {
    return new (require('./mac/bindings'))(options);
  } else if (platform === 'linux' || platform === 'freebsd' || platform === 'win32') {
    return new (require('./hci-socket/bindings'))(options);
  } else {
    throw new Error('Unsupported platform');
  }
};
