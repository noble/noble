/* eslint-disable no-console */
const noble = require('../..');
const pizza = require('./pizza');

const pizzaServiceUuid = '13333333333333333333333333333337';
const pizzaCrustCharacteristicUuid = '13333333333333333333333333330001';
const pizzaToppingsCharacteristicUuid = '13333333333333333333333333330002';
const pizzaBakeCharacteristicUuid = '13333333333333333333333333330003';

noble.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    //
    // Once the BLE radio has been powered on, it is possible
    // to begin scanning for services. Pass an empty array to
    // scan for all services (uses more time and power).
    //
    console.log('scanning...');
    noble.startScanning([pizzaServiceUuid], false);
  }
  else {
    noble.stopScanning();
  }
});

let pizzaCrustCharacteristic = null;
let pizzaToppingsCharacteristic = null;
let pizzaBakeCharacteristic = null;

noble.on('discover', (peripheral) => {
  // we found a peripheral, stop scanning
  noble.stopScanning();

  //
  // The advertisment data contains a name, power level (if available),
  // certain advertised service uuids, as well as manufacturer data,
  // which could be formatted as an iBeacon.
  //
  console.log('found peripheral:', peripheral.advertisement);
  //
  // Once the peripheral has been discovered, then connect to it.
  //
  peripheral.connect((err) => {
    //
    // Once the peripheral has been connected, then discover the
    // services and characteristics of interest.
    //
    peripheral.discoverServices([pizzaServiceUuid], (err, services) => {
      services.forEach((service) => {
        //
        // This must be the service we were looking for.
        //
        console.log('found service:', service.uuid);

        //
        // So, discover its characteristics.
        //
        service.discoverCharacteristics([], (err, characteristics) => {

          characteristics.forEach((characteristic) => {
            //
            // Loop through each characteristic and match them to the
            // UUIDs that we know about.
            //
            console.log('found characteristic:', characteristic.uuid);

            if (pizzaCrustCharacteristicUuid === characteristic.uuid) {
              pizzaCrustCharacteristic = characteristic;
            }
            else if (pizzaToppingsCharacteristicUuid === characteristic.uuid) {
              pizzaToppingsCharacteristic = characteristic;
            }
            else if (pizzaBakeCharacteristicUuid === characteristic.uuid) {
              pizzaBakeCharacteristic = characteristic;
            }
          });

          //
          // Check to see if we found all of our characteristics.
          //
          if (pizzaCrustCharacteristic &&
              pizzaToppingsCharacteristic &&
              pizzaBakeCharacteristic) {
            //
            // We did, so bake a pizza!
            //
            bakePizza();
          }
          else {
            console.log('missing characteristics');
          }
        });
      });
    });
  });
});

function bakePizza() {
  //
  // Pick the crust.
  //
  const crust = Buffer.alloc(1);
  crust.writeUInt8(pizza.PizzaCrust.THIN, 0);
  pizzaCrustCharacteristic.write(crust, false, (err) => {
    if (!err) {
      //
      // Pick the toppings.
      //
      const toppings = Buffer.alloc(2);
      toppings.writeUInt16BE(
        pizza.PizzaToppings.EXTRA_CHEESE |
        pizza.PizzaToppings.CANADIAN_BACON |
        pizza.PizzaToppings.PINEAPPLE,
        0
      );
      pizzaToppingsCharacteristic.write(toppings, false, (err) => {
        if (!err) {
          //
          // Subscribe to the bake notification, so we know when
          // our pizza will be ready.
          //
          pizzaBakeCharacteristic.on('read', (data, isNotification) => {
            console.log('Our pizza is ready!');
            if (data.length === 1) {
              const result = data.readUInt8(0);
              console.log('The result is',
                result === pizza.PizzaBakeResult.HALF_BAKED ? 'half baked.' :
                result === pizza.PizzaBakeResult.BAKED ? 'baked.' :
                result === pizza.PizzaBakeResult.CRISPY ? 'crispy.' :
                result === pizza.PizzaBakeResult.BURNT ? 'burnt.' :
                result === pizza.PizzaBakeResult.ON_FIRE ? 'on fire!' :
                'unknown?');
            }
            else {
              console.log('result length incorrect');
            }
          });
          pizzaBakeCharacteristic.subscribe((err) => {
            //
            // Bake at 450 degrees!
            //
            const temperature = Buffer.alloc(2);
            temperature.writeUInt16BE(450, 0);
            pizzaBakeCharacteristic.write(temperature, false, (err) => {
              if (err) {
                console.log('bake error');
              }
            });
          });

        }
        else {
          console.log('toppings error');
        }
      });
    }
    else {
      console.log('crust error');
    }
  });
}
