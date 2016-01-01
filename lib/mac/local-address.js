var child_process = require('child_process');

function localAddress(callback) {
  child_process.exec('system_profiler SPBluetoothDataType', {}, function(error, stdout, stderr) {
    var address = null;

    if (!error) {
      var found = stdout.match(/\s+Address: (.*)/);
      if (found) {
        address = found[1].toLowerCase().replace(/-/g, ':');
      }
    }

    callback(address);
  });
}

module.exports = localAddress;
