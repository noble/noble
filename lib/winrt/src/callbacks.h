#pragma once

#include <napi.h>
#include "peripheral.h"

class ThreadSafeCallback;

class Emit
{
public:
    // clang-format off
    void Wrap(const Napi::Value& receiver, const Napi::Function& callback);
    void RadioState(const std::string& status);
    void ScanState(bool start);
    void Scan(const std::string& uuid, int rssi, const Peripheral& peripheral);
    void Connected(const std::string& uuid, const std::string& error = "");
    void Disconnected(const std::string& uuid);
    void RSSI(const std::string& uuid, int rssi);
    void ServicesDiscovered(const std::string& uuid, const std::vector<std::string>& serviceUuids);
    void IncludedServicesDiscovered(const std::string& uuid, const std::string& serviceUuid, const std::vector<std::string>& serviceUuids);
    void CharacteristicsDiscovered(const std::string& uuid, const std::string& serviceUuid, const std::vector<std::pair<std::string, std::vector<std::string>>>& characteristics);
    void Read(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid, const Data& data, bool isNotification);
    void Write(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid);
    void Notify(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid, bool state);
    void DescriptorsDiscovered(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid, const std::vector<std::string>& descriptorUuids);
    void ReadValue(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid, const std::string& descriptorUuid, const Data& data);
    void WriteValue(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid, const std::string& descriptorUuid);
    void ReadHandle(const std::string& uuid, int descriptorHandle, const Data& data);
    void WriteHandle(const std::string& uuid, int descriptorHandle);
    // clang-format on
protected:
    std::shared_ptr<ThreadSafeCallback> mCallback;
};
