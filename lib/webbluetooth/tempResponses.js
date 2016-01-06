'use strict';

//temporary data until web api is finished.  Based on LightBlue Bean services/characteristics.

var DEFAULT_SERIAL_SERVICE = '6e400001b5a3f393e0a9e50e24dcca9e';
var DEFAULT_TRANSMIT_CHARACTERISTIC = '6E400002B5A3F393E0A9E50E24DCCA9E';
var DEFAULT_RECEIVE_CHARACTERISTIC = '6E400003B5A3F393E0A9E50E24DCCA9E';


module.exports.BEAN_SERVICES = [
  'f000ffc004514000b000000000000000',
  '1800',
  '1801',
  '180a',
  'a495ff10c5b14b44b5121370f02d74de',
  'a495ff20c5b14b44b5121370f02d74de',
  '180f',
  DEFAULT_SERIAL_SERVICE
];

module.exports.BEAN_CHARACTERISTICS = {
  "1800": [ { properties: [ 'read' ], uuid: '2a00' },
    { properties: [ 'read' ], uuid: '2a01' },
    { properties: [ 'read', 'write' ], uuid: '2a02' },
    { properties: [ 'write' ], uuid: '2a03' },
    { properties: [ 'read' ], uuid: '2a04' } ],
  "1801": [ { properties: [ 'indicate' ], uuid: '2a05' } ],
  "a495ff10c5b14b44b5121370f02d74de": [ { properties: [ 'read', 'writeWithoutResponse', 'write', 'notify' ],
      uuid: 'a495ff11c5b14b44b5121370f02d74de' } ],
  "180f": [ { properties: [ 'read', 'notify' ], uuid: '2a19' } ],
  "f000ffc004514000b000000000000000": [ { properties: [ 'writeWithoutResponse', 'write', 'notify' ],
      uuid: 'f000ffc104514000b000000000000000' },
    { properties: [ 'writeWithoutResponse', 'write', 'notify' ],
      uuid: 'f000ffc204514000b000000000000000' } ],
  "180a": [ { properties: [ 'read' ], uuid: '2a23' },
    { properties: [ 'read' ], uuid: '2a24' },
    { properties: [ 'read' ], uuid: '2a25' },
    { properties: [ 'read' ], uuid: '2a26' },
    { properties: [ 'read' ], uuid: '2a27' },
    { properties: [ 'read' ], uuid: '2a28' },
    { properties: [ 'read' ], uuid: '2a29' },
    { properties: [ 'read' ], uuid: '2a2a' },
    { properties: [ 'read' ], uuid: '2a50' } ],
  "a495ff20c5b14b44b5121370f02d74de": [ { properties: [ 'read', 'write' ],
      uuid: 'a495ff21c5b14b44b5121370f02d74de' },
    { properties: [ 'read', 'write' ],
      uuid: 'a495ff22c5b14b44b5121370f02d74de' },
    { properties: [ 'read', 'write' ],
      uuid: 'a495ff23c5b14b44b5121370f02d74de' },
    { properties: [ 'read', 'write' ],
      uuid: 'a495ff24c5b14b44b5121370f02d74de' },
    { properties: [ 'read', 'write' ],
      uuid: 'a495ff25c5b14b44b5121370f02d74de' } ],
   "6e400001b5a3f393e0a9e50e24dcca9e": [ { properties: [ 'read', 'notify' ],
      uuid: '6e400003b5a3f393e0a9e50e24dcca9e' },
    { properties: [ 'writeWithoutResponse', 'write' ],
      uuid: '6e400002b5a3f393e0a9e50e24dcca9e' }]

};