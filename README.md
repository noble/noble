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
      localName: "<name>",
      services: ["<service UUID>", ...],
      rssi: <rssi>
    };

    noble.on('peripheralDiscover', callback(peripheral));

Peripheral connected:

    noble.on('peripheralConnect', callback(peripheral));

    peripheral.on('connect', callback);

Peripheral connect failure:

    noble.on('peripheralConnectFailure', callback(peripheral, reason));

    peripheral.on('connectFailure', callback(reason));


Peripheral disconnected:

    noble.on('peripheralDisonnect', callback(peripheral));

    peripheral.on('disconnect', callback);

Roadmap (TODO)
--------------

 * Mac OS X:
   * ~~Adapter state (unknown | reseting | unsupported | unauthorized | off | on)~~
   * ~~Scan~~
      * ~~startScanning~~
         * ~~service UUID's~~
         * ~~allow duplicates~~
      * ~~stopScanning~~
   * Peripheral (uuid, local name, service UUID's, RSSI)
     * ~~discovered~~
     * ~~connect~~
     * ~~disconnect/cancel connect~~
     * discover services
     * read
     * write
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