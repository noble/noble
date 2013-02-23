#import <Foundation/Foundation.h>
#import <IOBluetooth/IOBluetooth.h>

@interface CBCentralManager (Concrete)

@property (nonatomic, readonly) xpc_connection_t xpcConnection;
@property (nonatomic, readonly) NSArray *peripherals;

@end