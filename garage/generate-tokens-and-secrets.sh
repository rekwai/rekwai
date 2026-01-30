#!/bin/bash

echo "S3_ACCESS_KEY_ID=GK$(openssl rand -hex 12)"
echo "S3_SECRET_ACCESS_KEY=$(openssl rand -hex 32)"
echo "GARAGE_RPC_SECRET=$(openssl rand -hex 32)"
echo "GARAGE_ADMIN_TOKEN=$(openssl rand -base64 32)"
echo "GARAGE_METRICS_TOKEN=$(openssl rand -base64 32)"
