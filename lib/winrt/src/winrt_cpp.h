#pragma once

#include <winrt/Windows.Devices.Bluetooth.GenericAttributeProfile.h>

using winrt::Windows::Devices::Bluetooth::GenericAttributeProfile::GattCharacteristicProperties;

std::string ws2s(const wchar_t* wstr);
std::string formatBluetoothAddress(unsigned long long BluetoothAddress);
std::string formatBluetoothUuid(unsigned long long BluetoothAddress);
std::string toStr(GUID uuid);
std::vector<std::string> toPropertyArray(GattCharacteristicProperties& properties);
