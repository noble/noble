function resolveBindings(){
  if (navigator.bluetooth) {
    return require('./webbluetooth/bindings');
  } 

  return require('./websocket/bindings');
}

module.exports = resolveBindings;
