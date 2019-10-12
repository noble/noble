## Version 1.9.1

 * Don't forget previously discovered services and characteristics ([@elafargue](https://github.com/elafargue))
 * Fixed peripheral-explorer example with newer async versions
 * web socket binding: various fixes ([@hadrienk](https://github.com/hadrienk))
 * Fix multiple init of bindings with multiple stateChange listeners added or noble.state is accessed

## Version 1.9.0

 * Don't initialize bindings until first state change listener added
 * webble: hooked up disconnect event
 * webble: clear cached services on reconnect
 * hci-socket: Added upport 32-bit and 128-bit service data UUIDs ([@arekzelechowski](https://github.com/arekzelechowski))
 * Update 'connectable' property upon discovery ([@dimitrisx](https://github.com/dimitrisx))
 * macOS: Added support for High Sierra
 * webble: remove subscribe listeners on disconnect

## Version 1.8.1

 * easier install instructions for Windows ([@don](https://github.com/don))
 * hci-socket binding: more descriptive error outputs ([@mbifulco](https://github.com/mbifulco))
 * hci-socket binding: report non-connectable advertisements without scan response
 * Corrected deprecated `read` event for characteristics no emitting for notifications

## Version 1.8.0

 * hci-socket binding: always set scan parameters before scanning ([@Lahorde](https://github.com/Lahorde))
 * hci-socket binding: add L2CAP signaling layer for non-Linux or Linux user channel mode
 * hci-socket binding: Workarounds for scanning with N.T.C. C.H.I.P
 * hci-socket binding: if `init()` fails we don't want to try and clear up ([@gfwilliams](https://github.com/gfwilliams))
 * Fix read events firing for notifications ([@zkiiito](https://github.com/zkiiito))
 * Add FreeBSD support ([@myfreeweb](https://github.com/myfreeweb))
 * Fix startScanning callback calling setting error to try ([@MarSoft](https://github.com/MarSoft))
 * New Web Bluetooth API shim ([@monteslu](https://github.com/monteslu))

## Version 1.7.0

 * hci-socket binding: now supports "long writes" ([@projectgus](https://github.com/projectgus))
 * hci-socket binding: use latest bluetooth-hci-socket dependency (~0.5.1)
 * hci-socket binding: add support to extract service solicitation UUID's from advertisement ([@smartyw](https://github.com/smartyw))
 * web-socket binding: fixed write handle not working ([@christopherhex](https://github.com/christopherhex))
 * hci-socket binding: initial bindUser support via HCI_CHANNEL_USER environment variable

## Version 1.6.0

 * hci-socket binding: use latest bluetooth-hci-socket dependency (~0.4.4)
 * Added characteristic.subscribe and characteristic.unsubscribe API's (characteristic.notify is now deprecated)
 * hci-socket binding: use OCF_LE_SET_EVENT_MASK for LE_SET_EVENT_MASK_CMD
 * hci-socket binding: check READ_LE_HOST_SUPPORTED_CMD status before parsing result

## Version 1.5.0

 * hci-socket binding: add NOBLE_MULTI_ROLE flag for ignoring peripheral role commands ([@popasquat89](https://github.com/bradjc))
 * Fix variable typo in ```with-bindings.js`` ([@rclai](https://github.com/rclai))

## Version 1.4.0

 * hci-socket binding: include service data UUID's when filtering discover
 * hci-socket binding: emit scan start/stop when external app changes scanning start ([@bradjc](https://github.com/bradjc))
 * Support for pluggable bindings ([@hgwood](https://github.com/hgwood))
 * hci-socket binding: don't kill all descriptors when looking for new Characteristics ([@Neutrosider](https://github.com/Neutrosider))

## Version 1.3.0

 * Check and report LE Create Conn command status
 * Correct parsing master clock accuracy value from LE Conn Complete event
 * Added logic to reject rather than ignore unknown requests/commands. ([@george-hawkins](https://github.com/george-hawkins))
 * Don't reset scan state on read local version response if state is powered on
 * Expose local adapter address via ```noble.address```, available after ```poweredOn``` state change event
 * Fix ```serviceUuids``` var check in ```peripheral-explorer.js``` ([@jrobeson](https://github.com/jrobeson))

## Version 1.2.1

 * Use latest v0.4.1 bluetooth-hci-socket dependency (for kernel 4.1.x disconnect workaround)
 * Add read + write LE host supported commands (for kernel 4.1.x disconnect workaround)
 * Fix a potential exception when accessing a non existent element ([@Loghorn](https://github.com/Loghorn))

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
