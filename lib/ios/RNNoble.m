
#import "RNNoble.h"
#import <React/RCTLog.h>
#import "RCTCONVERT+CBUUID.h"

@implementation RNNoble

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(startScanning:(NSString *)name location:(NSString *)location)
{
	RCTLogInfo(@"startScanning %@ at %@", name, location);
}

RCT_EXPORT_METHOD(stopScanning)
{
	RCTLogInfo(@"stopScanning");
}

RCT_EXPORT_METHOD(getState)
{
	RCTLogInfo(@"getState");
}

RCT_EXPORT_METHOD(connect:(NSString *)peripheralUuid)
{
	RCTLogInfo(@"connect %@", peripheralUuid);
}

RCT_EXPORT_METHOD(disconnect:(NSString *)peripheralUuid)
{
	RCTLogInfo(@"disconnect %@", peripheralUuid);
}

RCT_EXPORT_METHOD(updateRssi:(NSString *)peripheralUuid)
{
	RCTLogInfo(@"updateRssi %@", peripheralUuid);
}

RCT_EXPORT_METHOD(discoverServices:(NSString *)peripheralUuid serviceUuids:(CBUUIDArray *)serviceUuids)
{
	RCTLogInfo(@"discoverServices %@", peripheralUuid);
}

RCT_EXPORT_METHOD(discoverIncludedServices:(NSString *)peripheralUuid serviceUuid:(NSString *)serviceUuid serviceUuids:(CBUUIDArray *)serviceUuids)
{
	RCTLogInfo(@"discoverIncludedServices %@", peripheralUuid);
}

RCT_EXPORT_METHOD(discoverCharacteristics:(NSString *)peripheralUuid serviceUuid:(NSString *)serviceUuid characteristicUuids:(CBUUIDArray *)characteristicUuids)
{
	RCTLogInfo(@"discoverCharacteristics %@", peripheralUuid);
}

RCT_EXPORT_METHOD(discoverDescriptors:(NSString *)peripheralUuid serviceUuid:(NSString *)serviceUuid characteristicUuid:(NSString *)characteristicUuid)
{
	RCTLogInfo(@"discoverDescriptors %@", peripheralUuid);
}

RCT_EXPORT_METHOD(read:(NSString *)peripheralUuid serviceUuid:(NSString *)serviceUuid characteristicUuid:(NSString *)characteristicUuid descriptorUuid:(NSString *)descriptorUuid)
{
	RCTLogInfo(@"read %@", peripheralUuid);
}

RCT_EXPORT_METHOD(readValue:(NSString *)peripheralUuid serviceUuid:(NSString *)serviceUuid characteristicUuid:(NSString *)characteristicUuid descriptorUuid:(NSString *)descriptorUuid)
{
	RCTLogInfo(@"readValue %@", peripheralUuid);
}

RCT_EXPORT_METHOD(read:(NSString *)peripheralUuid serviceUuid:(NSString *)serviceUuid characteristicUuid:(NSString *)characteristicUuid)
{
	RCTLogInfo(@"read %@", peripheralUuid);
}

RCT_EXPORT_METHOD(writeValue:(NSString *)peripheralUuid serviceUuid:(NSString *)serviceUuid characteristicUuid:(NSString *)characteristicUuid descriptorUuid:(NSString *)descriptorUuid data:(NSString *)data)
{
	RCTLogInfo(@"writeValue %@", peripheralUuid);
}

RCT_EXPORT_METHOD(write:(NSString *)peripheralUuid serviceUuid:(NSString *)serviceUuid characteristicUuid:(NSString *)characteristicUuid data:(NSString *)data withoutResponse:(BOOL)withoutResponse)
{
	RCTLogInfo(@"write %@", peripheralUuid);
}

RCT_EXPORT_METHOD(notify:(NSString *)peripheralUuid serviceUuid:(NSString *)serviceUuid characteristicUuid:(NSString *)characteristicUuid notify:(BOOL)notify)
{
	RCTLogInfo(@"notify %@", peripheralUuid);
}

@end
  