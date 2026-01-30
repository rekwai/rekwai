#!/bin/sh

set -e

echo "Waiting for Garage to be ready..."
sleep 5

# Try to connect to Garage and wait until it responds
until garage status > /dev/null 2>&1; do
  echo "Garage is not ready yet. Retrying in 2 seconds..."
  sleep 2
done

echo "Garage is ready. Initializing cluster..."

# Get the node ID
NODE_ID=$(garage status | grep 'NO ROLE ASSIGNED' | head -n 1 | awk '{print $1}')

if [ -z "$NODE_ID" ]; then
  echo "Cluster already configured. Checking for existing layout..."

  # Check if there's a pending layout
  if garage status | grep -q 'pending...'; then
    echo "Pending layout found. Applying layout..."
    garage layout apply --version 1
  else
    echo "Layout already applied."
  fi
else
  echo "Configuring node with ID: $NODE_ID"

  # Configure the node with 1GB capacity for dev setup
  # Zone dc1 is default, capacity 1G (1 gigabyte)
  garage layout assign -z dc1 -c 1G "$NODE_ID"

  echo "Node configured. Applying layout..."
  garage layout apply --version 1

  echo "Garage cluster initialization complete!"
fi

# Create initial bucket if INITIAL_BUCKET_NAME is set
if [ -n "$INITIAL_BUCKET_NAME" ]; then
  echo "Creating initial bucket: $INITIAL_BUCKET_NAME"

  # Import or create key with predefined credentials
  if [ -n "$S3_ACCESS_KEY_ID" ] && [ -n "$S3_SECRET_ACCESS_KEY" ]; then
    echo "Importing predefined access key..."

    # Check if key already exists
    if ! garage key info "$S3_ACCESS_KEY_ID" > /dev/null 2>&1; then
      garage key import --yes -n "rekwai-key" "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY"
      echo "Key imported with predefined credentials."
    else
      echo "Key with access key ID $S3_ACCESS_KEY_ID already exists."
    fi
  else
    echo "Warning: S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY not set."
    echo "Please set both environment variables to use predefined credentials."
    exit 1
  fi

  # Check if bucket already exists
  if garage bucket info "$INITIAL_BUCKET_NAME" > /dev/null 2>&1; then
    echo "Bucket $INITIAL_BUCKET_NAME already exists."
  else
    # Create the bucket
    garage bucket create "$INITIAL_BUCKET_NAME"
    echo "Bucket $INITIAL_BUCKET_NAME created successfully!"
  fi

  # Allow the key to access the bucket
  garage bucket allow --read --write "$INITIAL_BUCKET_NAME" --key "$S3_ACCESS_KEY_ID"
  echo "Key $S3_ACCESS_KEY_ID granted read/write permissions to bucket $INITIAL_BUCKET_NAME"
else
  echo "INITIAL_BUCKET_NAME not set. Skipping bucket creation."
fi