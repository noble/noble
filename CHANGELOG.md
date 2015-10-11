## Version 1.2.0

 * Use v0.4.0 of bluetooth-hci-socket
 * Ignore peripherals with only connectable flag on OS X 10.10
 * Bindings no longer init themselves
 * Fix this._discoveredPeripheralUUids = []; variable not initalized in constructor ([@jacobrosenthal](https://github.com/jacobrosenthal))
 * New ```peripheral.connectable``` property
 * Updates to Linux prerequisites in read me
 * Throw error if scanning is started when state is not powered on

## Version 1.1.0

 * Introduce ```peripheral.id```, ```periheral.uuid``` is deprecated now
 * Initial Windows support via WinUSB and bluetooth-hci-socket
 * Rework Linux stack to use [bluetooth-hci-socket](https://github.com/sandeepmistry/node-bluetooth-hci-socket)
 * Clarify notify related API's in read me ([@OJFord](https://github.com/OJFord))

## Version 1.0.2

 * Add mac dummy in binding.pyq ([@DomiR](https://github.com/DomiR))
 * Fixes for distributed and websocket bindings ([@Loghorn](https://github.com/Loghorn))
 * OS X Mavericks and legacy: manually emit write event for write without response requests
 * Update README for packages needed for rpm-based systems ([@ppannuto](https://github.com/ppannuto))
 * Linux: refresh serviceUuids for incoming advertisement ([@BBarash](https://github.com/BBarash))

## Version 1.0.1

 * correct peripherals not being created correctly

## Version 1.0

 * remove unneeded setTimeout's in OS X bindings
 * added persistent peripherals between calls to .startScanning() on mavericks ([@andySigler](https://github.com/andySigler))
 * report error or print warning if startScanning is called with state is not poweredOn
 * emit events for warnings ([@voodootikigod ](https://github.com/voodootikigod))
 * disable scanning flag on start on Linux to prevent unsupport adapter state in some cases
 * update debug dependency version
 * add address type to peripheral if known

## Older

 * Changes not recorded
