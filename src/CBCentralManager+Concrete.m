#import <objc/runtime.h>

#import "CBCentralManager+Concrete.h"

//
// class-dump /System/Library/Frameworks/IOBluetooth.framework/Frameworks/CoreBluetooth.framework/
//
// @interface CBConcreteCentralManager : CBCentralManager
// {
//     struct _xpc_connection_s *_xpcConnection;
//     NSMutableDictionary *_peripherals;
// }
//

@implementation CBCentralManager (Concrete)

- (xpc_connection_t)xpcConnection
{
	// get the private _xpcConnection instance var from the centralManager
    xpc_connection_t xpcConnnection = NULL;
    object_getInstanceVariable(self, "_xpcConnection", (void**)&xpcConnnection);

    return xpcConnnection;
}

- (NSArray *)peripherals
{
	// get the private _peripherals instance var from the centralManager
    NSDictionary *peripherals = nil;

    object_getInstanceVariable(self, "_peripherals", (void**)&peripherals);

    return [peripherals allValues];
}

@end