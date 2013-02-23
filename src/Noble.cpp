// #include <v8.h>
// #include <node.h>

#import "BLEManager.h"

#include "Noble.h"

static v8::Persistent<v8::FunctionTemplate> s_ct;

class PeripheralDiscoveredData {
public:
  Noble::Noble *noble;
  std::string uuid;
  std::string localName;
  std::vector<std::string> services;
  int rssi;
};

class PeripheralConnectedData {
public:
  Noble::Noble *noble;
  std::string uuid;
};

class PeripheralConnectFailureData {
public:
  Noble::Noble *noble;
  std::string uuid;
  std::string reason;
};

class PeripheralDisconnectedData {
public:
  Noble::Noble *noble;
  std::string uuid;
};

void Noble::Init(v8::Handle<v8::Object> target) {
  v8::HandleScope scope;

  v8::Local<v8::FunctionTemplate> t = v8::FunctionTemplate::New(Noble::New);

  s_ct = v8::Persistent<v8::FunctionTemplate>::New(t);
  s_ct->InstanceTemplate()->SetInternalFieldCount(1);
  s_ct->SetClassName(v8::String::NewSymbol("Noble"));

  NODE_SET_PROTOTYPE_METHOD(s_ct, "startScanning", Noble::StartScanning);
  NODE_SET_PROTOTYPE_METHOD(s_ct, "stopScanning", Noble::StopScanning);
  NODE_SET_PROTOTYPE_METHOD(s_ct, "connectPeripheral", Noble::ConnectPeripheral);
  NODE_SET_PROTOTYPE_METHOD(s_ct, "disconnectPeripheral", Noble::DisconnectPeripheral);

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

void Noble::peripheralDiscovered(std::string uuid, std::string localName, std::vector<std::string> services, int rssi) {
  uv_work_t *req = new uv_work_t();

  PeripheralDiscoveredData* data = new PeripheralDiscoveredData;

  data->noble = this;
  data->uuid = uuid;
  data->localName = localName;
  data->services = services;
  data->rssi = rssi;

  req->data = data;

  uv_queue_work(uv_default_loop(), req, NULL, Noble::PeripheralDiscovered);
}

void Noble::peripheralConnected(std::string uuid) {
  uv_work_t *req = new uv_work_t();

  PeripheralConnectedData* data = new PeripheralConnectedData;

  data->noble = this;
  data->uuid = uuid;

  req->data = data;

  uv_queue_work(uv_default_loop(), req, NULL, Noble::PeripheralConnected);
}

void Noble::peripheralConnectFailure(std::string uuid, std::string reason) {
  uv_work_t *req = new uv_work_t();

  PeripheralConnectFailureData* data = new PeripheralConnectFailureData;

  data->noble = this;
  data->uuid = uuid;
  data->reason = reason;

  req->data = data;

  uv_queue_work(uv_default_loop(), req, NULL, Noble::PeripheralConnectFailure);
}

void Noble::peripheralDisconnected(std::string uuid) {
  uv_work_t *req = new uv_work_t();

  PeripheralDisconnectedData* data = new PeripheralDisconnectedData;

  data->noble = this;
  data->uuid = uuid;

  req->data = data;

  uv_queue_work(uv_default_loop(), req, NULL, Noble::PeripheralDisonnected);
}

void Noble::startScanning(std::vector<std::string> services, bool allowDuplicates) {
  [this->bleManager startScanningForServices:services allowDuplicates:allowDuplicates];
}

void Noble::stopScanning() {
  [this->bleManager stopScanning];
}

void Noble::connectPeripheral(std::string uuid) {
  [this->bleManager connectPeripheral:uuid];
}

void Noble::disconnectPeripheral(std::string uuid) {
  [this->bleManager disconnectPeripheral:uuid];
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

  std::vector<std::string> services;
  bool allowDuplicates = false;

  if (args.Length() > 0) {
    v8::Handle<v8::Value> arg0 = args[0];
    if (arg0->IsArray()) {
      v8::Handle<v8::Array> servicesArray = v8::Handle<v8::Array>::Cast(arg0);

      for(uint32_t i = 0; i < servicesArray->Length(); i++) {
        v8::Handle<v8::Value> serviceValue = servicesArray->Get(i);

        if (serviceValue->IsString()) {
          v8::String::AsciiValue serviceString(serviceValue->ToString());

          services.push_back(std::string(*serviceString));
        }
      }
    }
  }

  if (args.Length() > 1) {
    v8::Handle<v8::Value> arg1 = args[1];
    if (arg1->IsBoolean()) {
      allowDuplicates = arg1->ToBoolean()->Value();
    }
  }

  p->startScanning(services, allowDuplicates);

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

v8::Handle<v8::Value> Noble::ConnectPeripheral(const v8::Arguments& args) {
  v8::HandleScope scope;
  Noble* p = ObjectWrap::Unwrap<Noble>(args.This());

  std::string uuid;

  if (args.Length() > 0) {
    v8::Handle<v8::Value> arg0 = args[0];
    if (arg0->IsString()) {
      v8::String::AsciiValue serviceString(arg0->ToString());
      uuid = std::string(*serviceString);
    }
  }

  p->connectPeripheral(uuid);

  return scope.Close(v8::Undefined());
}

v8::Handle<v8::Value> Noble::DisconnectPeripheral(const v8::Arguments& args) {
  v8::HandleScope scope;
  Noble* p = ObjectWrap::Unwrap<Noble>(args.This());

  std::string uuid;

  if (args.Length() > 0) {
    v8::Handle<v8::Value> arg0 = args[0];
    if (arg0->IsString()) {
      v8::String::AsciiValue serviceString(arg0->ToString());
      uuid = std::string(*serviceString);
    }
  }

  p->disconnectPeripheral(uuid);

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

void Noble::PeripheralDiscovered(uv_work_t* req) {
  v8::HandleScope scope;
  PeripheralDiscoveredData* data = static_cast<PeripheralDiscoveredData*>(req->data);
  Noble::Noble *noble = data->noble;

  v8::Handle<v8::Array> services = v8::Array::New();

  for (size_t i = 0; i < data->services.size(); i++) {
    services->Set(i, v8::String::New(data->services[i].c_str()));
  }

  v8::Handle<v8::Value> argv[5] = {
    v8::String::New("peripheralDiscover"),
    v8::String::New(data->uuid.c_str()),
    v8::String::New(data->localName.c_str()),
    services,
    v8::Integer::New(data->rssi)
  };
  node::MakeCallback(noble->This, "emit", 5, argv);

  delete data;
  delete req;
}

void Noble::PeripheralConnected(uv_work_t* req) {
  v8::HandleScope scope;
  PeripheralConnectedData* data = static_cast<PeripheralConnectedData*>(req->data);
  Noble::Noble *noble = data->noble;

  v8::Handle<v8::Value> argv[2] = {
    v8::String::New("peripheralConnect"),
    v8::String::New(data->uuid.c_str()),
  };
  node::MakeCallback(noble->This, "emit", 2, argv);

  delete data;
  delete req;
}

void Noble::PeripheralConnectFailure(uv_work_t* req) {
  v8::HandleScope scope;
  PeripheralConnectFailureData* data = static_cast<PeripheralConnectFailureData*>(req->data);
  Noble::Noble *noble = data->noble;

  v8::Handle<v8::Value> argv[3] = {
    v8::String::New("peripheralConnectFailure"),
    v8::String::New(data->uuid.c_str()),
    v8::String::New(data->reason.c_str())
  };
  node::MakeCallback(noble->This, "emit", 3, argv);

  delete data;
  delete req;
}

void Noble::PeripheralDisonnected(uv_work_t* req) {
  v8::HandleScope scope;
  PeripheralDisconnectedData* data = static_cast<PeripheralDisconnectedData*>(req->data);
  Noble::Noble *noble = data->noble;

  v8::Handle<v8::Value> argv[2] = {
    v8::String::New("peripheralDisonnect"),
    v8::String::New(data->uuid.c_str()),
  };
  node::MakeCallback(noble->This, "emit", 2, argv);

  delete data;
  delete req;
}

extern "C" {

  static void init (v8::Handle<v8::Object> target) {
    Noble::Init(target);
  }

  NODE_MODULE(binding, init);
}
