var os = require('os');

module.exports = function() {
  var platform = os.platform();

  if (process.env.NOBLE_WEBSOCKET) {
    return require('./websocket/bindings');
  } else if (process.env.NOBLE_DISTRIBUTED) {
    return require('./distributed/bindings');
  } else if (platform === 'darwin') {
    return require('./mac/bindings');
  } else if (platform === 'linux' || platform === 'freebsd') {
    return require('./hci-socket/bindings');
  } else if (platform === 'win32') {
    // Noble UWP bindings require Node >= 6 and Windows >= 10.0.15063.
    var nodeVer = process.versions.node.split('.').map(Number);
    var osVer = os.release().split('.').map(Number);
    if ((nodeVer[0] >= 6) &&
        ((osVer[0] > 10) ||
         (osVer[0] === 10 && osVer[1] > 0) ||
         (osVer[0] === 10 && osVer[1] === 0 && osVer[2] >= 15063))) {
        return require('noble-uwp/lib/bindings');
    } else {
      return require('./hci-socket/bindings');
    }
  } else {
    throw new Error('Unsupported platform');
  }
};
