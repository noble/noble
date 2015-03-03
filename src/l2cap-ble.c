#include <errno.h>
#include <signal.h>
#include <stdlib.h>
#include <sys/prctl.h>
#include <unistd.h>

#include <bluetooth/bluetooth.h>
#include <bluetooth/hci.h>
#include <bluetooth/hci_lib.h>

#include "utility.h"

/*/
for trouble shooting:

    enable kernel dynamic debug logging via dmsg for ble:
echo "file net/bluetooth/hci_conn.c =flmtp" > /sys/kernel/debug/dynamic_debug/control
    and repeat with hci_core.c, lcap_sock.c, lcap.core.c or others

    disable with
echo "file net/bluetooth/hci_conn.c =_" > /sys/kernel/debug/dynamic_debug/control

    check with
grep "\[bluetooth\][a-z_]* =[^_ ]\+" /sys/kernel/debug/dynamic_debug/control

wildcards did not work for me, ymmv.
/*/

#define ATT_CID 4

#define BDADDR_LE_PUBLIC       0x01
#define BDADDR_LE_RANDOM       0x02

struct sockaddr_l2 {
  sa_family_t    l2_family;
  unsigned short l2_psm;
  bdaddr_t       l2_bdaddr;
  unsigned short l2_cid;
  uint8_t        l2_bdaddr_type;
};

#define L2CAP_CONNINFO  0x02
struct l2cap_conninfo {
  uint16_t       hci_handle;
  uint8_t        dev_class[3];
};

int lastSignal = 0;

static void signalHandler(int signal) {
  lastSignal = signal;
}

