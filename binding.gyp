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
    },
    {
      "target_name": "action_after_build",
      "type": "none",
      "dependencies": [
        "hci-ble",
        "l2cap-ble"
      ],
      "copies": [
        {
          "files": [
            "<(PRODUCT_DIR)/hci-ble",
            "<(PRODUCT_DIR)/l2cap-ble"
          ],
          "destination": "<(module_path)"
        }
      ]
    }
  ]
}
