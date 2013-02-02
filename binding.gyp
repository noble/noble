{
  'targets': [
    {
      'target_name': 'binding',
      'conditions': [
        ['OS=="mac"', {
          'sources': [
            'src/Noble.cc',
            'src/BLEManager.m'
          ],
          # cflags on OS X are stupid and have to be defined like this
          'defines': [
            '_FILE_OFFSET_BITS=64',
            '_LARGEFILE_SOURCE'
          ],
          'xcode_settings': {
            'OTHER_CFLAGS': [
              '-Wall',
              '-ObjC++'
            ]
          },
          'link_settings': {
            'libraries': [
              '$(SDKROOT)/System/Library/Frameworks/IOBluetooth.framework',
            ]
          }
        }]
      ]
    }
  ]
}