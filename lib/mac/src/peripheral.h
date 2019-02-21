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
    std::string name;
    int txPowerLevel;
    Data manufacturerData;
    std::vector<std::pair<std::string, Data>> serviceData;
    std::vector<std::string> serviceUuids;
};
