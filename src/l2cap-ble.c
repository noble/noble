#include <errno.h>
#include <signal.h>
#include <sys/prctl.h>
#include <unistd.h>

#include <bluetooth/bluetooth.h>

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

int lastSignal = 0;

static void signalHandler(int signal) {
  lastSignal = signal;
}

int main(int argc, const char* argv[]) {
  int l2capSock;
  struct sockaddr_l2 sockAddr;
  int result;

  fd_set rfds;
  struct timeval tv;

  char stdinBuf[256 * 2 + 1];
  char l2capSockBuf[256];
  int len;
  int i;

  // setup signal handlers
  signal(SIGINT, signalHandler);
  signal(SIGKILL, signalHandler);
  signal(SIGHUP, signalHandler);

  prctl(PR_SET_PDEATHSIG, SIGINT);

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

  printf("connect %s\n", (result == -1) ? strerror(errno) : "success");

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
    } else if (result) {
      if (FD_ISSET(0, &rfds)) {
        len = read(0, stdinBuf, sizeof(stdinBuf));

        i = 0;
        while(stdinBuf[i] != '\n') {
          sscanf(&stdinBuf[i], "%02x", (unsigned int*)&l2capSockBuf[i / 2]);

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

  close(l2capSock);
  printf("disconnect\n");

  return 0;
}
