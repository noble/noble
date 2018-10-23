#pragma once

#include <string>
#include <vector>
#import <Foundation/Foundation.h>
#import <CoreBluetooth/CoreBluetooth.h>
#include "peripheral.h"

#define IF(type, var, code) type var = code; if(var)

#if defined(MAC_OS_X_VERSION_10_13)
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability"
    std::string stateToString(CBManagerState state);
#pragma clang diagnostic pop
#else
    std::string stateToString(CBCentralManagerState state);
#endif


std::string getUuid(CBPeripheral* peripheral);
std::string getAddress(std::string uuid, AddressType* addressType);
std::vector<std::string> getServices(NSArray<CBService*>* services);
std::vector<std::pair<std::string, std::vector<std::string>>> getCharacteristics(NSArray<CBCharacteristic*>* characteristics);
std::vector<std::string> getDescriptors(NSArray<CBDescriptor*>* descriptors);
