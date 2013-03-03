noble
=====

A node.js BLE (Bluetooth low energy) module.

__Note:__ Mac OS X is currently the only supported OS, and is still under development. Other platforms will be developed later on (see Roadmap below).

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

    peripheral.connect();

Peripheral disconnect or cancel pending connection:

    peripheral.disconnect();

Peripheral update RSSI

    peripheral.updateRssi();

Peripheral discover services

    peripheral.discoverServices(); // any service UUID

    var serviceUUIDs = ["<service UUID 1>", ...];
    peripheral.discoverServices(serviceUUIDs); // particular UUID's

Service discover included services

    service.discoverIncludedServices(); // any service UUID

    var serviceUUIDs = ["<service UUID 1>", ...];
    service.discoverIncludedServices(serviceUUIDs); // particular UUID's

Service discover characteristics

    service.discoverCharacteristics() // any characteristic UUID

    var characteristicUUIDs = ["<characteristic UUID 1>", ...];
    service.discoverCharacteristics(characteristicUUIDs); // particular UUID's

Characteristic read

    characteristic.read();

Characteristic write

    characteristic.write(data, notify); // data is a buffer, notify is true|false

Characteristic broadcast

    characteristic.broadcast(broadcast); // broadcast is true|false

Characteristic notify

    characteristic.notify(notify); // notify is true|false

Characteristic discover descriptors

    characteristic.discoverDescriptors();

Descriptor read value

    descriptor.readValue();

Descriptor write value

    descriptor.writeValue(data); // data is a buffer

__Events__

Adapter state change:

    state = <"unknown" | "resetting" | "unsupported" | "unsupported" | "unauthorized" | "poweredOff" | "poweredOn">

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

    noble.on('peripheralDiscover', callback(peripheral));

Peripheral connected:

    noble.on('peripheralConnect', callback(peripheral));

    peripheral.on('connect', callback);

Peripheral disconnected:

    noble.on('peripheralDisconnect', callback(peripheral));

    peripheral.on('disconnect', callback);

Peripheral RSSI update

    noble.on('peripheralRssiUpdate', callback(peripheral, rssi));

    peripheral.on('rssiUpdate', callback(rssi));

Peripheral services discovered

    noble.on('peripheralServicesDiscover', callback(peripheral, services));

    peripheral.on('servicesDiscovered', callback(services));

Service included services discovered

    noble.on('peripheralServiceIncludedServicesDiscover', callback(peripheral, service, includedServiceUuids));

    peripheral.on('serviceIncludedServicesDiscover', callback(service, includedServiceUuids));

    service.on('includedServicesDiscover', callback(includedServiceUuids));

Service characteristics discovered

    characteristic = {
      uuid: "<uuid>",
       // properties: 'broadcast', 'read', 'writeWithoutResponse', 'write', 'notify', 'indicate', 'authenticatedSignedWrites', 'extendedProperties'
      properties: [...]
    };

    noble.on('peripheralServiceCharacteristicsDiscover', callback(peripheral, service, characteristics));

    peripheral.on('serviceCharacteristicsDiscover', callback(service, characteristics));

    service.on('characteristicsDiscover', callback(characteristics));

Characteristic read

    noble.on('peripheralServiceCharacteristicRead', callback(peripheral, service, characteristic, data, isNotification));

    peripheral.on('serviceCharacteristicRead', callback(service, characteristic, data, isNotification));

    service.on('characteristicRead', callback(characteristic, data, isNotification));

    characteristic.on('read', callback(data, isNotification));

Characteristic write

    noble.on('peripheralServiceCharacteristicWrite', callback(peripheral, service, characteristic));

    peripheral.on('serviceCharacteristicWrite', callback(service, characteristic));

    service.on('characteristicWrite', callback(characteristic));

    characteristic.on('write', callback());

Characteristic broadcast

    noble.on('peripheralServiceCharacteristicBroadcast', callback(peripheral, service, characteristic, state));

    peripheral.on('serviceCharacteristicBroadcast', callback(service, characteristic, state));

    service.on('characteristicBroadcast', callback(characteristic, state));

    characteristic.on('broadcast', callback(state));

Characteristic notify

    noble.on('peripheralServiceCharacteristicNotify', callback(peripheral, service, characteristic, state));

    peripheral.on('serviceCharacteristicNotify', callback(service, characteristic, state));

    service.on('characteristicNotify', callback(characteristic, state));

    characteristic.on('notify', callback(state));

Characteristic descriptors discovered

    descriptor = {
      uuid: '<uuid>'
    };

    noble.on('peripheralServiceCharacteristicDescriptorsDiscover', callback(peripheral, service, characteristic, descriptors));

    peripheral.on('serviceCharacteristicDescriptorsDiscover', callback(service, characteristic, descriptors));

    service.on('characteristicDescriptorsDiscover', callback(characteristic, descriptors));

    characteristic.on('descriptorsDiscover', callback(descriptors));

Descriptor value read

    noble.on('peripheralServiceCharacteristicDescriptorValueRead', callback(peripheral, service, characteristic, descriptor, data));

    peripheral.on('serviceCharacteristicDescriptorsValueRead', callback(service, characteristic, descriptor, data));

    service.on('characteristicDescriptorValueRead', callback(characteristic, descriptor, data));

    characteristic.on('descriptorValueRead', callback(descriptor, data));

    descriptor.on('valueRead', data);

Descriptor value write

    noble.on('peripheralServiceCharacteristicDescriptorValueWrite', callback(peripheral, service, characteristic, descriptor));

    peripheral.on('serviceCharacteristicDescriptorsValueWrite', callback(service, characteristic, descriptor));

    service.on('characteristicDescriptorValueWrite', callback(characteristic, descriptor));

    characteristic.on('descriptorValueWrite', callback(descriptor));

    descriptor.on('valueWrite');

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
   * error handling

 * Linux
   * TDB
 * Windows
   * TDB
   
License
========

Copyright (C) 2013 Sandeep Mistry <sandeep.mistry@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.