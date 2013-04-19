wget https://www.kernel.org/pub/linux/bluetooth/bluez-5.4.tar.xz

xz -d bluez-5.4.tar.xz
tar xvf bluez-5.4.tar

cd bluez-5.4

sudo apt-get install libglib2.0-dev libdbus-1-dev libusb-dev libudev-dev libical-dev libreadline-dev

./configure --prefix=/usr --mandir=/usr/share/man --sysconfdir=/etc --localstatedir=/var --disable-systemd


./configure --prefix=$PWD/root/usr --mandir=$PWD/root/usr/share/man --sysconfdir=$PWD/root/etc --localstatedir=$PWD/root/var --with-dbusconfdir --disable-systemd

