{
  'targets': [
    {
      'target_name': 'hci-ble',
      'type': 'executable',
      'conditions': [
        ['OS=="linux"', {
          'sources': [
            'src/hci-ble.c'
          ],
          'link_settings': {
            'libraries': [
              '-lbluetooth'
            ]
          }
        }]
      ]
    },
    {
      'target_name': 'l2cap-ble',
      'type': 'executable',
      'conditions': [
        ['OS=="linux"', {
          'sources': [
            'src/l2cap-ble.c'
          ],
          'link_settings': {
            'libraries': [
              '-lbluetooth'
            ]
          }
        }]
      ]
    }
  ]
}
