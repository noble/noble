{
  'targets': [
    {
      'target_name': 'noble',
      'conditions': [
        ['OS=="mac"', {
          'dependencies': [
            'lib/mac/binding.gyp:binding',
          ],
        }],
        ['OS=="win"', {
          'dependencies': [
            'lib/winrt/binding.gyp:binding',
          ],
        }],
      ],
    },
  ],
}
