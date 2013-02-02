#import <objc/runtime.h>

#import "BLEManager.h"

#define UNUSED(x) ( (void)(x) )

@interface CBUUID (String)

- (NSString *)string;

@end

@implementation CBUUID (String)

- (NSString *)string
{
  const unsigned char *uuidBytes = (const unsigned char *)self.data.bytes;

  return [NSString stringWithFormat:@"%.2X%.2X%.2X%.2X-%.2X%.2X-%.2X%.2X-%.2X%.2X-%.2X%.2X%.2X%.2X%.2X%.2X",
                              uuidBytes[0], uuidBytes[1], uuidBytes[2], uuidBytes[3],
                              uuidBytes[4], uuidBytes[5],
                              uuidBytes[6], uuidBytes[7],
                              uuidBytes[8], uuidBytes[9], uuidBytes[10], uuidBytes[11], uuidBytes[12], uuidBytes[13], uuidBytes[14], uuidBytes[15]];
}

@end

//
// class-dump /System/Library/Frameworks/IOBluetooth.framework/Frameworks/CoreBluetooth.framework/
//
// @interface CBConcreteCentralManager : CBCentralManager
// {
//     struct _xpc_connection_s *_xpcConnection;
//     NSMutableDictionary *_peripherals;
// }
//

@implementation BLEManager 

@synthesize centralManager = _centralManager;

- (id)initWithNoble:(Noble *)noble
{
  self = [super init];
  if (self) {
    _noble = noble;
    self.centralManager = [[CBCentralManager alloc] initWithDelegate:self queue:nil];

    // get the private _xpcConnection instance var from the centralManager
    xpc_connection_t xpcConnnection = NULL;
    object_getInstanceVariable(self.centralManager , "_xpcConnection", (void**)&xpcConnnection);
    
    // create a new dispatch queue for it
    _dispatchQueue = dispatch_queue_create(xpc_connection_get_name(xpcConnnection), 0);

    // assign the dispatch queue to the XPC connection
    xpc_connection_set_target_queue(xpcConnnection, _dispatchQueue);

    // let the run loop run for a bit
    [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate distantFuture]];
  }

  return self;
}

- (void)startScanning
{
  NSDictionary *options = [NSDictionary dictionaryWithObject:[NSNumber numberWithBool:YES] forKey:CBCentralManagerScanOptionAllowDuplicatesKey];

  [self.centralManager scanForPeripheralsWithServices:nil options:options];
}

- (void)stopScanning
{
  [self.centralManager stopScan];
}

- (void)dealloc
{
  self.centralManager = nil;

  dispatch_release(_dispatchQueue);

  [super dealloc];
}

- (void)centralManager:(CBCentralManager *)central didConnectPeripheral:(CBPeripheral *)peripheral
{
  UNUSED(central);
  NSLog(@"didConnectPeripheral: %@", peripheral);
}

- (void)centralManager:(CBCentralManager *)central didDisconnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error
{
  UNUSED(central);
  NSLog(@"didDisconnectPeripheral: %@ %@", peripheral, error);
}

- (void)centralManager:(CBCentralManager *)central didDiscoverPeripheral:(CBPeripheral *)peripheral 
    advertisementData:(NSDictionary *)advertisementData RSSI:(NSNumber *)RSSI
{
  UNUSED(central);

  std::string localName = "";
  if ([advertisementData objectForKey:CBAdvertisementDataLocalNameKey]) {
    localName =  [[advertisementData objectForKey:CBAdvertisementDataLocalNameKey] cStringUsingEncoding:NSASCIIStringEncoding];
  }
  std::vector<std::string> services;
  int rssi = [RSSI intValue];

  for (CBUUID *uuid in [advertisementData objectForKey:CBAdvertisementDataServiceUUIDsKey]) {
    std::string service = [[uuid string] cStringUsingEncoding:NSASCIIStringEncoding];
    services.push_back(service);
  }

  _noble->peripheralDiscovered(new Noble::Peripheral(localName, services, rssi));
}

- (void)centralManager:(CBCentralManager *)central didFailToConnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error
{
  UNUSED(central);
  NSLog(@"didFailToConnectPeripheral: %@ %@", peripheral, error);
}

- (void)centralManager:(CBCentralManager *)central didRetrieveConnectedPeripherals:(NSArray *)peripherals
{
  UNUSED(central);
  NSLog(@"didRetrieveConnectedPeripherals: %@", peripherals);
}

- (void)centralManager:(CBCentralManager *)central didRetrievePeripherals:(NSArray *)peripherals
{
  UNUSED(central);
  NSLog(@"didRetrievePeripherals: %@", peripherals);
}

- (void)centralManagerDidUpdateState:(CBCentralManager *)central
{
  UNUSED(central);

  Noble::State state;;

  switch(self.centralManager.state) {
    case CBCentralManagerStateResetting:
      state = Noble::StateResetting;
      break;

    case CBCentralManagerStateUnsupported:
      state = Noble::StateUnsupported;
      break;

    case CBCentralManagerStateUnauthorized:
      state = Noble::StateUnauthorized;
      break;

    case CBCentralManagerStatePoweredOff:
      state = Noble::StatePoweredOff;
      break;

    case CBCentralManagerStatePoweredOn:
      state = Noble::StatePoweredOn;
      break;

    default:
    case CBCentralManagerStateUnknown:
      state = Noble::StateUnknown;
      break;
  }

  _noble->updateState(state);
}

@end

