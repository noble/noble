{
  'targets': [
    {
      'target_name': 'ble-hci',
      'type': 'executable',
      'conditions': [
        ['OS=="linux"', {
          'sources': [
            'src/ble-hci.c'
          ],
          'ldflags': [
            '-lbluetooth'
          ],
        }]
      ]
    }
  ]
}
