#import <Foundation/Foundation.h>
#import <IOBluetooth/IOBluetooth.h>

#include "Noble.h"

@interface BLEManager : NSObject <CBCentralManagerDelegate> {
  dispatch_queue_t _dispatchQueue;
  Noble *_noble;
}

- (id)initWithNoble:(Noble *)noble;
- (void)startScanning;
- (void)stopScanning;

@end

@interface BLEManager () 

@property (nonatomic, retain) CBCentralManager *centralManager;

@end