#pragma once

#include <napi.h>

#include "ble_manager.h"

class NobleWinrt : public Napi::ObjectWrap<NobleWinrt>
{
public:
    NobleWinrt(const Napi::CallbackInfo&);
    Napi::Value Init(const Napi::CallbackInfo&);
    Napi::Value CleanUp(const Napi::CallbackInfo&);
    Napi::Value Scan(const Napi::CallbackInfo&);
    Napi::Value StopScan(const Napi::CallbackInfo&);
    Napi::Value Connect(const Napi::CallbackInfo&);
    Napi::Value Disconnect(const Napi::CallbackInfo&);
    Napi::Value UpdateRSSI(const Napi::CallbackInfo&);
    Napi::Value DiscoverServices(const Napi::CallbackInfo&);
    Napi::Value DiscoverIncludedServices(const Napi::CallbackInfo& info);
    Napi::Value DiscoverCharacteristics(const Napi::CallbackInfo& info);
    Napi::Value Read(const Napi::CallbackInfo& info);
    Napi::Value Write(const Napi::CallbackInfo& info);
    Napi::Value Notify(const Napi::CallbackInfo& info);
    Napi::Value DiscoverDescriptors(const Napi::CallbackInfo& info);
    Napi::Value ReadValue(const Napi::CallbackInfo& info);
    Napi::Value WriteValue(const Napi::CallbackInfo& info);
    Napi::Value ReadHandle(const Napi::CallbackInfo& info);
    Napi::Value WriteHandle(const Napi::CallbackInfo& info);

    static Napi::Function GetClass(Napi::Env);

private:
    BLEManager* manager;
};
