#pragma once

#include <napi.h>
#import <Foundation/Foundation.h>

NSArray* getUuidArray(const Napi::Value& value);
BOOL getBool(const Napi::Value& value, BOOL def);

NSString* napiToUuidString(Napi::String string);
NSArray* napiToUuidArray(Napi::Array array);
NSData* napiToData(Napi::Buffer<Byte> buffer);
NSNumber* napiToNumber(Napi::Number number);
