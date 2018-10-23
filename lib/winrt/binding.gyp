{
  'targets': [
    {
      'target_name': 'binding',
      'sources': [ 'src/noble_winrt.cc', 'src/napi_winrt.cc', 'src/peripheral_winrt.cc', 'src/radio_watcher.cc', 'src/notify_map.cc', 'src/ble_manager.cc', 'src/winrt_cpp.cc', 'src/callbacks.cc' ],
      'include_dirs': ["<!@(node -p \"require('node-addon-api').include\")", "<!@(node -p \"require('napi-thread-safe-callback').include\")"],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      'cflags!': [ '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'msvs_settings': {
        'VCCLCompilerTool': {
          'ExceptionHandling': 1,
          'AdditionalOptions': ['/await', '/std:c++latest'],
        },
      },
      'msvs_target_platform_version':'10.0.15063.0',
      'msvs_target_platform_minversion':'10.0.15063.0',
      'defines': [ '_HAS_EXCEPTIONS=1' ],
      'product_dir': '../../../lib/winrt/native',
    },
  ],
}
