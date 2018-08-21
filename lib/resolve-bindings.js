const os = require('os');

module.exports = function() {
  const platform = os.platform();

  if (process.env.NOBLE_WEBSOCKET) {
    return new (require('./websocket/bindings'))();
  } else if (process.env.NOBLE_DISTRIBUTED) {
    return new (require('./distributed/bindings'))();
  } else if (platform === 'darwin') {
    return require('./mac/bindings');
  } else if (platform === 'linux' || platform === 'freebsd' || platform === 'win32') {
    const options = {
      deviceId: process.env.NOBLE_HCI_DEVICE_ID ? parseInt(process.env.NOBLE_HCI_DEVICE_ID, 10) : 0,
      hciReportAllEvents: process.env.NOBLE_REPORT_ALL_HCI_EVENTS ? !!parseInt(process.env.NOBLE_REPORT_ALL_HCI_EVENTS, 10) : false,
      useHciUserChannel: process.env.HCI_CHANNEL_USER ? !!parseInt(process.env.HCI_CHANNEL_USER, 10) : false,
      gattMultiRole: process.env.NOBLE_MULTI_ROLE ? !!parseInt(process.env.NOBLE_MULTI_ROLE, 10) : false,
    };
    return new (require('./hci-socket/bindings'))(options);
  } else {
    throw new Error('Unsupported platform');
  }
};
