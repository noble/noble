#import "CBUUID+String.h"
#import "CBCentralManager+Concrete.h"
#import "CBPeripheral+String.h"

#import "BLEManager.h"

#define UNUSED(x) ( (void)(x) )

@implementation BLEManager 

@synthesize centralManager = _centralManager;
@synthesize peripherals = _peripherals;

- (id)initWithNoble:(Noble *)noble
{
  self = [super init];
  if (self) {
    _noble = noble;
    self.centralManager = [[CBCentralManager alloc] initWithDelegate:self queue:nil];
    self.peripherals = [[NSMutableDictionary alloc] init];

    xpc_connection_t xpcConnnection = self.centralManager.xpcConnection;
    
    // create a new dispatch queue for it
    _dispatchQueue = dispatch_queue_create(xpc_connection_get_name(xpcConnnection), 0);

    // assign the dispatch queue to the XPC connection
    xpc_connection_set_target_queue(xpcConnnection, _dispatchQueue);

    // let the run loop run for a bit
    [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate distantFuture]];
  }

  return self;
}

- (void)startScanningForServices:(std::vector<std::string>)services allowDuplicates:(bool)allowDuplicates
{
  NSMutableArray *serviceUUIDs = [[NSMutableArray alloc] init];
  for (size_t i = 0; i < services.size(); i++) {
    NSString *serviceUUID = [NSString stringWithCString:services[i].c_str() encoding:NSASCIIStringEncoding];
    CBUUID *uuid = [CBUUID UUIDWithString:serviceUUID];

    [serviceUUIDs addObject:uuid];
  }

  NSMutableDictionary *options = [[NSMutableDictionary alloc] init];
  if (allowDuplicates) {
    [options setObject:[NSNumber numberWithBool:YES] forKey:CBCentralManagerScanOptionAllowDuplicatesKey];
  }

  [self.centralManager scanForPeripheralsWithServices:serviceUUIDs options:options];

  [options release];
  [serviceUUIDs release];
}

- (void)stopScanning
{
  [self.centralManager stopScan];
}

- (void)connectPeripheral:(std::string) uuid
{
  CBPeripheral *peripheral = [self.peripherals objectForKey:[NSString stringWithCString:uuid.c_str() encoding:NSASCIIStringEncoding]];

  NSMutableDictionary *options = [[NSMutableDictionary alloc] init];
  [options setObject:[NSNumber numberWithBool:YES] forKey:CBConnectPeripheralOptionNotifyOnDisconnectionKey];
  
  [self.centralManager connectPeripheral:peripheral options:options];

  [options release];
}

- (void)disconnectPeripheral:(std::string) uuid
{
  CBPeripheral *peripheral = [self.peripherals objectForKey:[NSString stringWithCString:uuid.c_str() encoding:NSASCIIStringEncoding]];

  [self.centralManager cancelPeripheralConnection:peripheral];
}

- (void)dealloc
{
  self.peripherals = nil;
  self.centralManager = nil;

  dispatch_release(_dispatchQueue);

  [super dealloc];
}

- (void)centralManager:(CBCentralManager *)central didConnectPeripheral:(CBPeripheral *)peripheral
{
  UNUSED(central);
  std::string uuid = [[peripheral uuid] cStringUsingEncoding:NSASCIIStringEncoding];

  _noble->peripheralConnected(uuid);
}

- (void)centralManager:(CBCentralManager *)central didDisconnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error
{
  UNUSED(central);
  std::string uuid = [[peripheral uuid] cStringUsingEncoding:NSASCIIStringEncoding];

  _noble->peripheralDisconnected(uuid);
}

- (void)centralManager:(CBCentralManager *)central didDiscoverPeripheral:(CBPeripheral *)peripheral 
    advertisementData:(NSDictionary *)advertisementData RSSI:(NSNumber *)RSSI
{
  UNUSED(central);

  std::string localName = "";
  if ([advertisementData objectForKey:CBAdvertisementDataLocalNameKey]) {
    localName =  [[advertisementData objectForKey:CBAdvertisementDataLocalNameKey] cStringUsingEncoding:NSASCIIStringEncoding];
  }

  std::string uuid = [[peripheral uuid] cStringUsingEncoding:NSASCIIStringEncoding];

  std::vector<std::string> services;
  int rssi = [RSSI intValue];

  for (CBUUID *uuid in [advertisementData objectForKey:CBAdvertisementDataServiceUUIDsKey]) {
    std::string service = [[uuid string] cStringUsingEncoding:NSASCIIStringEncoding];
    services.push_back(service);
  }

  [self.peripherals setObject:peripheral forKey:[peripheral uuid]];

  _noble->peripheralDiscovered(uuid, localName, services, rssi);
}

- (void)centralManager:(CBCentralManager *)central didFailToConnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error
{
  UNUSED(central);

  UNUSED(central);
  std::string uuid = [[peripheral uuid] cStringUsingEncoding:NSASCIIStringEncoding];
  std::string reason = [[error localizedDescription] cStringUsingEncoding:NSASCIIStringEncoding];

  _noble->peripheralConnectFailure(uuid, reason);
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

