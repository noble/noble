var fs = require('fs');
var bplist = require('bplist-parser');
var store = false;

function watch (file, callback) {
  var prev;
  fs.stat(file, function (err, stat) {
    if (err) {
      callback(err);
    } else {
      prev = stat;
      fs.watch(file, function (event, file) {
        if (event === 'change') {
          fs.stat(file, function (err, stat) {
            if (err) {
              callback(err);
            } else {
              if (prev.mtime.getTime() !== stat.mtime.getTime()) {
                prev = stat;
                callback(null, prev);
              }
            }
          });
        }
      });
    }
  });
}

watch('/Library/Preferences/com.apple.Bluetooth.plist', function() {
  store = false;
});

function getInfomation (obj, uuid, callback) {
  uuid = uuid.toUpperCase();

  var formattedUuid = uuid.substring(0, 8) + '-' +
                      uuid.substring(8, 12) + '-' +
                      uuid.substring(12, 16) + '-' +
                      uuid.substring(16, 20) + '-' +
                      uuid.substring(20);

  var coreBluetoothCacheEntry = obj[0].CoreBluetoothCache[formattedUuid];
  var address = coreBluetoothCacheEntry ? coreBluetoothCacheEntry.DeviceAddress.replace(/-/g, ':') : undefined;

  callback(null, address);
}

function parsePlist (uuid, callback) {
  if (store) {
    getInfomation(store, uuid, callback);
  } else {
    bplist.parseFile('/Library/Preferences/com.apple.Bluetooth.plist', function (err, obj) {
      if (err) {
        return callback(err);
      } else if (obj[0].CoreBluetoothCache === undefined) {
        return callback(new Error('Empty CoreBluetoothCache entry!'));
      }
      getInfomation(obj, uuid, callback);
      store = obj;
    });
  }
}

module.exports = parsePlist;
