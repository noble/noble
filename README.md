# noble

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/sandeepmistry/noble?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

A Node.js BLE (Bluetooth Low Energy) central module.

Want to implement a peripheral? Checkout [bleno](https://github.com/sandeepmistry/bleno)

__Note:__ Mac OS X, Linux and Windows are currently the only supported OSes. Other platforms may be developed later on.

## Prerequisites

### OS X

 * install [Xcode](https://itunes.apple.com/ca/app/xcode/id497799835?mt=12)

### Linux

 * Kernel version 3.6 or above
 * ```libbluetooth-dev```

#### Ubuntu/Debian/Raspbian

```sh
sudo apt-get install bluetooth bluez-utils libbluetooth-dev libudev-dev
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

### Windows

 * [node-gyp requirements for Windows](https://github.com/TooTallNate/node-gyp#installation)
   * Python 2.7
   * Visual Studio ([Express](https://www.visualstudio.com/en-us/products/visual-studio-express-vs.aspx))
 * [node-bluetooth-hci-socket prerequisites](https://github.com/sandeepmistry/node-bluetooth-hci-socket#windows)
   * Compatible Bluetooth 4.0 USB adapter
   * [WinUSB](https://msdn.microsoft.com/en-ca/library/windows/hardware/ff540196(v=vs.85).aspx) driver setup for Bluetooth 4.0 USB adapter, using [Zadig tool](http://zadig.akeo.ie/)

## Install

```sh
npm install noble
```

## Usage

```javascript
var noble = require('noble');
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
peripheral.discoverAllServicesAndCharacteristics([callback(error, services, characteristics));
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
characteristic.write(data, notify[, callback(error)]); // data is a buffer, notify is true|false
```

##### Broadcast

```javascript
characteristic.broadcast(broadcast[, callback(error)]); // broadcast is true|false
```

##### Notify

```javascript
characteristic.notify(notify[, callback(error)]); // notify is true|false
```

  * allows notification to trigger `'data'` event
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

#### Adapter state change

```javascript
state = <"unknown" | "resetting" | "unsupported" | "unauthorized" | "poweredOff" | "poweredOn">

noble.on('stateChange', callback(state));
```

#### Scan started:

```javascript
noble.on('scanStart', callback);
```

#### Scan stopped

```javascript
noble.on('scanStop', callback);
```

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
    manufacturerData: <Buffer>,
    serviceData: [
        {
            uuid: "<service UUID>"
            data: <Buffer>
        },
        ...
    ]
  },
  rssi: <rssi>
};

noble.on('discover', callback(peripheral));
```

#### Warnings

```javascript
noble.on('warning', callback(message));
```

#### Peripheral

##### Connected

```javascript
peripheral.on('connect', callback);
```

##### Disconnected:

```javascript
peripheral.on('disconnect', callback);
```

##### RSSI update

```javascript
peripheral.on('rssiUpdate', callback(rssi));
```

##### Services discovered

```javascript
peripheral.on('servicesDiscover', callback(services));
```

#### Service

##### Included services discovered

```javascript
service.on('includedServicesDiscover', callback(includedServiceUuids));
```

##### Characteristics discovered

```javascript
characteristic = {
  uuid: "<uuid>",
   // properties: 'broadcast', 'read', 'writeWithoutResponse', 'write', 'notify', 'indicate', 'authenticatedSignedWrites', 'extendedProperties'
  properties: [...]
};

service.on('characteristicsDiscover', callback(characteristics));
```

#### Characteristic

##### Data

Emitted when characteristic read has completed, result of ```characteristic.read(...)``` or characteristic value has been updated by peripheral via notification or indication - after having been enabled with ```notify(true[, callback(error)])```.

```javascript
characteristic.on('data', callback(data, isNotification));

characteristic.on('read', callback(data, isNotification)); // legacy
```

##### Write

Emitted when characteristic write has completed, result of ```characteristic.write(...)```.

```javascript
characteristic.on('write', withoutResponse, callback());
```

##### Broadcast

Emitted when characteristic broadcast state changes, result of ```characteristic.broadcast(...)```.

```javascript
characteristic.on('broadcast', callback(state));
```

##### Notify

Emitted when characteristic notification state changes, result of ```characteristic.notify(...)```.

```javascript
characteristic.on('notify', callback(state));
```

##### Descriptors discovered

```javascript
descriptor = {
  uuid: '<uuid>'
};

characteristic.on('descriptorsDiscover', callback(descriptors));
```

#### Descriptor

##### Value read

```javascript
descriptor.on('valueRead', data);
```

##### Value write

```javascript
descriptor.on('valueWrite');
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

By default noble waits for both the advertisement data and scan response data for each Bluetooth address. If your device does not use scan response the following enviroment variable can be used to bypass it.


```sh
sudo NOBLE_REPORT_ALL_HCI_EVENTS=1 node <your file>.js
```

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

