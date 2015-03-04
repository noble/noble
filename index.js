var Noble = require('./lib/noble');

module.exports = new Noble({
  NOBLE_HCI_DEVICE_ID : process.env.NOBLE_HCI_DEVICE_ID || '0',
  NOBLE_DISTRIBUTED : process.env.NOBLE_DISTRIBUTED || false,
  NOBLE_WEBSOCKET : process.env.NOBLE_WEBSOCKET || false
});
