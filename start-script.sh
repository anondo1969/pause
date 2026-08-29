#!/bin/sh
set -eu

exec nginx -c /etc/nginx/nginx.conf -g 'daemon off;'
