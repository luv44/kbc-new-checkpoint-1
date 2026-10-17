#!/usr/bin/env bash
set -e
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null; then
 echo 'Install Node.js LTS, then run this launcher again.'
 exit 1
fi
if ! node -e "if(Number(process.versions.node.split('.')[0]) < 22) process.exit(1)"; then
 echo 'Node.js 22 or newer is required.'
 exit 1
fi
exec node server.mjs
