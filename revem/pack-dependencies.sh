#!/bin/bash
set -e

echo "=========================================================="
echo " Packaging Dependencies for Offline Production Deployment"
echo "=========================================================="

# Create the target offline directory
mkdir -p externalcomponen

echo "[1/4] Installing all NPM packages locally first..."
# Normal install to ensure package-lock is up to date and base is clean
npm install

echo "[2/4] Configuring Puppeteer Chromium into externalcomponen/puppeteer_cache..."
# Set the specialized cache directory and trigger an installation specific to puppeteer
export PUPPETEER_CACHE_DIR=$PWD/externalcomponen/puppeteer_cache
npx puppeteer browsers install chrome

echo "[3/4] Copying node_modules to externalcomponen/node_modules..."
# We use rsync or cp to move it securely
rm -rf externalcomponen/node_modules
cp -R node_modules externalcomponen/node_modules

echo "[4/4] Finalizing bundle..."
echo "Done! The 'externalcomponen' folder now contains:"
echo "- Puppeteer Cache (Chromium Browser)"
echo "- All Node.js Modules"
echo ""
echo "You can now compress this directory AND the rest of the project."
echo "Transfer them to the Production server, and simply run:"
echo "npm start"
