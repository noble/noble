var os = require('os');
var exec = require('child_process').exec;

var platform = os.platform();

console.log('noble install: platform is "' + platform + "'");

if (platform === 'darwin') {
  console.log('noble install: installing xpc-connection ...');

  exec('npm install xpc-connection@0.0.1', function(error, stdout, stderr) {
    console.log('noble install: done');
    process.exit(error ? -1 : 0);
  });
} else if (platform === 'linux') {
  console.log('noble install: installing dbus-native ...');

  exec('npm install git://github.com/sandeepmistry/node-dbus.git', function(error, stdout, stderr) {
    console.log('noble install: done');
    process.exit(error ? -1 : 0);
  });
} else {
  console.error('noble install: Your platform is not supported!');
  process.exit(-1);
}
