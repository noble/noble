//
//  notify_map.h
//  noble-winrt-native
//
//  Created by Georg Vienna on 07.09.18.
//

#pragma once

#include <winrt/Windows.Devices.Bluetooth.GenericAttributeProfile.h>

using namespace winrt::Windows::Devices::Bluetooth::GenericAttributeProfile;

struct Key
{
public:
    std::string uuid;
    UUID serviceUuid;
    UUID characteristicUuid;

    bool operator==(const Key& other) const;
};

namespace std
{
    template <> struct hash<Key>
    {
        std::size_t operator()(const Key& k) const
        {
            RPC_STATUS status;
            auto serviceHash = UuidHash((UUID*)&k.serviceUuid, &status);
            auto characteristicHash = UuidHash((UUID*)&k.characteristicUuid, &status);

            return ((std::hash<std::string>()(k.uuid) ^ (serviceHash << 1)) >> 1) ^
                (characteristicHash << 1);
        }
    };
}  // namespace std

class NotifyMap
{
public:
    void Add(std::string uuid, GattCharacteristic characteristic, winrt::event_token token);
    bool IsSubscribed(std::string uuid, GattCharacteristic characteristic);
    void Unsubscribe(std::string uuid, GattCharacteristic characteristic);

    void Remove(std::string uuid);

private:
    std::unordered_map<Key, winrt::event_token> mNotifyMap;
};
