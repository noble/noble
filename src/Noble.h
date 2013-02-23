#ifndef __NOBLE_H__
#define __NOBLE_H__

#include <node.h>

#include <string>
#include <vector>

@class BLEManager;

class Noble : node::ObjectWrap {

public:
  enum State {
    StateUnknown,
    StateResetting,
    StateUnsupported,
    StateUnauthorized,
    StatePoweredOff,
    StatePoweredOn
  };

  static void Init(v8::Handle<v8::Object> target);
  static v8::Handle<v8::Value> New(const v8::Arguments& args);

  static v8::Handle<v8::Value> StartScanning(const v8::Arguments& args);
  static v8::Handle<v8::Value> StopScanning(const v8::Arguments& args);

  static void UpdateState(uv_work_t* req);
  static void PeripheralDiscovered(uv_work_t* req);

  void updateState(State state);
  void peripheralDiscovered(std::string uuid, std::string localName, std::vector<std::string> services, int rssi);

private:
  Noble();
  ~Noble();

  void startScanning(std::vector<std::string> services, bool allowDuplicates);
  void stopScanning();

private:
    BLEManager *bleManager;
    v8::Persistent<v8::Object> This;
    State state;
};

#endif
