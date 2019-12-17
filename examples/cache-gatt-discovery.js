/** discover a device (here, the first one where the name was resolved), 
 * for the first device discover all services and characteristics, 
 * store the collected GATT information into a meta-data object and write to disk.
 * Finds a temperature characteristic and registers for data. 
 * Prints timing information from discovered to connected to reading states.
 */

var noble = require('../index');
const fs = require('fs'); 

// the sensor value to scan for, number of bits and factor for displaying it
const CHANNEL = process.env['CHANNEL'] ? process.env['CHANNEL'] : 'Temperature'
const BITS = process.env['BITS'] ? 1 * process.env['BITS'] : 16
const FACTOR = process.env['FACTOR'] ? 1. * process.env['FACTOR'] : .1

const EXT='.dump'

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

let tDisco=0; // time when device was discovered
let tConn =0; // time when connection to device was established
let tRead =0; // time when reading data starts.

// collect device meta-data into this object:
let meta = {
  services: [],        // stores an array of GATT service data objects
  characteristics: {}  // a map with key service-UUID, stores the array of characteristics
}

noble.on('discover', function(peripheral) {
  console.log('peripheral discovered (' + peripheral.id +
              ' with address <' + peripheral.address +  ', ' + peripheral.addressType + '>,' +
              ' connectable ' + peripheral.connectable + ',' +
              ' RSSI ' + peripheral.rssi + ':');
  console.log('\thello my local name is:');
  console.log('\t\t' + peripheral.advertisement.localName);
  console.log();

  // connect to the first device with a valid name
  if (peripheral.advertisement.localName) {
    console.log('Connecting to  ' + peripheral.address + ' ' + peripheral.advertisement.localName)

    tDisco = Date.now()
    
    connectToDevice(peripheral)
  }
});

let connectToDevice = function (peripheral) {
    // BLE cannot scan and connect in parallel, so we stop scanning here:
    noble.stopScanning() 

    peripheral.connect((error) => {
      // noble.startScanning([], true)
      if (error) {
        console.log('Connect error: ' + error)
        noble.startScanning([], true)
        return
      }
      tConn = Date.now()
      console.log('Connected!')

      findServices(noble, peripheral)
    })
}


let servicesToRead = 0;

let findServices = function (noble, peripheral) {
  meta.uuid = peripheral.uuid
  meta.address = peripheral.address
  meta.name = peripheral.advertisement.localName // not needed but nice to have

  meta.characteristics = {}

  // callback triggers with GATT-relevant data 
  peripheral.on('servicesDiscovered', (peripheral, services) => {
    
    console.log('servicesDiscovered: Found '+ services.length + ' services! ')
    meta.services = services
    for (let i in services) {
      const service = services[i]
      console.log('\tservice ' + i + ' : ' + JSON.stringify(service))
      //meta.services[ service.uuid ] = service
    }
  })

  peripheral.discoverServices([], (error, services) => {

    let sensorCharacteristic
    
    servicesToRead = services.length
    // we found the list of services, now trigger characteristics lookup for each of them:

    for (let i = 0; i < services.length; i++) {
      let service = services[i]

      service.on('characteristicsDiscovered', (characteristics) => {
	// store the list of characteristics per service
        meta.characteristics[service.uuid] = characteristics

        console.log('SRV\t' + service.uuid + ' characteristic GATT data: ')
        for (let i = 0; i < characteristics.length; i++) {
          console.log('\t' + service.uuid + ' chara.\t ' + ' ' + i + ' ' + JSON.stringify(characteristics[i]))
        }
      })

      service.discoverCharacteristics([], function (error, characteristics) {
        console.log('SRV\t' + service.uuid + ' characteristic decoded data: ' )
        for (let j = 0; j< characteristics.length; j++) {
          let ch = characteristics[j]
          console.log('\t' + service.uuid + ' chara.\t ' + ' ' + j + ' ' + ch)

	  if ( ch.name === CHANNEL) {
	    console.log('found ' + CHANNEL + ' characteristic!')
	    sensorCharacteristic = ch
	  }
        }

	servicesToRead--
	if (!servicesToRead) {
	  console.log('----------------- FINISHED')
	  console.log(JSON.stringify(meta, null, 4))
	  // write to file
	  fs.writeFile(meta.uuid + EXT, JSON.stringify(meta,null,2), function(err) {
	    if(err) {
              return console.log(err);
	    }
	    console.log("The data was saved to " , meta.uuid + EXT);
	  });

	  if (sensorCharacteristic) {
	    console.log('Listening for temperature data...')

	    tRead = Date.now()
      
	    sensorCharacteristic.on('data', (data) => {
        if (BITS === 16 ) {
          console.log(' new ' + CHANNEL + ' ' + (data.readUInt16LE() * FACTOR)  )
        } else if (BITS === 32) {
          console.log(' new ' + CHANNEL + ' ' + (data.readUInt32LE() * FACTOR)  )
        } else {
          console.log(' Cannot cope with BITS value '+ BITS) 
        }
	    })
	    sensorCharacteristic.read()
	  }

	  console.log('Timespan from discovery to connected: ' + (tConn -tDisco) + ' ms')
	  console.log('Timespan from connected to reading  : ' + (tRead -tConn)  + ' ms')
	}
      })
    }
  })
}
