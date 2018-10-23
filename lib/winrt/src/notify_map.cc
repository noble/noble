//
//  notify_map.cc
//  noble-winrt-native
//
//  Created by Georg Vienna on 07.09.18.
//

#include "notify_map.h"

bool Key::operator==(const Key& other) const
{
    return (uuid == other.uuid && serviceUuid == other.serviceUuid &&
            characteristicUuid == other.characteristicUuid);
}

void NotifyMap::Add(std::string uuid, GattCharacteristic characteristic, winrt::event_token token)
{
    Key key = { uuid, characteristic.Service().Uuid(), characteristic.Uuid() };
    mNotifyMap.insert(std::make_pair(key, token));
}

bool NotifyMap::IsSubscribed(std::string uuid, GattCharacteristic characteristic)
{
    Key key = { uuid, characteristic.Service().Uuid(), characteristic.Uuid() };
    return mNotifyMap.find(key) != mNotifyMap.end();
}

void NotifyMap::Unsubscribe(std::string uuid, GattCharacteristic characteristic)
{
    Key key = { uuid, characteristic.Service().Uuid(), characteristic.Uuid() };
    auto& it = mNotifyMap.find(key);
    if (it == mNotifyMap.end())
    {
        printf("trying to unsubscribe without subscribing first\n");
        return;
    }
    auto& token = it->second;
    characteristic.ValueChanged(token);
    mNotifyMap.erase(key);
}

void NotifyMap::Remove(std::string uuid)
{
    for (auto it = mNotifyMap.begin(); it != mNotifyMap.end();)
    {
        auto& key = it->first;
        if (key.uuid == uuid)
        {
            it = mNotifyMap.erase(it);
        }
        else
        {
            it++;
        }
    }
}
