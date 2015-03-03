#include <unistd.h>

#include "utility.h"

int readLine(int fd, char* buffer, int bufferLen) {
  int lineLength = 0;

  while(lineLength < bufferLen) {
    char c;
    int readResult = read(fd, &c, sizeof(c));

    if (readResult <= 0) {
      lineLength = readResult;
      break;
    }

    if (c == '\n') {
      break;
    }

    buffer[lineLength] = c;
    lineLength++;
  }

  return lineLength;
}
