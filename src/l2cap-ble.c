#include <errno.h>
#include <signal.h>
#include <stdlib.h>
#include <sys/prctl.h>
#include <unistd.h>

#include <bluetooth/bluetooth.h>
#include <bluetooth/hci.h>
#include <bluetooth/hci_lib.h>

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
  int hciSocket;

  int l2capSock;
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

  prctl(PR_SET_PDEATHSIG, SIGINT);

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

  hciSocket = hci_open_dev(hciDeviceId);

  // create socket
  l2capSock = socket(PF_BLUETOOTH, SOCK_SEQPACKET, BTPROTO_L2CAP);

  // bind
  memset(&sockAddr, 0, sizeof(sockAddr));
  sockAddr.l2_family = AF_BLUETOOTH;
  bacpy(&sockAddr.l2_bdaddr, BDADDR_ANY);
  sockAddr.l2_cid = htobs(ATT_CID);

  result = bind(l2capSock, (struct sockaddr*)&sockAddr, sizeof(sockAddr));

  printf("bind %s\n", (result == -1) ? strerror(errno) : "success");

  // connect
  memset(&sockAddr, 0, sizeof(sockAddr));
  sockAddr.l2_family = AF_BLUETOOTH;
  str2ba(argv[1], &sockAddr.l2_bdaddr);
  sockAddr.l2_bdaddr_type = strcmp(argv[2], "random") == 0 ? BDADDR_LE_RANDOM : BDADDR_LE_PUBLIC;
  sockAddr.l2_cid = htobs(ATT_CID);

  result = connect(l2capSock, (struct sockaddr *)&sockAddr, sizeof(sockAddr));

  l2capConnInfoLen = sizeof(l2capConnInfo);
  getsockopt(l2capSock, SOL_L2CAP, L2CAP_CONNINFO, &l2capConnInfo, &l2capConnInfoLen);
  hciHandle = l2capConnInfo.hci_handle;

  printf("connect %s\n", (result == -1) ? strerror(errno) : "success");

  if (result == -1) {
    goto done;
  }

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
        len = read(0, stdinBuf, sizeof(stdinBuf));

        if (len <= 0) {
          break;
        }

        i = 0;
        while(stdinBuf[i] != '\n') {
          sscanf(&stdinBuf[i], "%02x", &data);

          l2capSockBuf[i / 2] = data;

          i += 2;
        }

        len = write(l2capSock, l2capSockBuf, (len - 1) / 2);
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
  close(l2capSock);
  close(hciSocket);
  printf("disconnect\n");

  return 0;
}
