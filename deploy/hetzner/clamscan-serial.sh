#!/bin/sh
set -eu
# Fail safely with the API's temporary-unavailability response while a scan is
# already running. --no-fork lets the API's timeout terminate the actual scanner.
exec flock --nonblock --conflict-exit-code 75 --no-fork /data/.clamscan.lock /usr/bin/clamscan "$@"
