//
//  napi_objc.mm
//  noble-mac-native
//
//  Created by Georg Vienna on 30.08.18.
//
#include "napi_winrt.h"

#include <winrt/Windows.Devices.Bluetooth.GenericAttributeProfile.h>

using namespace winrt::Windows::Devices::Bluetooth;

UUID napiToUuid(Napi::String string)
{
    std::string str = string.Utf8Value();
    if (str.size() == 32)
    {
        str.insert(8, "-");
        str.insert(13, "-");
        str.insert(18, "-");
        str.insert(23, "-");
    }
    if (str.size() == 4)
    {
        int id = std::stoi(str, 0, 16);
        return BluetoothUuidHelper::FromShortId(id);
    }
    UUID uuid;
    UuidFromString((RPC_CSTR)str.c_str(), &uuid);
    return uuid;
}

std::vector<UUID> napiToUuidArray(Napi::Array array)
{
    std::vector<UUID> uuids;
    for (size_t i = 0; i < array.Length(); i++)
    {
        Napi::Value val = array[i];
        uuids.push_back(napiToUuid(val.As<Napi::String>()));
    }
    return uuids;
}

Data napiToData(Napi::Buffer<byte> buffer)
{
    Data data;
    auto bytes = buffer.Data();
    data.assign(bytes, bytes + buffer.Length());
    return data;
}

int napiToNumber(Napi::Number number)
{
    return number.Int32Value();
}

std::vector<UUID> getUuidArray(const Napi::Value& value)
{
    if (value.IsArray())
    {
        return napiToUuidArray(value.As<Napi::Array>());
    }
    return std::vector<UUID>();
}

bool getBool(const Napi::Value& value, bool def)
{
    if (value.IsBoolean())
    {
        return value.As<Napi::Boolean>().Value();
    }
    return def;
}
