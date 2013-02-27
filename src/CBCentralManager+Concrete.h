#import <Foundation/Foundation.h>
#import <IOBluetooth/IOBluetooth.h>
#include <xpc/xpc.h>

@interface CBCentralManager (Concrete)

@property (nonatomic, readonly) xpc_connection_t xpcConnection;
@property (nonatomic, readonly) NSArray *peripherals;

@end
