# ![noble](assets/noble-logo.png)

[![Build Status](https://travis-ci.org/abandonware/noble.svg?branch=master)](https://travis-ci.org/abandonware/noble)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/abandonware/noble?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![OpenCollective](https://opencollective.com/noble/backers/badge.svg)](#backers)
[![OpenCollective](https://opencollective.com/noble/sponsors/badge.svg)](#sponsors)

A Node.js BLE (Bluetooth Low Energy) central module.

Want to implement a peripheral? Check out [bleno](https://github.com/abandonware/bleno).

__Note:__ macOS / Mac OS X, Linux, FreeBSD and Windows are currently the only supported OSes.

## Documentation

* [Quick Start Example](#quick-start-example)
* [Installation](#installation)
* [API docs](#api-docs)
* [Advanced usage](#advanced-usage)
* [Common problems](#common-problems)

## Quick Start Example

```javascript
// Read the battery level of the first found peripheral exposing the Battery Level characteristic

const noble = require('@abandonware/noble');

noble.on('stateChange', async (state) => {
  if (state === 'poweredOn') {
    await noble.startScanningAsync(['180f'], false);
  }
});

noble.on('discover', async (peripheral) => {
  await noble.stopScanningAsync();
  await peripheral.connectAsync();
  const {characteristics} = await peripheral.discoverSomeServicesAndCharacteristicsAsync(['180f'], ['2a19']);
  const batteryLevel = (await characteristics[0].readAsync())[0];

  console.log(`${peripheral.address} (${peripheral.advertisement.localName}): ${batteryLevel}%`);

  await peripheral.disconnectAsync();
  process.exit(0);
});
```

## Installation

* [Prerequisites](#prerequisites)
  * [OS X](#os-x)
  * [Linux](#linux)
    * [Ubuntu, Debian, Raspbian](#ubuntu-debian-raspbian)
    * [Fedora and other RPM-based distributions](#fedora-and-other-rpm-based-distributions)
    * [Intel Edison](#intel-edison)
  * [FreeBSD](#freebsd)
  * [Windows](#windows)
* [Installing and using the package](#installing-and-using-the-package)

### Prerequisites

#### OS X

 * Install [Xcode](https://itunes.apple.com/ca/app/xcode/id497799835?mt=12)

#### Linux

 * Kernel version 3.6 or above
 * `libbluetooth-dev`

##### Ubuntu, Debian, Raspbian

```sh
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```

Make sure `node` is on your `PATH`. If it's not, some options:
 * Symlink `nodejs` to `node`: `sudo ln -s /usr/bin/nodejs /usr/bin/node`
 * [Install Node.js using the NodeSource package](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions)

##### Fedora and other RPM-based distributions

```sh
sudo yum install bluez bluez-libs bluez-libs-devel
```

##### Intel Edison

See [Configure Intel Edison for Bluetooth LE (Smart) Development](http://rexstjohn.com/configure-intel-edison-for-bluetooth-le-smart-development/).

#### FreeBSD

Make sure you have GNU Make:

```sh
sudo pkg install gmake
```

Disable automatic loading of the default Bluetooth stack by putting [no-ubt.conf](https://gist.github.com/myfreeweb/44f4f3e791a057bc4f3619a166a03b87) into `/usr/local/etc/devd/no-ubt.conf` and restarting devd (`sudo service devd restart`).

Unload `ng_ubt` kernel module if already loaded:

```sh
sudo kldunload ng_ubt
```

Make sure you have read and write permissions on the `/dev/usb/*` device that corresponds to your Bluetooth adapter.

#### Windows

[node-gyp requirements for Windows](https://github.com/TooTallNate/node-gyp#installation)

Install the required tools and configurations using Microsoft's [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) from an elevated PowerShell or cmd.exe (run as Administrator).

```cmd
npm install --global --production windows-build-tools
```

[node-bluetooth-hci-socket prerequisites](https://github.com/abandonware/node-bluetooth-hci-socket#windows)
   * Compatible Bluetooth 4.0 USB adapter
   * [WinUSB](https://msdn.microsoft.com/en-ca/library/windows/hardware/ff540196(v=vs.85).aspx) driver setup for Bluetooth 4.0 USB adapter, using [Zadig tool](http://zadig.akeo.ie/)

See [@don](https://github.com/don)'s setup guide on [Bluetooth LE with Node.js and Noble on Windows](https://www.youtube.com/watch?v=mL9B8wuEdms&feature=youtu.be&t=1m46s)

### Installing and using the package

```sh
npm install @abandonware/noble
```

```javascript
const noble = require('@abandonware/noble');
```

## API docs

All operations have two API variants – one expecting a callback, one returning a Promise (denoted by `Async` suffix).

Additionally, there are events corresponding to each operation (and a few global events).

For example, in case of the "discover services" operation of Peripheral:

* There's a `discoverServices` method expecting a callback:
   ```javascript
   peripheral.discoverServices((error, services) => {
     // callback - handle error and services
   }); 
   ```
* There's a `discoverServicesAsync` method returning a Promise:
  ```javascript
  try {
    const services = await peripheral.discoverServicesAsync();
    // handle services
  } catch (e) {
    // handle error
  }
  ```
* There's a `servicesDiscover` event emitted after services are discovered:
  ```javascript
  peripheral.once('servicesDiscover', (services) => {
    // handle services
  });
  ```

API structure:

* [Scanning and discovery](#scanning-and-discovery)
  * [_Event: Adapter state changed_](#event-adapter-state-changed)
  * [Start scanning](#start-scanning)
  * [_Event: Scanning started_](#event-scanning-started)
  * [Stop scanning](#stop-scanning)
  * [_Event: Scanning stopped_](#event-scanning-stopped)
  * [_Event: Peripheral discovered_](#event-peripheral-discovered)
  * [_Event: Warning raised_](#event-warning-raised)
* [Peripheral](#peripheral)
  * [Connect](#connect)
  * [_Event: Connected_](#event-connected)
  * [Disconnect or cancel a pending connection](#disconnect-or-cancel-a-pending-connection)
  * [_Event: Disconnected_](#event-disconnected)
  * [Update RSSI](#update-rssi)
  * [_Event: RSSI updated_](#event-rssi-updated)
  * [Discover services](#discover-services)
  * [Discover all services and characteristics](#discover-all-services-and-characteristics)
  * [Discover some services and characteristics](#discover-some-services-and-characteristics)
  * [_Event: Services discovered_](#event-services-discovered)
  * [Read handle](#read-handle)
  * [_Event: Handle read_](#event-handle-read)
  * [Write handle](#write-handle)
  * [_Event: Handle written_](#event-handle-written)
* [Service](#service)
  * [Discover included services](#discover-included-services)
  * [_Event: Included services discovered_](#event-included-services-discovered)
  * [Discover characteristics](#discover-characteristics)
  * [_Event: Characteristics discovered_](#event-characteristics-discovered)
* [Characteristic](#characteristic)
  * [Read](#read)
  * [_Event: Data read_](#event-data-read)
  * [Write](#write)
  * [_Event: Data written_](#event-data-written)
  * [Broadcast](#broadcast)
  * [_Event: Broadcast sent_](#event-broadcast-sent)
  * [Subscribe](#subscribe)
  * [_Event: Notification received_](#event-notification-received)
  * [Unsubscribe](#unsubscribe)
  * [Discover descriptors](#discover-descriptors)
  * [_Event: Descriptors discovered_](#event-descriptors-discovered)
* [Descriptor](#descriptor)
  * [Read value](#read-value)
  * [_Event: Value read_](#event-value-read)
  * [Write value](#write-value)
  * [_Event: Value written_](#event-value-written)

### Scanning and discovery

#### _Event: Adapter state changed_

```javascript
noble.on('stateChange', callback(state));
```

`state` can be one of:
* `unknown`
* `resetting`
* `unsupported`
* `unauthorized`
* `poweredOff`
* `poweredOn`

#### Start scanning

```javascript
noble.startScanning(); // any service UUID, no duplicates


noble.startScanning([], true); // any service UUID, allow duplicates


var serviceUUIDs = ['<service UUID 1>', ...]; // default: [] => all
var allowDuplicates = falseOrTrue; // default: false

noble.startScanning(serviceUUIDs, allowDuplicates[, callback(error)]); // particular UUIDs
```

__NOTE:__ `noble.state` must be `poweredOn` before scanning is started. `noble.on('stateChange', callback(state));` can be used to listen for state change events.

#### _Event: Scanning started_

```javascript
noble.on('scanStart', callback);
```

The event is emitted when:
* Scanning is started
* Another application enables scanning
* Another application changes scanning settings

#### Stop scanning

```javascript
noble.stopScanning();
```

#### _Event: Scanning stopped_

```javascript
noble.on('scanStop', callback);
```

The event is emitted when:
* Scanning is stopped
* Another application stops scanning


#### _Event: Peripheral discovered_

```javascript
noble.on('discover', callback(peripheral));
```

* `peripheral`: 
  ```javascript
  {
    id: '<id>',
    address: '<BT address'>, // Bluetooth Address of device, or 'unknown' if not known
    addressType: '<BT address type>', // Bluetooth Address type (public, random), or 'unknown' if not known
    connectable: trueOrFalseOrUndefined, // true or false, or undefined if not known
    advertisement: {
      localName: '<name>',
      txPowerLevel: someInteger,
      serviceUuids: ['<service UUID>', ...],
      serviceSolicitationUuid: ['<service solicitation UUID>', ...],
      manufacturerData: someBuffer, // a Buffer
      serviceData: [
          {
              uuid: '<service UUID>',
              data: someBuffer // a Buffer
          },
          // ...
      ]
    },
    rssi: integerValue,
    mtu: integerValue // MTU will be null, until device is connected and hci-socket is used
  };
  ```

__Note:__ On OS X, the address will be set to 'unknown' if the device has not been connected previously.


#### _Event: Warning raised_

```javascript
noble.on('warning', callback(message));
```

### Peripheral

#### Connect

```javascript
peripheral.connect([callback(error)]);
```

#### _Event: Connected_

```javascript
peripheral.once('connect', callback);
```

#### Disconnect or cancel a pending connection

```javascript
peripheral.disconnect([callback(error)]);
```

#### _Event: Disconnected_

```javascript
peripheral.once('disconnect', callback);
```

#### Update RSSI

```javascript
peripheral.updateRssi([callback(error, rssi)]);
```

#### _Event: RSSI updated_

```javascript
peripheral.once('rssiUpdate', callback(rssi));
```

#### Discover services

```javascript
peripheral.discoverServices(); // any service UUID

var serviceUUIDs = ['<service UUID 1>', ...];
peripheral.discoverServices(serviceUUIDs[, callback(error, services)]); // particular UUIDs
```

#### Discover all services and characteristics

```javascript
peripheral.discoverAllServicesAndCharacteristics([callback(error, services, characteristics)]);
```

#### Discover some services and characteristics

```javascript
var serviceUUIDs = ['<service UUID 1>', ...];
var characteristicUUIDs = ['<characteristic UUID 1>', ...];
peripheral.discoverSomeServicesAndCharacteristics(serviceUUIDs, characteristicUUIDs, [callback(error, services, characteristics));
```

#### _Event: Services discovered_

```javascript
peripheral.once('servicesDiscover', callback(services));
```

#### Read handle

```javascript
peripheral.readHandle(handle, callback(error, data));
```

#### _Event: Handle read_

```javascript
peripheral.once('handleRead<handle>', callback(data)); // data is a Buffer
```

`<handle>` is the handle identifier.

#### Write handle

```javascript
peripheral.writeHandle(handle, data, withoutResponse, callback(error));
```

#### _Event: Handle written_

```javascript
peripheral.once('handleWrite<handle>', callback());
```

`<handle>` is the handle identifier.

### Service

#### Discover included services

```javascript
service.discoverIncludedServices(); // any service UUID

var serviceUUIDs = ['<service UUID 1>', ...];
service.discoverIncludedServices(serviceUUIDs[, callback(error, includedServiceUuids)]); // particular UUIDs
```

#### _Event: Included services discovered_

```javascript
service.once('includedServicesDiscover', callback(includedServiceUuids));
```

#### Discover characteristics

```javascript
service.discoverCharacteristics() // any characteristic UUID

var characteristicUUIDs = ['<characteristic UUID 1>', ...];
service.discoverCharacteristics(characteristicUUIDs[, callback(error, characteristics)]); // particular UUIDs
```

#### _Event: Characteristics discovered_

```javascript
service.once('characteristicsDiscover', callback(characteristics));
```

* `characteristics`
  ```javascript
  {
    uuid: '<uuid>',
    properties: ['...'] // 'broadcast', 'read', 'writeWithoutResponse', 'write', 'notify', 'indicate', 'authenticatedSignedWrites', 'extendedProperties'
  };
  ```

### Characteristic

#### Read

```javascript
characteristic.read([callback(error, data)]);
```

#### _Event: Data read_

```javascript
characteristic.on('data', callback(data, isNotification));

characteristic.once('read', callback(data, isNotification)); // legacy
```

Emitted when:
* Characteristic read has completed, result of `characteristic.read(...)`
* Characteristic value has been updated by peripheral via notification or indication, after having been enabled with `characteristic.notify(true[, callback(error)])`

**Note:** `isNotification` event parameter value MAY be `undefined` depending on platform. The parameter is **deprecated** after version 1.8.1, and not supported on macOS High Sierra and later.

#### Write

```javascript
characteristic.write(data, withoutResponse[, callback(error)]); // data is a Buffer, withoutResponse is true|false
```

* `withoutResponse`:
  * `false`: send a write request, used with "write" characteristic property
  * `true`: send a write command, used with "write without response" characteristic property


#### _Event: Data written_

```javascript
characteristic.once('write', withoutResponse, callback());
```

Emitted when characteristic write has completed, result of `characteristic.write(...)`.

#### Broadcast

```javascript
characteristic.broadcast(broadcast[, callback(error)]); // broadcast is true|false
```

#### _Event: Broadcast sent_

```javascript
characteristic.once('broadcast', callback(state));
```

Emitted when characteristic broadcast state changes, result of `characteristic.broadcast(...)`.

#### Subscribe

```javascript
characteristic.subscribe([callback(error)]);
```

Subscribe to a characteristic.

Triggers `data` events when peripheral sends a notification or indication. Use for characteristics with "notify" or "indicate" properties.

#### _Event: Notification received_

```javascript
characteristic.once('notify', callback(state));
```

Emitted when characteristic notification state changes, result of `characteristic.notify(...)`.

#### Unsubscribe

```javascript
characteristic.unsubscribe([callback(error)]);
```

Unsubscribe from a characteristic.

Use for characteristics with "notify" or "indicate" properties

#### Discover descriptors

```javascript
characteristic.discoverDescriptors([callback(error, descriptors)]);
```

#### _Event: Descriptors discovered_

```javascript
characteristic.once('descriptorsDiscover', callback(descriptors));
```
* `descriptors`: 
  ```javascript
  [
    {
      uuid: '<uuid>'
    },
    // ...
  ]
  ```

### Descriptor

#### Read value

```javascript
descriptor.readValue([callback(error, data)]);
```

#### _Event: Value read_

```javascript
descriptor.once('valueRead', data); // data is a Buffer
```

#### Write value

```javascript
descriptor.writeValue(data[, callback(error)]); // data is a Buffer
```

#### _Event: Value written_

```javascript
descriptor.once('valueWrite');
```

## Advanced usage

### Override default bindings

By default, noble will select appropriate Bluetooth device bindings based on your platform. You can provide custom bindings using the `with-bindings` module.

```javascript
var noble = require('noble/with-bindings')(require('./my-custom-bindings'));
```

### Running without root/sudo (Linux-specific)

Run the following command:

```sh
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

This grants the `node` binary `cap_net_raw` privileges, so it can start/stop BLE advertising.

__Note:__ The above command requires `setcap` to be installed. 
It can be installed the following way:

 * apt: `sudo apt-get install libcap2-bin`
 * yum: `su -c \'yum install libcap2-bin\'`

### Multiple Adapters (Linux-specific)

`hci0` is used by default. 

To override, set the `NOBLE_HCI_DEVICE_ID` environment variable to the interface number.

For example, to specify `hci1`:

```sh
sudo NOBLE_HCI_DEVICE_ID=1 node <your file>.js
```

### Reporting all HCI events (Linux-specific)

By default, noble waits for both the advertisement data and scan response data for each Bluetooth address. If your device does not use scan response, the `NOBLE_REPORT_ALL_HCI_EVENTS` environment variable can be used to bypass it.

```sh
sudo NOBLE_REPORT_ALL_HCI_EVENTS=1 node <your file>.js
```

### bleno compatibility (Linux-specific)

By default, noble will respond with an error whenever a GATT request message is received. If your intention is to use bleno in tandem with noble, the `NOBLE_MULTI_ROLE` environment variable can be used to bypass this behaviour.

__Note:__ this requires a Bluetooth 4.1 adapter.

```sh
sudo NOBLE_MULTI_ROLE=1 node <your file>.js
```

## Common problems

### Maximum simultaneous connections

This limit is imposed by the Bluetooth adapter hardware as well as its firmware.

| Platform |     |
| :------- | --- |
| OS X 10.11 (El Capitan) | 6 |
| Linux/Windows - Adapter-dependent | 5 (CSR based adapter) |

### Adapter-specific known issues

Some BLE adapters cannot connect to a peripheral while they are scanning (examples below). You will get the following messages when trying to connect:

Sena UD-100 (Cambridge Silicon Radio, Ltd Bluetooth Dongle (HCI mode)): `Error: Command disallowed`

Intel Dual Band Wireless-AC 7260 (Intel Corporation Wireless 7260 (rev 73)): `Error: Connection Rejected due to Limited Resources (0xd)`

You need to stop scanning before trying to connect in order to solve this issue.

## Backers

Support us with a monthly donation and help us continue our activities. [[Become a backer](https://opencollective.com/noble#backer)]

<a href="https://opencollective.com/noble/backer/0/website" target="_blank"><img src="https://opencollective.com/noble/backer/0/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/1/website" target="_blank"><img src="https://opencollective.com/noble/backer/1/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/2/website" target="_blank"><img src="https://opencollective.com/noble/backer/2/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/3/website" target="_blank"><img src="https://opencollective.com/noble/backer/3/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/4/website" target="_blank"><img src="https://opencollective.com/noble/backer/4/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/5/website" target="_blank"><img src="https://opencollective.com/noble/backer/5/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/6/website" target="_blank"><img src="https://opencollective.com/noble/backer/6/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/7/website" target="_blank"><img src="https://opencollective.com/noble/backer/7/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/8/website" target="_blank"><img src="https://opencollective.com/noble/backer/8/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/9/website" target="_blank"><img src="https://opencollective.com/noble/backer/9/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/10/website" target="_blank"><img src="https://opencollective.com/noble/backer/10/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/11/website" target="_blank"><img src="https://opencollective.com/noble/backer/11/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/12/website" target="_blank"><img src="https://opencollective.com/noble/backer/12/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/13/website" target="_blank"><img src="https://opencollective.com/noble/backer/13/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/14/website" target="_blank"><img src="https://opencollective.com/noble/backer/14/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/15/website" target="_blank"><img src="https://opencollective.com/noble/backer/15/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/16/website" target="_blank"><img src="https://opencollective.com/noble/backer/16/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/17/website" target="_blank"><img src="https://opencollective.com/noble/backer/17/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/18/website" target="_blank"><img src="https://opencollective.com/noble/backer/18/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/19/website" target="_blank"><img src="https://opencollective.com/noble/backer/19/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/20/website" target="_blank"><img src="https://opencollective.com/noble/backer/20/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/21/website" target="_blank"><img src="https://opencollective.com/noble/backer/21/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/22/website" target="_blank"><img src="https://opencollective.com/noble/backer/22/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/23/website" target="_blank"><img src="https://opencollective.com/noble/backer/23/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/24/website" target="_blank"><img src="https://opencollective.com/noble/backer/24/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/25/website" target="_blank"><img src="https://opencollective.com/noble/backer/25/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/26/website" target="_blank"><img src="https://opencollective.com/noble/backer/26/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/27/website" target="_blank"><img src="https://opencollective.com/noble/backer/27/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/28/website" target="_blank"><img src="https://opencollective.com/noble/backer/28/avatar.svg"></a>
<a href="https://opencollective.com/noble/backer/29/website" target="_blank"><img src="https://opencollective.com/noble/backer/29/avatar.svg"></a>

## Sponsors

Become a sponsor and get your logo on our README on Github with a link to your site. [[Become a sponsor](https://opencollective.com/noble#sponsor)]

<a href="https://opencollective.com/noble/sponsor/0/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/1/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/2/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/3/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/4/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/5/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/6/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/7/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/8/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/9/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/9/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/10/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/10/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/11/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/11/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/12/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/12/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/13/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/13/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/14/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/14/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/15/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/15/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/16/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/16/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/17/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/17/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/18/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/18/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/19/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/19/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/20/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/20/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/21/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/21/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/22/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/22/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/23/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/23/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/24/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/24/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/25/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/25/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/26/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/26/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/27/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/27/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/28/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/28/avatar.svg"></a>
<a href="https://opencollective.com/noble/sponsor/29/website" target="_blank"><img src="https://opencollective.com/noble/sponsor/29/avatar.svg"></a>

## Useful links

 * [Bluetooth Development Portal](http://developer.bluetooth.org)
   * [GATT Specifications](http://developer.bluetooth.org/gatt/Pages/default.aspx)
 * [Bluetooth: ATT and GATT](http://epx.com.br/artigos/bluetooth_gatt.php)

## License

Copyright (C) 2015 Sandeep Mistry <sandeep.mistry@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[![Analytics](https://ga-beacon.appspot.com/UA-56089547-1/sandeepmistry/noble?pixel)](https://github.com/igrigorik/ga-beacon)
