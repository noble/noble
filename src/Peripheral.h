#include <string>
#include <vector>

#ifndef __PERIPHERAL_H__
#define __PERIPHERAL_H__

class Peripheral {
  public:
    Peripheral(std::string uuid, std::string localName, std::vector<std::string> services, int rssi);
    ~Peripheral();

    std::string uuid;
    std::string localName;
    std::vector<std::string> services;
    int rssi;
};

#endif