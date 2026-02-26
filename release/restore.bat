@echo off
echo Restoring large binaries...
copy /b browsers\linux\chrome.part_* browsers\linux\chrome
copy /b whatsapp-api-linux.part_* whatsapp-api-linux
copy /b whatsapp-api-win.exe.part_* whatsapp-api-win.exe
copy /b browsers\win\chrome.dll.part_* browsers\win\chrome.dll
echo Restoration complete! You can now run whatsapp-api-win.exe
