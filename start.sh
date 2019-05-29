#! /bin/bash

if [ -f .env ]; then
  . .env
fi

if [ -z "$CERTS_CID" ]; then
  echo "Need CERTS_CID!"
  exit 1
fi

if [ -z "$ENCPIPE_SECRET" ]; then
  echo "Need ENCPIPE_SECRET!"
  exit 1
fi

set -x
set -e

rm -rf certs
ipget -o certs $CERTS_CID
encpipe -d -p "$ENCPIPE_SECRET" -i certs/cert.pem.enc -o certs/cert.pem
encpipe -d -p "$ENCPIPE_SECRET" -i certs/priv.key.enc -o certs/priv.key
ls -l certs

npm start
