var noble = require('./index');
var util  = require('util');

var pretty_value = function(v) {
  var i, u;

  u = v.toString('utf8');
  for (i = u.length - 2; i >= 0; i--) if (u[i] === '\0') return v.toString('hex');
  if (u[u.length - 1] === '\0') return u.substr(0, u.length - 1);
  if (v.toString('ascii') === u) return u;
  return v.toString('hex');
};

var peripheral_scan = function(peripheral, callback) {
  var ble, zero;

  peripheral.on('connect', function() {
    console.log('// connect: ' + peripheral.uuid + ' (' + peripheral.advertisement.localName + ')');
    peripheral.updateRssi();
  });

  peripheral.on('disconnect', function() {
    console.log('// disconnect: ' + peripheral.uuid + ' (' + peripheral.advertisement.localName + ')');
    if (zero !== 0) callback(ble);
  });

  peripheral.on('rssiUpdate', function(rssi) {
    console.log('// RSSI update: ' + rssi + ' (' + peripheral.advertisement.localName + ')');
    peripheral.discoverServices();
  });

  peripheral.on('servicesDiscover', function(services) {
    var i, s;

    var characteristicsDiscover = function(service) {
      return function(characteristics) {
        var c, j;

        zero += characteristics.length;
        for (j = 0; j < characteristics.length; j++) {
          c = characteristics[j];
          service.characteristics[c.uuid] = {name: c.name, type: c.type, properties: c.properties, descriptors: {},endpoint: c};
          c.on('descriptorsDiscover', descriptorsDiscover(service.characteristics[c.uuid]));
          c.discoverDescriptors();

          if (c.properties.indexOf('read') !== -1) {
            zero++;
            c.on('read', characteristicRead(service.characteristics[c.uuid]));
            c.read();
          }
        }
        if (--zero === 0) callback(ble);
      };
    };

    var characteristicRead = function(characteristic) {
      return function(data, isNotification) {/* jshint unused: false */
        if (data) characteristic.value = pretty_value(data);
        if (--zero === 0) callback(ble);
      };
    };

    var descriptorsDiscover = function(characteristic) {
      return function(descriptors) {
        var d, k;

        for (k = 0; k < descriptors.length; k++) {
          d = descriptors[k];
          characteristic.descriptors[d.uuid] = { name: d.name, type: d.type };
        }
        if (--zero === 0) callback(ble);
      };
    };

    ble = {};
    zero = services.length;
    for (i = 0; i < services.length; i++) {
      s = services[i];
      if (!s.uuid) continue;

      ble[s.uuid] = { name: s.name, type: s.type, characteristics: {} };
      s.on('characteristicsDiscover', characteristicsDiscover(ble[s.uuid]));
      s.discoverCharacteristics();
    }
    if (--zero === 0) callback(ble);
  });

  peripheral.connect();
};


noble.on('stateChange', function(state) {
  console.log('// stateChange: ' + state);

  if (state === 'poweredOn') noble.startScanning(); else noble.stopScanning();
});

noble.on('discover', function(peripheral) {
  if (!peripheral) {
    console.log('// null peripheral');
    return;
  }

  peripheral_scan(peripheral, function(ble) {
    var c, characteristic, s, service;

    for (service in ble) {
      if (!ble.hasOwnProperty(service)) continue;

      s = ble[service];
      for (characteristic in s.characteristics) {
        if (!s.characteristics.hasOwnProperty(characteristic)) continue;

        c = s.characteristics[characteristic];
        delete(c.endpoint);
        s.characteristics[characteristic] = c;
      }
    }

    console.log('{ "' + peripheral.uuid + '": ');
    console.log('  { localName: "' + peripheral.advertisement.localName + '",');
    console.log(util.inspect(ble, { depth: null }));
    console.log('  }');
    console.log('}');
  });
});
