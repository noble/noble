var os = require('os');

function recentEnoughVersion() {
  const ver = os.release().split('.').map(Number);
  return (ver[0] > 10 ||
         (ver[0] === 10 && ver[1] > 0) ||
         (ver[0] === 10 && ver[1] === 0 && ver[2] >= 15063))
}

module.exports = function() {
  var platform = os.platform();

  if (process.env.NOBLE_WEBSOCKET) {
    return require('./websocket/bindings');
  } else if (process.env.NOBLE_DISTRIBUTED) {
    return require('./distributed/bindings');
  } else if (platform === 'darwin') {
    return require('./mac/bindings');
  } else if (platform === 'win32') {
    if(!process.env.NOBLE_FORCE_DONGLE && recentEnoughVersion()) {
      return require('./winrt/bindings');
    } else {
      return require('./win32/bindings');
    }
  } else if (platform === 'linux' || platform === 'freebsd') {
    return require('./hci-socket/bindings');
  } else {
    throw new Error('Unsupported platform');
  }
};
