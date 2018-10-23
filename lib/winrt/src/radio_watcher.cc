//
//  radio_watcher.cc
//  noble-winrt-native
//
//  Created by Georg Vienna on 07.09.18.
//

#pragma once

#include "radio_watcher.h"
#include "winrt_cpp.h"

using winrt::Windows::Devices::Radios::RadioKind;
using winrt::Windows::Foundation::AsyncStatus;

template <typename O, typename M, class... Types> auto bind2(O* object, M method, Types&... args)
{
    return std::bind(method, object, std::placeholders::_1, std::placeholders::_2, args...);
}

#define RADIO_INTERFACE_CLASS_GUID \
    L"System.Devices.InterfaceClassGuid:=\"{A8804298-2D5F-42E3-9531-9C8C39EB29CE}\""

RadioWatcher::RadioWatcher()
    : mRadio(nullptr), watcher(DeviceInformation::CreateWatcher(RADIO_INTERFACE_CLASS_GUID))
{
    mAddedRevoker = watcher.Added(winrt::auto_revoke, bind2(this, &RadioWatcher::OnAdded));
    mUpdatedRevoker = watcher.Updated(winrt::auto_revoke, bind2(this, &RadioWatcher::OnUpdated));
    mRemovedRevoker = watcher.Removed(winrt::auto_revoke, bind2(this, &RadioWatcher::OnRemoved));
    auto completed = bind2(this, &RadioWatcher::OnCompleted);
    mCompletedRevoker = watcher.EnumerationCompleted(winrt::auto_revoke, completed);
}

void RadioWatcher::Start(std::function<void(Radio& radio)> on)
{
    radioStateChanged = on;
    inEnumeration = true;
    initialDone = false;
    initialCount = 0;
    watcher.Start();
}

IAsyncOperation<Radio> RadioWatcher::GetRadios(std::set<winrt::hstring> ids)
{
    Radio bluetooth = nullptr;
    for (auto id : ids)
    {
        try
        {
            auto radio = co_await Radio::FromIdAsync(id);
            if (radio && radio.Kind() == RadioKind::Bluetooth)
            {
                bluetooth = radio;
            }
        }
        catch (...)
        {
            // Radio::RadioFromAsync throws if the device is not available (unplugged)
        }
    }
    return bluetooth;
}

void RadioWatcher::OnRadioChanged()
{
    GetRadios(radioIds).Completed([=](auto&& asyncOp, auto&& status) {
        if (status == AsyncStatus::Completed)
        {
            Radio radio = asyncOp.GetResults();
            // !radio: to handle if there is no radio
            if (!radio || radio != mRadio)
            {
                if (radio)
                {
                    radio.StateChanged([=](Radio radio, auto&&) { radioStateChanged(radio); });
                }
                radioStateChanged(radio);
                mRadio = radio;
            }
        }
    });
}

void RadioWatcher::OnAdded(DeviceWatcher watcher, DeviceInformation info)
{
    radioIds.insert(info.Id());
    if (!inEnumeration)
    {
        OnRadioChanged();
    }
}

void RadioWatcher::OnUpdated(DeviceWatcher watcher, DeviceInformationUpdate info)
{
    OnRadioChanged();
}

void RadioWatcher::OnRemoved(DeviceWatcher watcher, DeviceInformationUpdate info)
{
    radioIds.erase(info.Id());
    OnRadioChanged();
}

void RadioWatcher::OnCompleted(DeviceWatcher watcher, IInspectable info)
{
    inEnumeration = false;
    OnRadioChanged();
}
