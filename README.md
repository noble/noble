# ![noble](assets/noble-logo.png)

[![Build Status](https://travis-ci.org/abandonware/noble.svg?branch=master)](https://travis-ci.org/abandonware/noble)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/abandonware/noble?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![OpenCollective](https://opencollective.com/noble/backers/badge.svg)](#backers)
[![OpenCollective](https://opencollective.com/noble/sponsors/badge.svg)](#sponsors)


A Node.js BLE (Bluetooth Low Energy) central module.

Want to implement a peripheral? Checkout [bleno](https://github.com/abandonware/bleno)

__Note:__ macOS / Mac OS X, Linux, FreeBSD and Windows are currently the only supported OSes. Other platforms may be developed later on.

## Prerequisites

### OS X

 * install [Xcode](https://itunes.apple.com/ca/app/xcode/id497799835?mt=12)

### Linux

 * Kernel version 3.6 or above
 * ```libbluetooth-dev```

#### Ubuntu/Debian/Raspbian

```sh
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```

Make sure ```node``` is on your path, if it's not, some options:
 * symlink ```nodejs``` to ```node```: ```sudo ln -s /usr/bin/nodejs /usr/bin/node```
 * [install Node.js using the NodeSource package](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions)

#### Fedora / Other-RPM based

```sh
sudo yum install bluez bluez-libs bluez-libs-devel
```

#### Intel Edison

See [Configure Intel Edison for Bluetooth LE (Smart) Development](http://rexstjohn.com/configure-intel-edison-for-bluetooth-le-smart-development/)

### FreeBSD

Make sure you have GNU Make:

```sh
sudo pkg install gmake
```

Disable automatic loading of the default Bluetooth stack by putting [no-ubt.conf](https://gist.github.com/myfreeweb/44f4f3e791a057bc4f3619a166a03b87) into ```/usr/local/etc/devd/no-ubt.conf``` and restarting devd (```sudo service devd restart```).

Unload ```ng_ubt``` kernel module if already loaded:

```sh
sudo kldunload ng_ubt
```

Make sure you have read and write permissions on the ```/dev/usb/*``` device that corresponds to your Bluetooth adapter.

### Windows

[node-gyp requirements for Windows](https://github.com/TooTallNate/node-gyp#installation)

Install the required tools and configurations using Microsoft's [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) from an elevated PowerShell or cmd.exe (run as Administrator).

```cmd
npm install --global --production windows-build-tools
```

[node-bluetooth-hci-socket prerequisites](https://github.com/abandonware/node-bluetooth-hci-socket#windows)
   * Compatible Bluetooth 4.0 USB adapter
   * [WinUSB](https://msdn.microsoft.com/en-ca/library/windows/hardware/ff540196(v=vs.85).aspx) driver setup for Bluetooth 4.0 USB adapter, using [Zadig tool](http://zadig.akeo.ie/)

See [@don](https://github.com/don)'s set up guide on [Bluetooth LE with Node.js and Noble on Windows](https://www.youtube.com/watch?v=mL9B8wuEdms&feature=youtu.be&t=1m46s)

## Notes

### Maximum simultaneous connections

This limit is imposed upon by the Bluetooth adapter hardware as well as it's firmware.

| Platform |     |
| :------- | --- |
| OS X 10.11 (El Capitan) | 6 |
| Linux/Windows - Adapter dependent | 5 (CSR based adapter) |

### Adapter specific known issues

Some BLE adapters cannot connect to a peripheral while they are scanning (examples below). You will get the following messages when trying to connect :

Sena UD-100 (Cambridge Silicon Radio, Ltd Bluetooth Dongle (HCI mode)) : `Error: Command disallowed`

Intel Dual Band Wireless-AC 7260 (Intel Corporation Wireless 7260 (rev 73)) : `Error: Connection Rejected due to Limited Resources (0xd)`

You need to stop scanning before trying to connect in order to solve this issue.

## Install

```sh
npm install @abandonware/noble
```

## Usage

```javascript
var noble = require('@abandonware/noble');
```

### Actions

#### Start scanning

```javascript
noble.startScanning(); // any service UUID, no duplicates


noble.startScanning([], true); // any service UUID, allow duplicates


var serviceUUIDs = ["<service UUID 1>", ...]; // default: [] => all
var allowDuplicates = <false|true>; // default: false

noble.startScanning(serviceUUIDs, allowDuplicates[, callback(error)]); // particular UUID's
```

__NOTE:__ ```noble.state``` must be ```poweredOn``` before scanning is started. ```noble.on('stateChange', callback(state));``` can be used register for state change events.

#### Stop scanning

```javascript
noble.stopScanning();
```

#### Peripheral

##### Connect

```javascript
peripheral.connect([callback(error)]);
```

##### Disconnect or cancel pending connection

```javascript
peripheral.disconnect([callback(error)]);
```

##### Update RSSI

```javascript
peripheral.updateRssi([callback(error, rssi)]);
```

##### Discover services

```javascript
peripheral.discoverServices(); // any service UUID

var serviceUUIDs = ["<service UUID 1>", ...];
peripheral.discoverServices(serviceUUIDs[, callback(error, services)]); // particular UUID's
```

##### Discover all services and characteristics

```javascript
peripheral.discoverAllServicesAndCharacteristics([callback(error, services, characteristics)]);
```

##### Discover some services and characteristics

```javascript
var serviceUUIDs = ["<service UUID 1>", ...];
var characteristicUUIDs = ["<characteristic UUID 1>", ...];
peripheral.discoverSomeServicesAndCharacteristics(serviceUUIDs, characteristicUUIDs, [callback(error, services, characteristics));
```
#### Service

##### Discover included services

```javascript
service.discoverIncludedServices(); // any service UUID

var serviceUUIDs = ["<service UUID 1>", ...];
service.discoverIncludedServices(serviceUUIDs[, callback(error, includedServiceUuids)]); // particular UUID's
```

##### Discover characteristics

```javascript
service.discoverCharacteristics() // any characteristic UUID

var characteristicUUIDs = ["<characteristic UUID 1>", ...];
service.discoverCharacteristics(characteristicUUIDs[, callback(error, characteristics)]); // particular UUID's
```

#### Characteristic

##### Read

```javascript
characteristic.read([callback(error, data)]);
```

##### Write

```javascript
characteristic.write(data, withoutResponse[, callback(error)]); // data is a buffer, withoutResponse is true|false
```

* ```withoutResponse```:
  * ```false```: send a write request, used with "write" characteristic property
  * ```true```: send a write command, used with "write without response" characteristic property

##### Broadcast

```javascript
characteristic.broadcast(broadcast[, callback(error)]); // broadcast is true|false
```

##### Subscribe

```javascript
characteristic.subscribe([callback(error)]);
```

  * subscribe to a characteristic, triggers `'data'` events when peripheral sends an notification or indication
  * use for characteristics with notify or indicate properties

##### Unsubscribe

```javascript
characteristic.unsubscribe([callback(error)]);
```

  * unsubscribe to a characteristic
  * use for characteristics with notify or indicate properties

##### Discover descriptors

```javascript
characteristic.discoverDescriptors([callback(error, descriptors)]);
```

##### Read value

```javascript
descriptor.readValue([callback(error, data)]);
```

##### Write value

```javascript
descriptor.writeValue(data[, callback(error)]); // data is a buffer
```

#### Handle

##### Read

```javascript
peripheral.readHandle(handle, callback(error, data));
```

##### Write

```javascript
peripheral.writeHandle(handle, data, withoutResponse, callback(error));
```

### Events

See [Node.js EventEmitter docs](https://nodejs.org/api/events.html) for more info. on API's.

#### Adapter state change

```javascript
state = <"unknown" | "resetting" | "unsupported" | "unauthorized" | "poweredOff" | "poweredOn">

noble.on('stateChange', callback(state));
```

#### Scan started:

```javascript
noble.on('scanStart', callback);
```

The event is emitted when scanning is started or if another application enables scanning or changes scanning settings.

#### Scan stopped

```javascript
noble.on('scanStop', callback);
```

The event is emitted when scanning is stopped or if another application stops scanning.

#### Peripheral discovered

```javascript
peripheral = {
  id: "<id>",
  address: "<BT address">, // Bluetooth Address of device, or 'unknown' if not known
  addressType: "<BT address type>", // Bluetooth Address type (public, random), or 'unknown' if not known
  connectable: <connectable>, // true or false, or undefined if not known
  advertisement: {
    localName: "<name>",
    txPowerLevel: <int>,
    serviceUuids: ["<service UUID>", ...],
    serviceSolicitationUuid: ["<service solicitation UUID>", ...],
    manufacturerData: <Buffer>,
    serviceData: [
        {
            uuid: "<service UUID>"
            data: <Buffer>
        },
        ...
    ]
  },
  rssi: <rssi>,
  mtu: <mtu> // MTU will be null, until device is connected and hci-socket is used
};

noble.on('discover', callback(peripheral));
```

__Note:__ on OS X the address will be set to 'unknown' if the device has not been connected previously.

#### Warnings

```javascript
noble.on('warning', callback(message));
```

#### Peripheral

##### Connected

```javascript
peripheral.once('connect', callback);
```

##### Disconnected:

```javascript
peripheral.once('disconnect', callback);
```

##### RSSI update

```javascript
peripheral.once('rssiUpdate', callback(rssi));
```

##### Services discovered

```javascript
peripheral.once('servicesDiscover', callback(services));
```

#### Service

##### Included services discovered

```javascript
service.once('includedServicesDiscover', callback(includedServiceUuids));
```

##### Characteristics discovered

```javascript
characteristic = {
  uuid: "<uuid>",
   // properties: 'broadcast', 'read', 'writeWithoutResponse', 'write', 'notify', 'indicate', 'authenticatedSignedWrites', 'extendedProperties'
  properties: [...]
};

service.once('characteristicsDiscover', callback(characteristics));
```

#### Characteristic

##### Data

Emitted when characteristic read has completed, result of ```characteristic.read(...)``` or characteristic value has been updated by peripheral via notification or indication - after having been enabled with ```notify(true[, callback(error)])```.

```javascript
characteristic.on('data', callback(data, isNotification));

characteristic.once('read', callback(data, isNotification)); // legacy
```

**Note:** `isNotification` event parameter value MAY be `undefined` depending on platform support. The parameter is **deprecated** after version 1.8.1, and not supported when on macOS High Sierra and later.

##### Write

Emitted when characteristic write has completed, result of ```characteristic.write(...)```.

```javascript
characteristic.once('write', withoutResponse, callback());
```

##### Broadcast

Emitted when characteristic broadcast state changes, result of ```characteristic.broadcast(...)```.

```javascript
characteristic.once('broadcast', callback(state));
```

##### Notify

Emitted when characteristic notification state changes, result of ```characteristic.notify(...)```.

```javascript
characteristic.once('notify', callback(state));
```

##### Descriptors discovered

```javascript
descriptor = {
  uuid: '<uuid>'
};

characteristic.once('descriptorsDiscover', callback(descriptors));
```

#### Descriptor

##### Value read

```javascript
descriptor.once('valueRead', data);
```

##### Value write

```javascript
descriptor.once('valueWrite');
```

## Running on Linux

### Running without root/sudo

Run the following command:

```sh
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

This grants the ```node``` binary ```cap_net_raw``` privileges, so it can start/stop BLE advertising.

__Note:__ The above command requires ```setcap``` to be installed, it can be installed using the following:

 * apt: ```sudo apt-get install libcap2-bin```
 * yum: ```su -c \'yum install libcap2-bin\'```

### Multiple Adapters

```hci0``` is used by default to override set the ```NOBLE_HCI_DEVICE_ID``` environment variable to the interface number.

Example, specify ```hci1```:

```sh
sudo NOBLE_HCI_DEVICE_ID=1 node <your file>.js
```

### Reporting all HCI events

By default noble waits for both the advertisement data and scan response data for each Bluetooth address. If your device does not use scan response the following environment variable can be used to bypass it.


```sh
sudo NOBLE_REPORT_ALL_HCI_EVENTS=1 node <your file>.js
```

### bleno compatibility

By default noble will respond with an error whenever a GATT request message is received. If your intention is to use bleno in tandem with noble, the following environment variable can be used to bypass this functionality. __Note:__ this requires a Bluetooth 4.1 adapter.

```sh
sudo NOBLE_MULTI_ROLE=1 node <your file>.js
```


## Advanced usage

### Override default bindings

By default, noble will select bindings to communicate with Bluetooth devices depending on your platform. If you prefer to specify what bindings noble should use:

```javascript
var noble = require('noble/with-bindings')(require('./my-custom-bindings'));
```

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

## Useful Links

 * [Bluetooth Development Portal](http://developer.bluetooth.org)
   * [GATT Specifications](http://developer.bluetooth.org/gatt/Pages/default.aspx)
 * [Bluetooth: ATT and GATT](http://epx.com.br/artigos/bluetooth_gatt.php)

## License

Copyright (C) 2015 Sandeep Mistry <sandeep.mistry@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[![Analytics](https://ga-beacon.appspot.com/UA-56089547-1/sandeepmistry/noble?pixel)](https://github.com/igrigorik/ga-beacon)
