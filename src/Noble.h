#ifndef __NOBLE_H__
#define __NOBLE_H__

#include <node.h>

#include <string>
#include <vector>

#include <dispatch/dispatch.h>
#include <xpc/xpc.h>

class Noble : node::ObjectWrap {

public:
  static void Init(v8::Handle<v8::Object> target);
  static v8::Handle<v8::Value> New(const v8::Arguments& args);

  static v8::Handle<v8::Value> SetupXpcConnection(const v8::Arguments& args);
  static v8::Handle<v8::Value> SendXpcMessage(const v8::Arguments& args);

private:
  Noble();
  ~Noble();

  static xpc_object_t ValueToXpcObject(v8::Handle<v8::Value> object);
  static xpc_object_t ObjectToXpcObject(v8::Handle<v8::Object> object);
  static xpc_object_t ArrayToXpcObject(v8::Handle<v8::Array> array);

  static v8::Handle<v8::Value> XpcObjectToValue(xpc_object_t xpcObject);
  static v8::Handle<v8::Object> XpcDictionaryToObject(xpc_object_t xpcDictionary);
  static v8::Handle<v8::Array> XpcArrayToArray(xpc_object_t xpcArray);

  static void HandleXpcEvent(uv_work_t* req);
#if UV_VERSION_MINOR > 8
  static void HandleXpcEventAfter(uv_work_t* req, int status);
#else
  static void HandleXpcEventAfter(uv_work_t* req);
#endif

  void setupXpcConnection();
  void sendXpcMessage(xpc_object_t message);
  void handleXpcEvent(xpc_object_t event);

private:
    dispatch_queue_t dispatchQueue;
    xpc_connection_t xpcConnnection;

    v8::Persistent<v8::Object> This;
};

#endif