int main(int argc, const char* argv[]) {
  char *hciDeviceIdOverride = NULL;
  int hciDeviceId = 0;
  char controller_address[18];
  struct hci_dev_info device_info;
  int hciSocket = -1;

  int l2capSock = -1;
  struct sockaddr_l2 sockAddr;
  struct l2cap_conninfo l2capConnInfo;
  socklen_t l2capConnInfoLen;
  int hciHandle;
  int result;

  fd_set rfds;
  struct timeval tv;

  char stdinBuf[256 * 2 + 1];
  char l2capSockBuf[256];
  int len;
  int i;
  unsigned int data;

  // setup signal handlers
  signal(SIGINT, signalHandler);
  signal(SIGKILL, signalHandler);
  signal(SIGHUP, signalHandler);
  signal(SIGUSR1, signalHandler);
  signal(SIGUSR2, signalHandler);

  prctl(PR_SET_PDEATHSIG, SIGKILL);

  // remove buffering
  setbuf(stdin, NULL);
  setbuf(stdout, NULL);
  setbuf(stderr, NULL);

  hciDeviceIdOverride = getenv("NOBLE_HCI_DEVICE_ID");
  if (hciDeviceIdOverride != NULL) {
    hciDeviceId = atoi(hciDeviceIdOverride);
  } else {
    // if no env variable given, use the first available device
    hciDeviceId = hci_get_route(NULL);
  }

  if (hciDeviceId < 0) {
    hciDeviceId = 0; // use device 0, if device id is invalid
  }

  // open controller
  hciSocket = hci_open_dev(hciDeviceId);
  if (hciSocket == -1) {
    printf("connect hci_open_dev(hci%i): %s\n", hciDeviceId, strerror(errno));
    goto done;
  }

  // get local controller address
  result = hci_devinfo(hciDeviceId, &device_info);
   if (result == -1) {
    printf("connect hci_deviceinfo(hci%i): %s\n", hciDeviceId, strerror(errno));
    goto done;
  }
  ba2str(&device_info.bdaddr, controller_address);
  printf("info using %s@hci%i\n", controller_address, hciDeviceId);

  // create socket
  l2capSock = socket(PF_BLUETOOTH, SOCK_SEQPACKET, BTPROTO_L2CAP);
  if (l2capSock  == -1) {
    printf("connect socket(hci%i): %s\n", hciDeviceId, strerror(errno));
    goto done;
  }

  // bind
  memset(&sockAddr, 0, sizeof(sockAddr));
  sockAddr.l2_family = AF_BLUETOOTH;
   // Bind socket to the choosen adapter by using the controllers BT-address as source
   // see l2cap_chan_connect source and hci_get_route in linux/net/bluetooth
  bacpy(&sockAddr.l2_bdaddr, &device_info.bdaddr);
  sockAddr.l2_cid = htobs(ATT_CID);
  result = bind(l2capSock, (struct sockaddr*)&sockAddr, sizeof(sockAddr));
  if (result == -1) {
    printf("connect bind(hci%i): %s\n", hciDeviceId, strerror(errno));
    goto done;
  }

  // connect
  memset(&sockAddr, 0, sizeof(sockAddr));
  sockAddr.l2_family = AF_BLUETOOTH;
  str2ba(argv[1], &sockAddr.l2_bdaddr);
  sockAddr.l2_bdaddr_type = strcmp(argv[2], "random") == 0 ? BDADDR_LE_RANDOM : BDADDR_LE_PUBLIC;
  sockAddr.l2_cid = htobs(ATT_CID);

  result = connect(l2capSock, (struct sockaddr *)&sockAddr, sizeof(sockAddr));
  if (result == -1) {
    char buf[1024] = { 0 };
    ba2str( &sockAddr.l2_bdaddr, buf );
    printf("connect connect(hci%i): %s\n", hciDeviceId, strerror(errno));
    goto done;
  }

  // get hci_handle
  l2capConnInfoLen = sizeof(l2capConnInfo);
  result = getsockopt(l2capSock, SOL_L2CAP, L2CAP_CONNINFO, &l2capConnInfo, &l2capConnInfoLen);
  if (result == -1) {
    printf("connect getsockopt(hci%i): %s\n", hciDeviceId, strerror(errno));
    goto done;
  }
  hciHandle = l2capConnInfo.hci_handle;

  printf("connect success\n");

  while(1) {
    FD_ZERO(&rfds);
    FD_SET(0, &rfds);
    FD_SET(l2capSock, &rfds);

    tv.tv_sec = 1;
    tv.tv_usec = 0;

    result = select(l2capSock + 1, &rfds, NULL, NULL, &tv);

    if (-1 == result) {
      if (SIGINT == lastSignal || SIGKILL == lastSignal || SIGHUP == lastSignal) {
        break;
      }

      if (SIGUSR1 == lastSignal) {
        int8_t rssi = 0;

        for (i = 0; i < 100; i++) {
          hci_read_rssi(hciSocket, hciHandle, &rssi, 1000);

          if (rssi != 0) {
            break;
          }
        }

        if (rssi == 0) {
          rssi = 127;
        }

        printf("rssi = %d\n", rssi);
      } else if (SIGUSR2 == lastSignal) {
        struct bt_security btSecurity;
        socklen_t btSecurityLen;

        memset(&btSecurity, 0, sizeof(btSecurity));
        btSecurity.level = BT_SECURITY_MEDIUM;

        setsockopt(l2capSock, SOL_BLUETOOTH, BT_SECURITY, &btSecurity, sizeof(btSecurity));

        getsockopt(l2capSock, SOL_BLUETOOTH, BT_SECURITY, &btSecurity, &btSecurityLen);

        printf("security = %s\n", (BT_SECURITY_MEDIUM == btSecurity.level) ? "medium" : "low");
      }
    } else if (result) {
      if (FD_ISSET(0, &rfds)) {
        len = readLine(0, stdinBuf, sizeof(stdinBuf));

        if (len <= 0) {
          break;
        }

        for (i = 0; i < len; i += 2) {
          sscanf(&stdinBuf[i], "%02x", &data);

          l2capSockBuf[i / 2] = data;
        }

        len = write(l2capSock, l2capSockBuf, len / 2);

        printf("write = %s\n", (len == -1) ? strerror(errno) : "success");
      }

      if (FD_ISSET(l2capSock, &rfds)) {
        len = read(l2capSock, l2capSockBuf, sizeof(l2capSockBuf));

        if (len <= 0) {
          break;
        }

        printf("data ");
        for(i = 0; i < len; i++) {
          printf("%02x", ((int)l2capSockBuf[i]) & 0xff);
        }
        printf("\n");
      }
    }
  }

done:
  if (l2capSock != -1) {
    close(l2capSock);
  }

  if (hciSocket != -1) {
    close(hciSocket);
  }

  printf("disconnect\n");

  return 0;
}
