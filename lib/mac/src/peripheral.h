#pragma once

using Data = std::vector<uint8_t>;

enum AddressType {
    PUBLIC,
    RANDOM,
    UNKNOWN,
};

class Peripheral {
public:
    Peripheral() : address("unknown"), addressType(UNKNOWN), connectable(false) {
    }
    std::string address;
    AddressType addressType;
    bool connectable;
    std::pair<std::string, bool> name;
    std::pair<int, bool> txPowerLevel;
    std::pair<Data, bool> manufacturerData;
    std::pair<std::vector<std::pair<std::string, Data>>, bool> serviceData;
    std::pair<std::vector<std::string>, bool> serviceUuids;
};
