#pragma once

#include <napi.h>
#include "winrt/base.h"
#include "peripheral.h"

std::vector<UUID> getUuidArray(const Napi::Value& value);
bool getBool(const Napi::Value& value, bool def);

UUID napiToUuid(Napi::String string);
Data napiToData(Napi::Buffer<byte> buffer);
int napiToNumber(Napi::Number number);
