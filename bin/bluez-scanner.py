#!/usr/bin/python

from gi.repository import GObject

import sys

import dbus
import dbus.mainloop.glib

def device_found(address, properties):
	name = ""
	uuids = ""
	rssi = properties["RSSI"]

	if "Name" in properties:
		name = properties["Name"]

	if ("UUIDs" in properties):
		for uuid in (properties["UUIDs"]):
			uuids += ("%s " % uuid)

	print("DeviceFound: Address = %s, Name = %s, RSSI = %d, UUIDs = %s" % (address, name, rssi, uuids.strip()))

def property_changed(name, value):
	if (name == "Powered"):
		print ("Adapter: %s" % ["PoweredOff", "PoweredOn"][value])

def on_stdin(source, condition):
	command = sys.stdin.readline().strip()

	try:
		if (command == "exit" or command == ""):
			mainloop.quit()
		elif (command == "start"):
			adapter.StartDiscovery()
		elif (command == "stop"):
			adapter.StopDiscovery()
	except dbus.exceptions.DBusException as e:
		if (("%s" % e) != "org.bluez.Error.NotReady: Resource Not Ready"):
			print("Error: %s" % e)

	return True

if __name__ == '__main__':
	dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)

	bus = dbus.SystemBus()
	manager = dbus.Interface(bus.get_object("org.bluez", "/"), "org.bluez.Manager")

	try:
		defaultadapter = manager.DefaultAdapter();

		adapter = dbus.Interface(bus.get_object("org.bluez", defaultadapter), "org.bluez.Adapter")

		bus.add_signal_receiver(device_found, dbus_interface = "org.bluez.Adapter", signal_name = "DeviceFound")
		bus.add_signal_receiver(property_changed, dbus_interface = "org.bluez.Adapter", signal_name = "PropertyChanged")

		GObject.io_add_watch(sys.stdin, GObject.IO_IN, on_stdin)

		properties = adapter.GetProperties()
		property_changed("Powered", properties["Powered"])
	except dbus.exceptions.DBusException as e:
		if (("%s" % e) == "org.bluez.Error.NoSuchAdapter: No such adapter"):
			print("Adapter: None")
		else:
			print("Error: %s" % e)

	mainloop = GObject.MainLoop()
	mainloop.run()
