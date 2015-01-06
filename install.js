var os = require('os');
var spawn = require('child_process').spawn;

var platform = os.platform();

console.log('noble install: platform is "' + platform + "'");

if (platform === 'darwin') {
  console.log('noble install: installing xpc-connection ...');

  var npmInstall = spawn('npm', ['install', 'xpc-connection@~0.1.0'], {
    stdio: 'inherit'
  });

  npmInstall.on('close', function(code) {
    console.log('noble install: done');

    process.exit(code);
  });
} else if (platform === 'linux') {
  console.log('noble install: running node-gyp ...');

  var nodeGypConfigureBuild = spawn('node-gyp', ['configure', 'build'], {
    stdio: 'inherit'
  });

  nodeGypConfigureBuild.on('close', function(code) {
    console.log('noble install: done');

    process.exit(code);
  });
} else {
  console.error('noble install: Your platform is not supported!');
  process.exit(-1);
}
