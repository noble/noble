'use strict';

//temporary data until web api is finished.  Based on LightBlue Bean services/characteristics.

module.exports.BEAN_SERVICES = [
  'f000ffc004514000b000000000000000',
  '1800',
  '1801',
  '180a',
  'a495ff10c5b14b44b5121370f02d74de',
  'a495ff20c5b14b44b5121370f02d74de',
  '180f'
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
      uuid: 'a495ff25c5b14b44b5121370f02d74de' } ]
};