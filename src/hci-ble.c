#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/ioctl.h>
#include <sys/prctl.h>
#include <unistd.h>

#include <bluetooth/bluetooth.h>
#include <bluetooth/hci.h>
#include <bluetooth/hci_lib.h>

int lastSignal = 0;

static void signalHandler(int signal) {
  lastSignal = signal;
}

int main(int argc, const char* argv[])
{
  char *hciDeviceIdOverride = NULL;
  int hciDeviceId = 0;
  int hciSocket;
  struct hci_dev_info hciDevInfo;

  struct hci_filter oldHciFilter;
  struct hci_filter newHciFilter;
  socklen_t oldHciFilterLen;

  int previousAdapterState = -1;
  int currentAdapterState;
  const char* adapterState = NULL;
  
  fd_set rfds;
  struct timeval tv;
  int selectRetval;

  unsigned char hciEventBuf[HCI_MAX_EVENT_SIZE];
  int hciEventLen;
  evt_le_meta_event *leMetaEvent;
  le_advertising_info *leAdvertisingInfo;
  char btAddress[18];
  int i;
  int scanning = 0;
  int8_t rssi;

  memset(&hciDevInfo, 0x00, sizeof(hciDevInfo));

  // setup signal handlers
  signal(SIGINT, signalHandler);
  signal(SIGKILL, signalHandler);
  signal(SIGUSR1, signalHandler);
  signal(SIGUSR2, signalHandler);
  signal(SIGHUP, signalHandler);

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

  // setup HCI socket
  hciSocket = hci_open_dev(hciDeviceId);

  if (hciSocket == -1) {
    printf("adapterState unsupported\n");
    return -1;
  }
  hciDevInfo.dev_id = hciDeviceId;

  // get old HCI filter
  oldHciFilterLen = sizeof(oldHciFilter);
  getsockopt(hciSocket, SOL_HCI, HCI_FILTER, &oldHciFilter, &oldHciFilterLen);

  // setup new HCI filter
  hci_filter_clear(&newHciFilter);
  hci_filter_set_ptype(HCI_EVENT_PKT, &newHciFilter);
  hci_filter_set_event(EVT_LE_META_EVENT, &newHciFilter);
  setsockopt(hciSocket, SOL_HCI, HCI_FILTER, &newHciFilter, sizeof(newHciFilter));

  while(1) {
    FD_ZERO(&rfds);
    FD_SET(hciSocket, &rfds);

    tv.tv_sec = 1;
    tv.tv_usec = 0;

    // get HCI dev info for adapter state
    ioctl(hciSocket, HCIGETDEVINFO, (void *)&hciDevInfo);
    currentAdapterState = hci_test_bit(HCI_UP, &hciDevInfo.flags);

    if (previousAdapterState != currentAdapterState) {
      previousAdapterState = currentAdapterState;

      if (!currentAdapterState) {
        adapterState = "poweredOff";
      } else if (hci_le_set_scan_parameters(hciSocket, 0x01, htobs(0x0010), htobs(0x0010), 0x00, 0, 1000) < 0) {
        if (EPERM == errno) {
          adapterState = "unauthorized";
        } else if (EIO == errno) {
          adapterState = "unsupported";
        } else {
          adapterState = "unknown";
        }        
      } else {
        adapterState = "poweredOn";
      }

      printf("adapterState %s\n", adapterState);
    }

    selectRetval = select(hciSocket + 1, &rfds, NULL, NULL, &tv);

    if (-1 == selectRetval) {
      if (SIGINT == lastSignal || SIGKILL == lastSignal) {
        // done
        break;
      } else if (SIGUSR1 == lastSignal) {
        // start scan, filter
        scanning = 1;

        hci_le_set_scan_enable(hciSocket, 0x00, 1, 1000);
        hci_le_set_scan_enable(hciSocket, 0x01, 1, 1000);
      } else if (SIGUSR2 == lastSignal) {
        // start scan, no filter
        scanning = 1;

        hci_le_set_scan_enable(hciSocket, 0x00, 0, 1000);
        hci_le_set_scan_enable(hciSocket, 0x01, 0, 1000);
      } else if (SIGHUP == lastSignal) {
        // stop scan
        scanning = 0;

        hci_le_set_scan_enable(hciSocket, 0x00, 0, 1000);
      } 
    } else if (selectRetval) {
      // read event
      hciEventLen = read(hciSocket, hciEventBuf, sizeof(hciEventBuf));
      leMetaEvent = (evt_le_meta_event *)(hciEventBuf + (1 + HCI_EVENT_HDR_SIZE));
      hciEventLen -= (1 + HCI_EVENT_HDR_SIZE);

      if (!scanning) {
        // ignore, not scanning
        continue;
      }

      if (leMetaEvent->subevent != 0x02) {
        continue;
      }

      leAdvertisingInfo = (le_advertising_info *)(leMetaEvent->data + 1);
      ba2str(&leAdvertisingInfo->bdaddr, btAddress);

      printf("event %s,%s,", btAddress, (leAdvertisingInfo->bdaddr_type == LE_PUBLIC_ADDRESS) ? "public" : "random");

      for (i = 0; i < leAdvertisingInfo->length; i++) {
          printf("%02x", leAdvertisingInfo->data[i]);
      }

      rssi = *(leAdvertisingInfo->data + leAdvertisingInfo->length);

      printf(",%d\n", rssi);
    }
  }

  // restore original filter
  setsockopt(hciSocket, SOL_HCI, HCI_FILTER, &oldHciFilter, sizeof(oldHciFilter));

  // disable LE scan
  hci_le_set_scan_enable(hciSocket, 0x00, 0, 1000);

  close(hciSocket);

  return 0;
}
