function resolveBindings(){
  if (navigator.bluetooth && !process.env.NOBLE_WEBSOCKET) {
    return new (require('./webbluetooth/bindings'))();
  }

  return new (require('./websocket/bindings'))();
}

module.exports = resolveBindings;
