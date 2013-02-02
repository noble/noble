var noble = require('./index');

console.log('noble');

setInterval(function() {
  console.log(10000);
}, 1000);


noble.on('scanStart', function() {
  console.log('on -> scanStart');
});

noble.on('scanStop', function() {
  console.log('on -> scanStop');
});

noble.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);
});

noble.on('peripheralDiscovered', function(peripheral) {
  console.log('on -> peripheralDiscovered: ');
  console.log(peripheral);

  noble.stopScanning();
});

noble.startScanning();
 