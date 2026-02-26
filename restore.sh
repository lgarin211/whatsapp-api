#!/bin/bash
echo "Restoring large binaries..."
cat browsers/linux/chrome.part_* > browsers/linux/chrome
chmod +x browsers/linux/chrome
cat whatsapp-api-linux.part_* > whatsapp-api-linux
chmod +x whatsapp-api-linux
cat whatsapp-api-win.exe.part_* > whatsapp-api-win.exe
cat browsers/win/chrome.dll.part_* > browsers/win/chrome.dll
echo "Restoration complete! You can now run ./whatsapp-api-linux"
