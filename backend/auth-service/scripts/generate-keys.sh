#!/usr/bin/env bash
set -e
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
echo "Cles RSA generees dans ./keys"
echo ""
echo "JWT_PRIVATE_KEY=$(base64 -w0 keys/private.pem)"
echo "JWT_PUBLIC_KEY=$(base64 -w0 keys/public.pem)"
