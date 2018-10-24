{
  'targets': [
    {
      'target_name': '<(module_name)',
      'product_dir': '<(module_path)',
      'include_dirs': ["<!@(node -p \"require('node-addon-api').include\")", "<!@(node -p \"require('napi-thread-safe-callback').include\")"],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      'cflags!': [ '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'conditions': [
        ['OS=="mac"', {
          'sources': [
            'lib/mac/src/noble_mac.mm',
            'lib/mac/src/napi_objc.mm',
            'lib/mac/src/ble_manager.mm',
            'lib/mac/src/objc_cpp.mm',
            'lib/mac/src/callbacks.cc'
          ],
          'xcode_settings': {
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'CLANG_CXX_LIBRARY': 'libc++',
            'MACOSX_DEPLOYMENT_TARGET': '10.7',
            'OTHER_CFLAGS': [
                '-fobjc-arc',
            ],
          },
          'link_settings': {
            'libraries': [
              '$(SDKROOT)/System/Library/Frameworks/CoreBluetooth.framework',
            ]
          },
        }],
        ['OS=="win"', {
          'sources': [
            'lib/winrt/src/noble_winrt.cc',
            'lib/winrt/src/napi_winrt.cc',
            'lib/winrt/src/peripheral_winrt.cc',
            'lib/winrt/src/radio_watcher.cc',
            'lib/winrt/src/notify_map.cc',
            'lib/winrt/src/ble_manager.cc',
            'lib/winrt/src/winrt_cpp.cc',
            'lib/winrt/src/callbacks.cc',
          ],
          'msvs_settings': {
            'VCCLCompilerTool': {
              'ExceptionHandling': 1,
              'AdditionalOptions': ['/await', '/std:c++latest'],
            },
          },
          'msvs_target_platform_version':'10.0.15063.0',
          'msvs_target_platform_minversion':'10.0.15063.0',
          'defines': [ '_HAS_EXCEPTIONS=1' ],
        }],
      ],
    },
  ],
}
