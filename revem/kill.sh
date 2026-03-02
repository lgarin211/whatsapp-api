#!/bin/bash

echo "Stopping WhatsApp API Services..."

# Kill Node processes running index.js
echo "Killing node index.js..."
pkill -f "node index.js"

# Kill all Chromium/Chrome processes associated with Puppeteer
echo "Killing hanging Chrome/Chromium processes..."
pkill -f chrome
pkill -f chromium

# Force kill anything holding port 8000
echo "Freeing up port 8000..."
fuser -k 8000/tcp

echo "Cleanup complete! You can now run 'npm start' safely."
