#include "winrt_cpp.h"

#include <sstream>
#include <iomanip>

#include <winrt\Windows.Devices.Bluetooth.h>
#include <Rpc.h>

std::string ws2s(const wchar_t* wstr)
{
    int size_needed = WideCharToMultiByte(CP_UTF8, 0, wstr, lstrlenW(wstr), nullptr, 0, nullptr, nullptr);
    std::string strTo(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, wstr, lstrlenW(wstr), &strTo[0], size_needed, NULL, NULL);
    return strTo;
}

std::string formatBluetoothAddress(unsigned long long BluetoothAddress)
{
    std::ostringstream ret;
    ret << std::hex << std::setfill('0') << std::setw(2) << ((BluetoothAddress >> (5 * 8)) & 0xff)
        << ":" << std::setw(2) << ((BluetoothAddress >> (4 * 8)) & 0xff) << ":" << std::setw(2)
        << ((BluetoothAddress >> (3 * 8)) & 0xff) << ":" << std::setw(2)
        << ((BluetoothAddress >> (2 * 8)) & 0xff) << ":" << std::setw(2)
        << ((BluetoothAddress >> (1 * 8)) & 0xff) << ":" << std::setw(2)
        << ((BluetoothAddress >> (0 * 8)) & 0xff);
    return ret.str();
}

std::string formatBluetoothUuid(unsigned long long BluetoothAddress)
{
    std::ostringstream ret;
    ret << std::hex << std::setfill('0') << std::setw(2) << ((BluetoothAddress >> (5 * 8)) & 0xff)
        << std::setw(2) << ((BluetoothAddress >> (4 * 8)) & 0xff) << std::setw(2)
        << ((BluetoothAddress >> (3 * 8)) & 0xff) << std::setw(2)
        << ((BluetoothAddress >> (2 * 8)) & 0xff) << std::setw(2)
        << ((BluetoothAddress >> (1 * 8)) & 0xff) << std::setw(2)
        << ((BluetoothAddress >> (0 * 8)) & 0xff);
    return ret.str();
}

std::string toStr(GUID uuid)
{
    try
    {
        auto ref = winrt::Windows::Devices::Bluetooth::BluetoothUuidHelper::TryGetShortId(uuid);
        if (ref)
        {
            auto i = ref.Value();
            std::ostringstream ret;
            ret << std::hex << i;
            return ret.str();
        }
    }
    catch (...)
    {
    }
    RPC_CSTR szUuid = nullptr;
    if (::UuidToStringA(&uuid, &szUuid) == RPC_S_OK)
    {
        std::string ret((char*)szUuid);
        ::RpcStringFreeA(&szUuid);
        return ret;
    }
    return "invalid-guid";
}

#define SET_VAL(prop, val, str) \
    if ((prop & val) == val)    \
    {                           \
        arr.push_back(str);     \
    }

std::vector<std::string> toPropertyArray(GattCharacteristicProperties& properties)
{
    std::vector<std::string> arr;
    SET_VAL(properties, GattCharacteristicProperties::Broadcast, "broadcast")
    SET_VAL(properties, GattCharacteristicProperties::Read, "read")
    SET_VAL(properties, GattCharacteristicProperties::WriteWithoutResponse, "writeWithoutResponse")
    SET_VAL(properties, GattCharacteristicProperties::Write, "write")
    SET_VAL(properties, GattCharacteristicProperties::Notify, "notify")
    SET_VAL(properties, GattCharacteristicProperties::Indicate, "indicate")
    SET_VAL(properties, GattCharacteristicProperties::AuthenticatedSignedWrites,
            "authenticatedSignedWrites")
    SET_VAL(properties, GattCharacteristicProperties::ExtendedProperties, "extendedProperties")
    return arr;
}
