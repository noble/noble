#include "Peripheral.h"

Peripheral::Peripheral(std::string uuid, std::string localName, std::vector<std::string> services, int rssi) :
  uuid(uuid), localName(localName), services(services), rssi(rssi)
{

}

Peripheral::~Peripheral() {

}