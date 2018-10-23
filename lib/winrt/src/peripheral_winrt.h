#pragma once

#include <napi.h>
#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#include <winrt/Windows.Devices.Bluetooth.Advertisement.h>

using namespace winrt::Windows::Devices::Bluetooth::Advertisement;
using winrt::Windows::Devices::Bluetooth::BluetoothLEDevice;
using winrt::Windows::Devices::Bluetooth::GenericAttributeProfile::GattCharacteristic;
using winrt::Windows::Devices::Bluetooth::GenericAttributeProfile::GattDescriptor;
using winrt::Windows::Devices::Bluetooth::GenericAttributeProfile::GattDeviceService;

#include "winrt/Windows.Devices.Bluetooth.h"

#include <string>
#include <optional>

#include "peripheral.h"

namespace std
{
    template <> struct hash<UUID>
    {
        std::size_t operator()(const UUID& k) const;
    };
}

class CachedCharacteristic
{
public:
    CachedCharacteristic() = default;
    CachedCharacteristic(GattCharacteristic& c) : characteristic(c)
    {
    }

    GattCharacteristic characteristic = nullptr;
    std::unordered_map<UUID, GattDescriptor> descriptors;
};

class CachedService
{
public:
    CachedService() = default;
    CachedService(GattDeviceService& s) : service(s)
    {
    }

    GattDeviceService service = nullptr;
    std::unordered_map<UUID, CachedCharacteristic> characterisitics;
};

class PeripheralWinrt : public Peripheral
{
public:
    PeripheralWinrt() = default;
    PeripheralWinrt(uint64_t bluetoothAddress, BluetoothLEAdvertisementType advertismentType,
                    int rssiValue, const BluetoothLEAdvertisement& advertisment);
    ~PeripheralWinrt();

    void Update(int rssiValue, const BluetoothLEAdvertisement& advertisment);

    void Disconnect();

    void GetService(UUID serviceUuid,
                    std::function<void(std::optional<GattDeviceService>)> callback);
    void GetCharacteristic(UUID serviceUuid, UUID characteristicUuid,
                           std::function<void(std::optional<GattCharacteristic>)> callback);
    void GetDescriptor(UUID serviceUuid, UUID characteristicUuid, UUID descriptorUuid,
                       std::function<void(std::optional<GattDescriptor>)> callback);

    int rssi;
    uint64_t bluetoothAddress;
    std::optional<BluetoothLEDevice> device;
    winrt::event_token connectionToken;

private:
    void GetServiceFromDevice(UUID serviceUuid,
                              std::function<void(std::optional<GattDeviceService>)> callback);
    void
    GetCharacteristicFromService(GattDeviceService service, UUID characteristicUuid,
                                 std::function<void(std::optional<GattCharacteristic>)> callback);
    void
    GetDescriptorFromCharacteristic(GattCharacteristic characteristic, UUID descriptorUuid,
                                    std::function<void(std::optional<GattDescriptor>)> callback);
    std::unordered_map<UUID, CachedService> cachedServices;
};
