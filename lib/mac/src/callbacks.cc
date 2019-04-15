//
//  callbacks.cc
//  noble-mac-native
//
//  Created by Georg Vienna on 30.08.18.
//
#include "callbacks.h"

#include <napi-thread-safe-callback.hpp>

#define _s(val) Napi::String::New(env, val)
#define _b(val) Napi::Boolean::New(env, val)
#define _n(val) Napi::Number::New(env, val)
#define _u(str) toUuid(env, str)

Napi::String toUuid(Napi::Env& env, const std::string& uuid) {
    std::string str(uuid);
    str.erase(std::remove(str.begin(), str.end(), '-'), str.end());
    std::transform(str.begin(), str.end(), str.begin(), ::tolower);
    return _s(str);
}

Napi::String toAddressType(Napi::Env& env, const AddressType& type) {
    if(type == PUBLIC) {
        return _s("public");
    } else if (type == RANDOM) {
        return _s("random");
    }
    return _s("unknown");
}

Napi::Buffer<uint8_t> toBuffer(Napi::Env& env, const Data& data) {
    if (data.empty()) {
        return Napi::Buffer<uint8_t>::New(env, 0);
    }
    return Napi::Buffer<uint8_t>::Copy(env, &data[0], data.size());
}

Napi::Array toUuidArray(Napi::Env& env, const std::vector<std::string>& data) {
    if (data.empty()) {
        return Napi::Array::New(env);
    }
    auto arr = Napi::Array::New(env, data.size());
    for (size_t i = 0; i < data.size(); i++) {
        arr.Set(i, _u(data[i]));
    }
    return arr;
}

Napi::Array toArray(Napi::Env& env, const std::vector<std::string>& data) {
    if (data.empty()) {
        return Napi::Array::New(env);
    }
    auto arr = Napi::Array::New(env, data.size());
    for (size_t i = 0; i < data.size(); i++) {
        arr.Set(i, _s(data[i]));
    }
    return arr;
}

void Emit::Wrap(const Napi::Value& receiver, const Napi::Function& callback) {
    mCallback = std::make_shared<ThreadSafeCallback>(receiver, callback);
}

void Emit::RadioState(const std::string& state) {
    mCallback->call([state](Napi::Env env, std::vector<napi_value>& args) {
        // emit('stateChange', state);
        args = { _s("stateChange"), _s(state) };
    });
}

void Emit::ScanState(bool start) {
    mCallback->call([start](Napi::Env env, std::vector<napi_value>& args) {
        // emit('scanStart') emit('scanStop')
        args = { _s(start ? "scanStart" : "scanStop") };
    });
}

void Emit::Scan(const std::string& uuid, int rssi, const Peripheral& peripheral) {
    auto address = peripheral.address;
    auto addressType = peripheral.addressType;
    auto connectable = peripheral.connectable;
    auto name = peripheral.name;
    auto txPowerLevel = peripheral.txPowerLevel;
    auto manufacturerData = peripheral.manufacturerData;
    auto serviceData = peripheral.serviceData;
    auto serviceUuids = peripheral.serviceUuids;
    mCallback->call([uuid, rssi, address, addressType, connectable, name, txPowerLevel, manufacturerData, serviceData, serviceUuids](Napi::Env env, std::vector<napi_value>& args) {
        Napi::Object advertisment = Napi::Object::New(env);
        if (std::get<1>(name)) {
            advertisment.Set(_s("localName"), _s(std::get<0>(name)));
        }

        if (std::get<1>(txPowerLevel)) {
            advertisment.Set(_s("txPowerLevel"), std::get<0>(txPowerLevel));
        }

        if (std::get<1>(manufacturerData)) {
            advertisment.Set(_s("manufacturerData"), toBuffer(env, std::get<0>(manufacturerData)));
        }

        if (std::get<1>(serviceData)) {
            auto array = std::get<0>(serviceData).empty() ? Napi::Array::New(env) : Napi::Array::New(env, std::get<0>(serviceData).size());
            for (size_t i = 0; i < std::get<0>(serviceData).size(); i++) {
                Napi::Object data = Napi::Object::New(env);
                data.Set(_s("uuid"), _u(std::get<0>(serviceData)[i].first));
                data.Set(_s("data"), toBuffer(env, std::get<0>(serviceData)[i].second));
                array.Set(i, data);
            }
            advertisment.Set(_s("serviceData"), array);
        }

        if (std::get<1>(serviceUuids)) {
            advertisment.Set(_s("serviceUuids"), toUuidArray(env, std::get<0>(serviceUuids)));
        }
        // emit('discover', deviceUuid, address, addressType, connectable, advertisement, rssi);
        args = { _s("discover"), _u(uuid), _s(address), toAddressType(env, addressType), _b(connectable), advertisment, _n(rssi) };
    });
}

void Emit::Connected(const std::string& uuid, const std::string& error) {
    mCallback->call([uuid, error](Napi::Env env, std::vector<napi_value>& args) {
        // emit('connect', deviceUuid) error added here
        args = { _s("connect"), _u(uuid), error.empty() ? env.Null() : _s(error) };
    });
}

void Emit::Disconnected(const std::string& uuid) {
    mCallback->call([uuid](Napi::Env env, std::vector<napi_value>& args) {
        // emit('disconnect', deviceUuid);
        args = { _s("disconnect"), _u(uuid) };
    });
}

void Emit::RSSI(const std::string & uuid, int rssi) {
    mCallback->call([uuid, rssi](Napi::Env env, std::vector<napi_value>& args) {
        // emit('rssiUpdate', deviceUuid, rssi);
        args = { _s("rssiUpdate"), _u(uuid), _n(rssi) };
    });
}

