#import "CBUUID+String.h"

@implementation CBUUID (String)

- (NSString *)string
{
  const unsigned char *uuidBytes = (const unsigned char *)self.data.bytes;

  if (self.data.length == 2) {
    return [NSString stringWithFormat:@"%.2X%.2X", uuidBytes[0], uuidBytes[1]];
  } else {
    return [NSString stringWithFormat:@"%.2X%.2X%.2X%.2X-%.2X%.2X-%.2X%.2X-%.2X%.2X-%.2X%.2X%.2X%.2X%.2X%.2X",
                              uuidBytes[0], uuidBytes[1], uuidBytes[2], uuidBytes[3],
                              uuidBytes[4], uuidBytes[5],
                              uuidBytes[6], uuidBytes[7],
                              uuidBytes[8], uuidBytes[9], uuidBytes[10], uuidBytes[11], uuidBytes[12], uuidBytes[13], uuidBytes[14], uuidBytes[15]];
  }
}

@end