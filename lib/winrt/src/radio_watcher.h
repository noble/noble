//
//  radio_watcher.h
//  noble-winrt-native
//
//  Created by Georg Vienna on 07.09.18.
//

#pragma once

#include <set>
#include <winrt/Windows.Devices.Enumeration.h>
#include <winrt/Windows.Devices.Radios.h>

using namespace winrt::Windows::Devices::Enumeration;

using winrt::Windows::Devices::Radios::Radio;
using winrt::Windows::Devices::Radios::RadioState;
using winrt::Windows::Foundation::IAsyncOperation;
using winrt::Windows::Foundation::IInspectable;

enum class AdapterState : int32_t
{
    Initial = -2,
    Unsupported = -1,
    Unknown = (int32_t)RadioState::Unknown,
    On = (int32_t)RadioState::On,
    Off = (int32_t)RadioState::Off,
    Disabled = (int32_t)RadioState::Disabled,
};

class RadioWatcher
{
public:
    RadioWatcher();

    void Start(std::function<void(Radio& radio)> on);

private:
    IAsyncOperation<Radio> GetRadios(std::set<winrt::hstring> ids);

    void OnRadioChanged();
    void OnAdded(DeviceWatcher watcher, DeviceInformation info);
    void OnUpdated(DeviceWatcher watcher, DeviceInformationUpdate info);
    void OnRemoved(DeviceWatcher watcher, DeviceInformationUpdate info);
    void OnCompleted(DeviceWatcher watcher, IInspectable info);

    DeviceWatcher watcher;
    winrt::event_revoker<IDeviceWatcher> mAddedRevoker;
    winrt::event_revoker<IDeviceWatcher> mUpdatedRevoker;
    winrt::event_revoker<IDeviceWatcher> mRemovedRevoker;
    winrt::event_revoker<IDeviceWatcher> mCompletedRevoker;
    bool inEnumeration;
    bool initialDone;
    int initialCount;
    std::set<winrt::hstring> radioIds;
    Radio mRadio;
    std::function<void(Radio& radio)> radioStateChanged;
};
