//
//  noble_winrt.cc
//  noble-winrt-native
//
//  Created by Georg Vienna on 03.09.18.
//
#include "noble_winrt.h"

#include "napi_winrt.h"

#define THROW(msg)                                                      \
    Napi::TypeError::New(info.Env(), msg).ThrowAsJavaScriptException(); \
    return Napi::Value();

#define ARG1(type1)                                         \
    if (!info[0].Is##type1())                               \
    {                                                       \
        THROW("There should be one argument: (" #type1 ")") \
    }

#define ARG2(type1, type2)                                              \
    if (!info[0].Is##type1() || !info[1].Is##type2())                   \
    {                                                                   \
        THROW("There should be 2 arguments: (" #type1 ", " #type2 ")"); \
    }

#define ARG3(type1, type2, type3)                                                   \
    if (!info[0].Is##type1() || !info[1].Is##type2() || !info[2].Is##type3())       \
    {                                                                               \
        THROW("There should be 3 arguments: (" #type1 ", " #type2 ", " #type3 ")"); \
    }

#define ARG4(type1, type2, type3, type4)                                                        \
    if (!info[0].Is##type1() || !info[1].Is##type2() || !info[2].Is##type3() ||                 \
        !info[3].Is##type4())                                                                   \
    {                                                                                           \
        THROW("There should be 4 arguments: (" #type1 ", " #type2 ", " #type3 ", " #type4 ")"); \
    }

#define ARG5(type1, type2, type3, type4, type5)                                           \
    if (!info[0].Is##type1() || !info[1].Is##type2() || !info[2].Is##type3() ||           \
        !info[3].Is##type4() || !info[4].Is##type5())                                     \
    {                                                                                     \
        THROW("There should be 5 arguments: (" #type1 ", " #type2 ", " #type3 ", " #type4 \
              ", " #type5 ")");                                                           \
    }

#define CHECK_MANAGER()                                  \
    if (!manager)                                        \
    {                                                    \
        THROW("BLEManager has already been cleaned up"); \
    }

NobleWinrt::NobleWinrt(const Napi::CallbackInfo& info) : ObjectWrap(info)
{
}

Napi::Value NobleWinrt::Init(const Napi::CallbackInfo& info)
{
    Napi::Function emit = info.This().As<Napi::Object>().Get("emit").As<Napi::Function>();
    manager = new BLEManager(info.This(), emit);
    return Napi::Value();
}

// startScanning(serviceUuids, allowDuplicates)
Napi::Value NobleWinrt::Scan(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    auto vector = getUuidArray(info[0]);
    // default value false
    auto duplicates = getBool(info[1], false);
    manager->Scan(vector, duplicates);
    return Napi::Value();
}

// stopScanning()
Napi::Value NobleWinrt::StopScan(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    manager->StopScan();
    return Napi::Value();
}

// connect(deviceUuid)
Napi::Value NobleWinrt::Connect(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG1(String)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    manager->Connect(uuid);
    return Napi::Value();
}

// disconnect(deviceUuid)
Napi::Value NobleWinrt::Disconnect(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG1(String)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    manager->Disconnect(uuid);
    return Napi::Value();
}

// updateRssi(deviceUuid)
Napi::Value NobleWinrt::UpdateRSSI(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG1(String)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    manager->UpdateRSSI(uuid);
    return Napi::Value();
}

// discoverServices(deviceUuid, uuids)
Napi::Value NobleWinrt::DiscoverServices(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG1(String)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    std::vector<UUID> uuids = getUuidArray(info[1]);
    manager->DiscoverServices(uuid, uuids);
    return Napi::Value();
}

// discoverIncludedServices(deviceUuid, serviceUuid, serviceUuids)
Napi::Value NobleWinrt::DiscoverIncludedServices(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG2(String, String)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    auto service = napiToUuid(info[1].As<Napi::String>());
    std::vector<UUID> uuids = getUuidArray(info[2]);
    manager->DiscoverIncludedServices(uuid, service, uuids);
    return Napi::Value();
}

// discoverCharacteristics(deviceUuid, serviceUuid, characteristicUuids)
Napi::Value NobleWinrt::DiscoverCharacteristics(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG2(String, String)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    auto service = napiToUuid(info[1].As<Napi::String>());
    std::vector<UUID> characteristics = getUuidArray(info[2]);
    manager->DiscoverCharacteristics(uuid, service, characteristics);
    return Napi::Value();
}

// read(deviceUuid, serviceUuid, characteristicUuid)
Napi::Value NobleWinrt::Read(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG3(String, String, String)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    auto service = napiToUuid(info[1].As<Napi::String>());
    auto characteristic = napiToUuid(info[2].As<Napi::String>());
    manager->Read(uuid, service, characteristic);
    return Napi::Value();
}

// write(deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse)
Napi::Value NobleWinrt::Write(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG5(String, String, String, Buffer, Boolean)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    auto service = napiToUuid(info[1].As<Napi::String>());
    auto characteristic = napiToUuid(info[2].As<Napi::String>());
    auto data = napiToData(info[3].As<Napi::Buffer<byte>>());
    auto withoutResponse = info[4].As<Napi::Boolean>().Value();
    manager->Write(uuid, service, characteristic, data, withoutResponse);
    return Napi::Value();
}

// notify(deviceUuid, serviceUuid, characteristicUuid, notify)
Napi::Value NobleWinrt::Notify(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG4(String, String, String, Boolean)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    auto service = napiToUuid(info[1].As<Napi::String>());
    auto characteristic = napiToUuid(info[2].As<Napi::String>());
    auto on = info[3].As<Napi::Boolean>().Value();
    manager->Notify(uuid, service, characteristic, on);
    return Napi::Value();
}

// discoverDescriptors(deviceUuid, serviceUuid, characteristicUuid)
Napi::Value NobleWinrt::DiscoverDescriptors(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG3(String, String, String)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    auto service = napiToUuid(info[1].As<Napi::String>());
    auto characteristic = napiToUuid(info[2].As<Napi::String>());
    manager->DiscoverDescriptors(uuid, service, characteristic);
    return Napi::Value();
}

// readValue(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid)
Napi::Value NobleWinrt::ReadValue(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG4(String, String, String, String)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    auto service = napiToUuid(info[1].As<Napi::String>());
    auto characteristic = napiToUuid(info[2].As<Napi::String>());
    auto descriptor = napiToUuid(info[3].As<Napi::String>());
    manager->ReadValue(uuid, service, characteristic, descriptor);
    return Napi::Value();
}

// writeValue(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data)
Napi::Value NobleWinrt::WriteValue(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG5(String, String, String, String, Buffer)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    auto service = napiToUuid(info[1].As<Napi::String>());
    auto characteristic = napiToUuid(info[2].As<Napi::String>());
    auto descriptor = napiToUuid(info[3].As<Napi::String>());
    auto data = napiToData(info[4].As<Napi::Buffer<byte>>());
    manager->WriteValue(uuid, service, characteristic, descriptor, data);
    return Napi::Value();
}

// readHandle(deviceUuid, handle)
Napi::Value NobleWinrt::ReadHandle(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG2(String, Number)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    auto handle = napiToNumber(info[1].As<Napi::Number>());
    manager->ReadHandle(uuid, handle);
    return Napi::Value();
}

// writeHandle(deviceUuid, handle, data, (unused)withoutResponse)
Napi::Value NobleWinrt::WriteHandle(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    ARG3(String, Number, Buffer)
    auto uuid = info[0].As<Napi::String>().Utf8Value();
    auto handle = napiToNumber(info[1].As<Napi::Number>());
    auto data = napiToData(info[2].As<Napi::Buffer<byte>>());
    manager->WriteHandle(uuid, handle, data);
    return Napi::Value();
}

Napi::Value NobleWinrt::CleanUp(const Napi::CallbackInfo& info)
{
    CHECK_MANAGER()
    delete manager;
    manager = nullptr;
    return Napi::Value();
}

Napi::Function NobleWinrt::GetClass(Napi::Env env)
{
    // clang-format off
    return DefineClass(env, "NobleWinrt", {
        NobleWinrt::InstanceMethod("init", &NobleWinrt::Init),
        NobleWinrt::InstanceMethod("startScanning", &NobleWinrt::Scan),
        NobleWinrt::InstanceMethod("stopScanning", &NobleWinrt::StopScan),
        NobleWinrt::InstanceMethod("connect", &NobleWinrt::Connect),
        NobleWinrt::InstanceMethod("disconnect", &NobleWinrt::Disconnect),
        NobleWinrt::InstanceMethod("updateRssi", &NobleWinrt::UpdateRSSI),
        NobleWinrt::InstanceMethod("discoverServices", &NobleWinrt::DiscoverServices),
        NobleWinrt::InstanceMethod("discoverIncludedServices", &NobleWinrt::DiscoverIncludedServices),
        NobleWinrt::InstanceMethod("discoverCharacteristics", &NobleWinrt::DiscoverCharacteristics),
        NobleWinrt::InstanceMethod("read", &NobleWinrt::Read),
        NobleWinrt::InstanceMethod("write", &NobleWinrt::Write),
        NobleWinrt::InstanceMethod("notify", &NobleWinrt::Notify),
        NobleWinrt::InstanceMethod("discoverDescriptors", &NobleWinrt::DiscoverDescriptors),
        NobleWinrt::InstanceMethod("readValue", &NobleWinrt::ReadValue),
        NobleWinrt::InstanceMethod("writeValue", &NobleWinrt::WriteValue),
        NobleWinrt::InstanceMethod("readHandle", &NobleWinrt::ReadValue),
        NobleWinrt::InstanceMethod("writeHandle", &NobleWinrt::WriteValue),
        NobleWinrt::InstanceMethod("cleanUp", &NobleWinrt::CleanUp),
    });
    // clang-format on
}

#pragma comment(lib, "windowsapp")

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    try
    {
        winrt::init_apartment();
    }
    catch (winrt::hresult_error hresult)
    {
        // electron already initialized the COM library
        if (hresult.code() != RPC_E_CHANGED_MODE)
        {
            wprintf(L"Failed initializing apartment: %d %s", hresult.code(),
                    hresult.message().c_str());
            Napi::TypeError::New(env, "Failed initializing apartment").ThrowAsJavaScriptException();
            return exports;
        }
    }
    Napi::String name = Napi::String::New(env, "NobleWinrt");
    exports.Set(name, NobleWinrt::GetClass(env));
    return exports;
}

NODE_API_MODULE(addon, Init)
