## Version 1.0.1

 * correct peripherals not being created correctly

## Version 1.0

 * remove unneeded setTimeout's in OS X bindings
 * added persistent peripherals between calls to .startScanning() on mavericks ([@andySigler](https://github.com/andySigler))
 * report error or print warning if startScanning is called with state is not poweredOn
 * emit events for warnings ([@voodootikigod ](https://github.com/voodootikigod))
 * disable scanning flag on start on Linux to prevent unsupport adapter state in some cases
 * update debug dependency version
 * add address type to peripheral if known

## Older

 * Changes not recorded
