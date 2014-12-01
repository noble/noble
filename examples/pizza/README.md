# BLE Pizza Service

This is an example program demonstrating BLE connectivity between a peripheral running bleno, and a central running noble.

This central connects to a robotic pizza oven service, with the following characteristics:

* crust - read / write. A value representing the type of pizza crust (normal, thin, or deep dish)
* toppings - read / write. A value representing which toppings to include (pepperoni, mushrooms, extra cheese, etc.)
* bake - write / notify. The value written is the temperature at which to bake the pizza. When baking is finished, the central is notified with a bake result (half baked, crispy, burnt, etc.)

To run the central example:

    node central

And on another computer, start advertising a peripheral with [bleno](https://github.com/sandeepmistry/bleno/tree/master/examples/pizza).