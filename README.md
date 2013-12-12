noble
=====

A node.js BLE (Bluetooth low energy) central module.

Want to implement a peripheral? Checkout [bleno](https://github.com/sandeepmistry/bleno)

__Note:__ Mac OS X and Linux are currently the only supported OSes, and are still under development. Other platforms will be developed later on (see Roadmap below).

Prerequisites
------------

__Linux (Ubuntu)__

 * ```sudo apt-get install libbluetooth-dev```
 * Run as ```sudo``` or ```root```

Install
-------

    npm install noble

Usage
-----

    var noble = require('noble');

__Actions__

Start scanning:
    
    noble.startScanning(); // any service UUID, no duplicates


    noble.startScanning([], true); // any service UUID, allow duplicates


    var serviceUUIDs = ["<service UUID 1>", ...]; // default: [] => all
    var allowDuplicates = <false|true>; // default: false

    noble.startScanning(serviceUUIDs, allowDuplicates); // particular UUID's

Stop scanning:

    noble.stopScanning();

Peripheral connect:

    peripheral.connect([callback(error)]);

Peripheral disconnect or cancel pending connection:

    peripheral.disconnect([callback(error)]);

Peripheral update RSSI

    peripheral.updateRssi([callback(error, rssi)]);

Peripheral discover services

    peripheral.discoverServices(); // any service UUID

    var serviceUUIDs = ["<service UUID 1>", ...];
    peripheral.discoverServices(serviceUUIDs[, callback(error, services)]); // particular UUID's

Peripheral discover all services and characteristics

    peripheral.discoverAllServicesAndCharacteristics([callback(error, services, characteristics));

Peripheral discover some services and characteristics

    var serviceUUIDs = ["<service UUID 1>", ...];
    var characteristicUUIDs = ["<characteristic UUID 1>", ...];
    peripheral.discoverSomeServicesAndCharacteristics(serviceUUIDs, characteristicUUIDs, [callback(error, services, characteristics));

Service discover included services

    service.discoverIncludedServices(); // any service UUID

    var serviceUUIDs = ["<service UUID 1>", ...];
    service.discoverIncludedServices(serviceUUIDs[, callback(error, includedServiceUuids)]); // particular UUID's

Service discover characteristics

    service.discoverCharacteristics() // any characteristic UUID

    var characteristicUUIDs = ["<characteristic UUID 1>", ...];
    service.discoverCharacteristics(characteristicUUIDs[, callback(error, characteristics)]); // particular UUID's

Characteristic read

    characteristic.read([callback(error, data)]);

Characteristic write

    characteristic.write(data, notify[, callback(error)]); // data is a buffer, notify is true|false

Characteristic broadcast

    characteristic.broadcast(broadcast[, callback(error)]); // broadcast is true|false

Characteristic notify

    characteristic.notify(notify[, callback(error)]); // notify is true|false

Characteristic discover descriptors

    characteristic.discoverDescriptors([callback(error, descriptors)]);

Descriptor read value

    descriptor.readValue([callback(error, data)]);

Descriptor write value

    descriptor.writeValue(data[, callback(error)]); // data is a buffer

__Events__

Adapter state change:

    state = <"unknown" | "resetting" | "unsupported" | "unauthorized" | "poweredOff" | "poweredOn">

    noble.on('stateChange', callback(state));

Scan started:

    noble.on('scanStart', callback);

Scan stopped:

    noble.on('scanStop', callback);

Peripheral discovered:

    peripheral = {
      uuid: "<uuid>",
      advertisement: {
        localName: "<name>",
        serviceData: <Buffer>,
        txPowerLevel: <int>,
        serviceUuids: ["<service UUID>", ...],
      },
      rssi: <rssi>
    };

    noble.on('discover', callback(peripheral));

Peripheral connected:

    peripheral.on('connect', callback);

Peripheral disconnected:

    peripheral.on('disconnect', callback);

Peripheral RSSI update

    peripheral.on('rssiUpdate', callback(rssi));

Peripheral services discovered

    peripheral.on('servicesDiscover', callback(services));

Service included services discovered

    service.on('includedServicesDiscover', callback(includedServiceUuids));

Service characteristics discovered

    characteristic = {
      uuid: "<uuid>",
       // properties: 'broadcast', 'read', 'writeWithoutResponse', 'write', 'notify', 'indicate', 'authenticatedSignedWrites', 'extendedProperties'
      properties: [...]
    };

    service.on('characteristicsDiscover', callback(characteristics));

Characteristic read

    characteristic.on('read', callback(data, isNotification));

Characteristic write

    characteristic.on('write', withoutResponse, callback());

Characteristic broadcast

    characteristic.on('broadcast', callback(state));

Characteristic notify

    characteristic.on('notify', callback(state));

Characteristic descriptors discovered

    descriptor = {
      uuid: '<uuid>'
    };

    characteristic.on('descriptorsDiscover', callback(descriptors));

Descriptor value read

    descriptor.on('valueRead', data);

Descriptor value write

    descriptor.on('valueWrite');

Read handle

    peripheral.readHandle(handle, callback(error, data));

Write handle

    peripheral.writeHandle(handle, data, withoutResponse, callback(error));

Running on Linux
-----------------
Must be run with ```sudo``` or as root user.

```hci0``` is used by default to override set the ```NOBLE_HCI_DEVICE_ID``` environment variable to the interface number.

Example, specify ```hci1```:

    sudo NOBLE_HCI_DEVICE_ID=1 node <your file>.js

Roadmap (TODO)
--------------

 * Mac OS X:
   * ~~Adapter state (unknown | reseting | unsupported | unauthorized | off | on)~~
   * ~~Scan~~
      * ~~startScanning~~
         * ~~service UUID's~~
         * ~~allow duplicates~~
      * ~~stopScanning~~
   * ~~Peripheral~~
     * ~~discovered~~
     * ~~connect~~
     * ~~disconnect/cancel connect~~
     * ~~update RSSI~~
     * ~~services~~
         * ~~discover~~
         * ~~disover included~~
         * ~~discover characteristics for services~~
     * ~~characteristics~~
         * ~~read~~
         * ~~write~~
         * ~~set broadcast value~~
         * ~~set notify value~~
         * ~~descriptors~~
             * ~~discover~~
             * ~~read~~
             * ~~write~~
     * ~~handle~~
         * ~~read~~
         * ~~write~~
             * ~~with response~~
             * without response
   * error handling

 * Linux
   * ~~Adapter state (unsupported | unauthorized | off | on)~~
   * ~~Scan~~
      * ~~startScanning~~
         * ~~service UUID's~~
         * ~~allow duplicates~~
      * ~~stopScanning~~
   * ~~Peripheral~~
     * ~~discovered~~
     * ~~connect~~
         * ~~public address~~
         * ~~random address~~
     * ~~disconnect/cancel connect~~
     * ~~update RSSI~~
     * ~~services~~
         * ~~discover~~
             * ~~filter by uuid~~
         * ~~discover included~~
         * ~~discover characteristics for services~~
             * ~~filter by uuid~~
     * ~~characteristics~~
         * ~~read~~
         * ~~write~~
         * ~~set broadcast value~~
         * ~~set notify value~~
         * ~~descriptors~~
             * ~~discover~~
             * ~~read~~
             * ~~write~~
     * ~~handle~~
         * ~~read~~
         * ~~write~~
             * ~~with response~~
             * ~~without response~~
   * error handling
 * Windows
   * TDB (most likely Windows 8 only)

Useful Links
------------

 * [Bluetooth Development Portal](http://developer.bluetooth.org)
   * [GATT Specifications](http://developer.bluetooth.org/gatt/Pages/default.aspx)
 * [Bluetooth: ATT and GATT](http://epx.com.br/artigos/bluetooth_gatt.php)
   
License
========

Copyright (C) 2013 Sandeep Mistry <sandeep.mistry@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
