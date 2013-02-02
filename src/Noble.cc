// #include <v8.h>
// #include <node.h>

#import "BLEManager.h"

#include "Noble.h"

static v8::Persistent<v8::FunctionTemplate> s_ct;

struct PeripheralDiscoveredData {
  Noble::Noble *noble;
  Noble::Peripheral *peripheral;
};

Noble::Peripheral::Peripheral(std::string localName, std::vector<std::string> services, int rssi) :
  localName(localName), services(services), rssi(rssi)
{

}

Noble::Peripheral::~Peripheral() {

}

void Noble::Init(v8::Handle<v8::Object> target) {
  v8::HandleScope scope;

  v8::Local<v8::FunctionTemplate> t = v8::FunctionTemplate::New(Noble::New);

  s_ct = v8::Persistent<v8::FunctionTemplate>::New(t);
  s_ct->InstanceTemplate()->SetInternalFieldCount(1);
  s_ct->SetClassName(v8::String::NewSymbol("Noble"));

  NODE_SET_PROTOTYPE_METHOD(s_ct, "startScanning", Noble::StartScanning);
  NODE_SET_PROTOTYPE_METHOD(s_ct, "stopScanning", Noble::StopScanning);

  target->Set(v8::String::NewSymbol("Noble"), s_ct->GetFunction());
}

Noble::Noble() : node::ObjectWrap(), state(StateUnknown) {
  this->bleManager = [[BLEManager alloc] initWithNoble:this];
}

Noble::~Noble() {
  [this->bleManager release];
}

void Noble::updateState(State state) {
  this->state = state;

  uv_work_t *req = new uv_work_t();
  req->data = this;

  uv_queue_work(uv_default_loop(), req, NULL, Noble::UpdateState);
}

void Noble::peripheralDiscovered(Peripheral* peripheral) {
  uv_work_t *req = new uv_work_t();

  PeripheralDiscoveredData* data = new PeripheralDiscoveredData;

  data->noble = this;
  data->peripheral = peripheral;

  req->data = data;

  uv_queue_work(uv_default_loop(), req, NULL, Noble::PeripheralDiscovered);
}

void Noble::startScanning() {
  [this->bleManager startScanning];
}

void Noble::stopScanning() {
  [this->bleManager stopScanning];
}

v8::Handle<v8::Value> Noble::New(const v8::Arguments& args) {
  v8::HandleScope scope;
  Noble* p = new Noble();
  p->Wrap(args.This());
  p->This = v8::Persistent<v8::Object>::New(args.This());
  return args.This();
}

v8::Handle<v8::Value> Noble::StartScanning(const v8::Arguments& args) {
  v8::HandleScope scope;
  Noble* p = ObjectWrap::Unwrap<Noble>(args.This());
  p->startScanning();

  v8::Handle<v8::Value> argv[1] = {
    v8::String::New("scanStart")
  };
  node::MakeCallback(args.This(), "emit", 1, argv);

  return scope.Close(v8::Undefined());
}

v8::Handle<v8::Value> Noble::StopScanning(const v8::Arguments& args) {
  v8::HandleScope scope;
  Noble* p = ObjectWrap::Unwrap<Noble>(args.This());
  p->stopScanning();

  v8::Handle<v8::Value> argv[1] = {
    v8::String::New("scanStop")
  };
  node::MakeCallback(args.This(), "emit", 1, argv);

  return scope.Close(v8::Undefined());
}

void Noble::UpdateState(uv_work_t* req) {
  v8::HandleScope scope;
  Noble* noble = static_cast<Noble*>(req->data);

  const char* state;

  switch(noble->state) {
    case StateResetting:
      state = "reset";
      break;

    case StateUnsupported:
      state = "unsupported";
      break;

    case StateUnauthorized:
      state = "unauthorized";
      break;

    case StatePoweredOff:
      state = "poweredOff";
      break;

    case StatePoweredOn:
      state = "poweredOn";
      break;

    case StateUnknown:
    default:
      state = "unknown";
      break;
  }

  v8::Handle<v8::Value> argv[2] = {
    v8::String::New("stateChange"),
    v8::String::New(state)
  };
  node::MakeCallback(noble->This, "emit", 2, argv);

  delete req;
}

void Noble::PeripheralDiscovered(uv_work_t* req)
{
  v8::HandleScope scope;
  PeripheralDiscoveredData* data = static_cast<PeripheralDiscoveredData*>(req->data);
  Noble::Noble *noble = data->noble;
  Noble::Peripheral *peripheral = data->peripheral;

  v8::Handle<v8::Object> object = v8::Object::New();
  v8::Handle<v8::Array> services = v8::Array::New();

  for (size_t i = 0; i < peripheral->services.size(); i++) {
    services->Set(i, v8::String::New(peripheral->services[i].c_str()));
  }

  object->Set(v8::String::New("localName"), v8::String::New(peripheral->localName.c_str()));
  object->Set(v8::String::New("rssi"), v8::Integer::New(peripheral->rssi));
  object->Set(v8::String::New("services"), services);

  v8::Handle<v8::Value> argv[2] = {
    v8::String::New("peripheralDiscovered"),
    object
  };
  node::MakeCallback(noble->This, "emit", 2, argv);

  delete data->peripheral;
  delete data;
  delete req;
}

extern "C" {

  static void init (v8::Handle<v8::Object> target) {
    Noble::Init(target);
  }

  NODE_MODULE(binding, init);
}
