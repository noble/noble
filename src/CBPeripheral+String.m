#import "CBPeripheral+String.h"

@implementation CBPeripheral (String)

- (NSString *)uuid
{
  CFStringRef uuidStringRef = CFUUIDCreateString(NULL, [self UUID]);
  NSString* uuid = [NSString stringWithFormat:@"%@", (NSString *)uuidStringRef];
  CFRelease(uuidStringRef);

  return uuid;
}

@end