void Emit::ServicesDiscovered(const std::string & uuid, const std::vector<std::string>& serviceUuids) {
    mCallback->call([uuid, serviceUuids](Napi::Env env, std::vector<napi_value>& args) {
        // emit('servicesDiscover', deviceUuid, serviceUuids)
        args = { _s("servicesDiscover"), _u(uuid), toUuidArray(env, serviceUuids) };
    });
}

void Emit::IncludedServicesDiscovered(const std::string & uuid, const std::string & serviceUuid, const std::vector<std::string>& serviceUuids) {
    mCallback->call([uuid, serviceUuid, serviceUuids](Napi::Env env, std::vector<napi_value>& args) {
        // emit('includedServicesDiscover', deviceUuid, serviceUuid, includedServiceUuids)
        args = { _s("includedServicesDiscover"), _u(uuid), _u(serviceUuid), toUuidArray(env, serviceUuids) };
    });
}

void Emit::CharacteristicsDiscovered(const std::string & uuid, const std::string & serviceUuid, const std::vector<std::pair<std::string, std::vector<std::string>>>& characteristics) {
    mCallback->call([uuid, serviceUuid, characteristics](Napi::Env env, std::vector<napi_value>& args) {
        auto arr = characteristics.empty() ? Napi::Array::New(env) : Napi::Array::New(env, characteristics.size());
        for (size_t i = 0; i < characteristics.size(); i++) {
            Napi::Object characteristic = Napi::Object::New(env);
            characteristic.Set(_s("uuid"), _u(characteristics[i].first));
            characteristic.Set(_s("properties"), toArray(env, characteristics[i].second));
            arr.Set(i, characteristic);
        }
        // emit('characteristicsDiscover', deviceUuid, serviceUuid, { uuid, properties: ['broadcast', 'read', ...]})
        args = { _s("characteristicsDiscover"), _u(uuid), _u(serviceUuid), arr };
    });
}

void Emit::Read(const std::string & uuid, const std::string & serviceUuid, const std::string & characteristicUuid, const Data& data, bool isNotification) {
    mCallback->call([uuid, serviceUuid, characteristicUuid, data, isNotification](Napi::Env env, std::vector<napi_value>& args) {
        // emit('read', deviceUuid, serviceUuid, characteristicsUuid, data, isNotification);
        args = { _s("read"), _u(uuid), _u(serviceUuid), _u(characteristicUuid), toBuffer(env, data), _b(isNotification) };
    });
}

void Emit::Write(const std::string & uuid, const std::string & serviceUuid, const std::string & characteristicUuid) {
    mCallback->call([uuid, serviceUuid, characteristicUuid](Napi::Env env, std::vector<napi_value>& args) {
        // emit('write', deviceUuid, servicesUuid, characteristicsUuid)
        args = { _s("write"), _u(uuid), _u(serviceUuid), _u(characteristicUuid) };
    });
}

void Emit::Notify(const std::string & uuid, const std::string & serviceUuid, const std::string & characteristicUuid, bool state) {
    mCallback->call([uuid, serviceUuid, characteristicUuid, state](Napi::Env env, std::vector<napi_value>& args) {
        // emit('notify', deviceUuid, servicesUuid, characteristicsUuid, state)
        args = { _s("notify"), _u(uuid), _u(serviceUuid), _u(characteristicUuid), _b(state) };
    });
}

void Emit::DescriptorsDiscovered(const std::string & uuid, const std::string & serviceUuid, const std::string & characteristicUuid, const std::vector<std::string>& descriptorUuids) {
    mCallback->call([uuid, serviceUuid, characteristicUuid, descriptorUuids](Napi::Env env, std::vector<napi_value>& args) {
        // emit('descriptorsDiscover', deviceUuid, servicesUuid, characteristicsUuid, descriptors: [uuids])
        args = { _s("descriptorsDiscover"), _u(uuid), _u(serviceUuid), _u(characteristicUuid), toUuidArray(env, descriptorUuids) };
    });
}

void Emit::ReadValue(const std::string & uuid, const std::string & serviceUuid, const std::string & characteristicUuid, const std::string& descriptorUuid, const Data& data) {
    mCallback->call([uuid, serviceUuid, characteristicUuid, descriptorUuid, data](Napi::Env env, std::vector<napi_value>& args) {
        // emit('valueRead', deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data)
        args = { _s("valueRead"), _u(uuid), _u(serviceUuid), _u(characteristicUuid), _u(descriptorUuid), toBuffer(env, data) };
    });
}

void Emit::WriteValue(const std::string & uuid, const std::string & serviceUuid, const std::string & characteristicUuid, const std::string& descriptorUuid) {
    mCallback->call([uuid, serviceUuid, characteristicUuid, descriptorUuid](Napi::Env env, std::vector<napi_value>& args) {
        // emit('valueWrite', deviceUuid, serviceUuid, characteristicUuid, descriptorUuid);
        args = { _s("valueWrite"), _u(uuid), _u(serviceUuid), _u(characteristicUuid), _u(descriptorUuid) };
    });
}

void Emit::ReadHandle(const std::string & uuid, int descriptorHandle, const Data& data) {
    mCallback->call([uuid, descriptorHandle, data](Napi::Env env, std::vector<napi_value>& args) {
        // emit('handleRead', deviceUuid, descriptorHandle, data);
        args = { _s("handleRead"), _u(uuid), _n(descriptorHandle), toBuffer(env, data) };
    });
}

void Emit::WriteHandle(const std::string & uuid, int descriptorHandle) {
    mCallback->call([uuid, descriptorHandle](Napi::Env env, std::vector<napi_value>& args) {
        // emit('handleWrite', deviceUuid, descriptorHandle);
        args = { _s("handleWrite"), _u(uuid), _n(descriptorHandle) };
    });
}
