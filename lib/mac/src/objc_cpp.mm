//
//  objc_cpp.mm
//  noble-mac-native
//
//  Created by Georg Vienna on 30.08.18.
//
#include "objc_cpp.h"

#if defined(MAC_OS_X_VERSION_10_13)
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability"
std::string stateToString(CBManagerState state)
{
    switch(state) {
        case CBManagerStatePoweredOff:
            return "poweredOff";
        case CBManagerStatePoweredOn:
            return "poweredOn";
        case CBManagerStateResetting:
            return "resetting";
        case CBManagerStateUnauthorized:
            return "unauthorized";
        case CBManagerStateUnknown:
            return "unknown";
        case CBManagerStateUnsupported:
            return "unsupported";
    }
    return "unknown";
}
#pragma clang diagnostic pop

// In the 10.13 SDK, CBPeripheral became a subclass of CBPeer, which defines
// -[CBPeer identifier] as partially available. Pretend it still exists on
// CBPeripheral. At runtime the implementation on CBPeer will be invoked.
@interface CBPeripheral (HighSierraSDK)
@property(readonly, nonatomic) NSUUID* identifier;
@end
#else
std::string stateToString(CBCentralManagerState state)
{
    switch(state) {
        case CBCentralManagerStatePoweredOff:
            return "poweredOff";
        case CBCentralManagerStatePoweredOn:
            return "poweredOn";
        case CBCentralManagerStateResetting:
            return "resetting";
        case CBCentralManagerStateUnauthorized:
            return "unauthorized";
        case CBCentralManagerStateUnknown:
            return "unknown";
        case CBCentralManagerStateUnsupported:
            return "unsupported";
    }
    return "unknown";
}
#endif

std::string getUuid(CBPeripheral* peripheral) {
    return std::string([peripheral.identifier.UUIDString UTF8String]);
}

std::string getAddress(std::string uuid, AddressType* addressType) {
    NSString* deviceUuid = [[NSString alloc] initWithCString:uuid.c_str() encoding:NSASCIIStringEncoding];
    IF(NSDictionary*, plist, [NSDictionary dictionaryWithContentsOfFile:@"/Library/Preferences/com.apple.Bluetooth.plist"]) {
        IF(NSDictionary*, cache, [plist objectForKey:@"CoreBluetoothCache"]) {
            IF(NSDictionary*, entry, [cache objectForKey:deviceUuid]) {
                IF(NSNumber*, type, [entry objectForKey:@"DeviceAddressType"]) {
                    *addressType = [type boolValue] ? RANDOM : PUBLIC;
                }
                IF(NSString*, address, [entry objectForKey:@"DeviceAddress"]) {
                    return [address UTF8String];
                }
            }
        }
    }
    return "";
}

std::vector<std::string> getServices(NSArray<CBService*>* services) {
    std::vector<std::string> result;
    if(services) {
        for (CBService* service in services) {
            result.push_back([[service.UUID UUIDString] UTF8String]);
        }
    }
    return result;
}

#define TEST_PROP(type, str) if((characteristic.properties & type) == type) { properties.push_back(str); }

std::vector<std::pair<std::string, std::vector<std::string>>> getCharacteristics(NSArray<CBCharacteristic*>* characteristics) {
    std::vector<std::pair<std::string, std::vector<std::string>>> result;
    if(characteristics) {
        for (CBCharacteristic* characteristic in characteristics) {
            auto uuid = [[characteristic.UUID UUIDString] UTF8String];
            auto properties = std::vector<std::string>();
            TEST_PROP(CBCharacteristicPropertyBroadcast, "broadcast");
            TEST_PROP(CBCharacteristicPropertyRead, "read");
            TEST_PROP(CBCharacteristicPropertyWriteWithoutResponse, "writeWithoutResponse");
            TEST_PROP(CBCharacteristicPropertyWrite, "write");
            TEST_PROP(CBCharacteristicPropertyNotify, "notify");
            TEST_PROP(CBCharacteristicPropertyIndicate, "indicate");
            TEST_PROP(CBCharacteristicPropertyAuthenticatedSignedWrites, "authenticatedSignedWrites");
            TEST_PROP(CBCharacteristicPropertyExtendedProperties, "extendedProperties");
            TEST_PROP(CBCharacteristicPropertyNotifyEncryptionRequired, "notifyEncryptionRequired");
            TEST_PROP(CBCharacteristicPropertyIndicateEncryptionRequired, "indicateEncryptionRequired");
            result.push_back(std::make_pair(uuid, properties));
        }
    }
    return result;
}

std::vector<std::string> getDescriptors(NSArray<CBDescriptor*>* descriptors) {
    std::vector<std::string> result;
    if(descriptors) {
        for (CBDescriptor* descriptor in descriptors) {
            result.push_back([[descriptor.UUID UUIDString] UTF8String]);
        }
    }
    return result;
}
