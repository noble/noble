#include <errno.h>
#include <signal.h>
#include <stdlib.h>
#include <sys/prctl.h>
#include <unistd.h>

#include <bluetooth/bluetooth.h>
#include <bluetooth/hci.h>
#include <bluetooth/hci_lib.h>



/***************************************************
 *   MACROS
 **************************************************/
#define ATT_CID 4

#define BDADDR_LE_PUBLIC       0x01
#define BDADDR_LE_RANDOM       0x02

#define L2CAP_CONNINFO  0x02

#if !defined(NB_CONNECTION_TRIES)
#define NB_CONNECTION_TRIES 5
#endif

/***************************************************
 *   Private variables
 **************************************************/
static int l2capSock;
static int hciHandle;
static int lastSignal = 0;

/***************************************************
 *   Private types
 **************************************************/
struct l2cap_conninfo {
	uint16_t       hci_handle;
	uint8_t        dev_class[3];
};

struct sockaddr_l2 {
	sa_family_t    l2_family;
	unsigned short l2_psm;
	bdaddr_t       l2_bdaddr;
	unsigned short l2_cid;
	uint8_t        l2_bdaddr_type;
};

typedef enum{
	CONNECT_ARG = 1,
	RECONNECT_ARG = 2
}EPProcessConnectArg;

/***************************************************
 *   Private types
 **************************************************/
static void signalHandler(int signal);
static int connectL2Cap(const char* arg_raw_bt_address, const char* arg_bt_address_type, int arg_nb_tries);



static void signalHandler(int signal) {
  lastSignal = signal;
}

/**
 * Connect L2cap socket to given device
 * @param arg_raw_bt_address
 * @param arg_bt_address_type
 * @param arg_nb_tries number of attempts
 * @return 0 if successful, error code otherwise
 */
static int connectL2Cap(const char* arg_raw_bt_address, const char* arg_bt_address_type, int arg_nb_tries)
{
	int nb_tries = 0;
	int result;
	struct sockaddr_l2 sockAddr;
	struct l2cap_conninfo l2capConnInfo;
	socklen_t l2capConnInfoLen;

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
	str2ba(arg_raw_bt_address, &sockAddr.l2_bdaddr);
	sockAddr.l2_bdaddr_type = strcmp(arg_bt_address_type, "random") == 0 ? BDADDR_LE_RANDOM : BDADDR_LE_PUBLIC;
	sockAddr.l2_cid = htobs(ATT_CID);

	result = -1;
	while(nb_tries < arg_nb_tries && result == -1)
	{
		result = connect(l2capSock, (struct sockaddr *)&sockAddr, sizeof(sockAddr));
		nb_tries ++;
		sleep(1);
	}

	if(result >= 0)
	{
		l2capConnInfoLen = sizeof(l2capConnInfo);
		getsockopt(l2capSock, SOL_L2CAP, L2CAP_CONNINFO, &l2capConnInfo, &l2capConnInfoLen);
		hciHandle = l2capConnInfo.hci_handle;
	}
	else
	{
		//Connection failed
	}
	return result;
}

int main(int argc, const char* argv[]) {
	char *hciDeviceIdOverride = NULL;
	int hciDeviceId = 0;
	int hciSocket;
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

	/* Try a connection */
	result = connectL2Cap(argv[1], argv[2], NB_CONNECTION_TRIES);

	if(result >= 0)
	{
		if(atoi(argv[3]) == RECONNECT_ARG)
		{
			printf("reconnect %s\n", (result < 0) ? strerror(errno) : "success");
		}
		else //CONNECT_ARG
		{
			printf("connect %s\n", (result < 0) ? strerror(errno) : "success");
		}
	}
	else
	{
		//Connection failed
		printf("disconnect\n");
		goto done;
	}


	while(1) {
    FD_ZERO(&rfds);
    FD_SET(STDIN_FILENO, &rfds);
    FD_SET(l2capSock, &rfds);

    tv.tv_sec = 1;
    tv.tv_usec = 0;

    result = select(l2capSock + 1, &rfds, NULL, NULL, &tv);

    if (-1 == result) {
      if (SIGINT == lastSignal || SIGKILL == lastSignal || SIGHUP == lastSignal) {
    	printf("disconnect\n");
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
      if (FD_ISSET(STDIN_FILENO, &rfds)) {
        len = read(STDIN_FILENO, stdinBuf, sizeof(stdinBuf));

        if (len <= 0) {
          printf("disconnect\n");
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

			/** Connection lost */
			if (len <= 0) {
				printf("connectionDrop = %s\n", strerror(errno));
				break;
			}
			else
			{
				printf("data ");
				for(i = 0; i < len; i++) {
					printf("%02x", ((int)l2capSockBuf[i]) & 0xff);
				}
				printf("\n");
			}
		}
    }
  }

done:
  close(l2capSock);
  close(hciSocket);
  return 0;
}
