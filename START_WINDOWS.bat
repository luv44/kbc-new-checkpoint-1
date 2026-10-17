@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22 or newer, then run this file again.
 pause
 exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0]) < 22) process.exit(1)"
if errorlevel 1 (
 echo Node.js 22 or newer is required.
 pause
 exit /b 1
)
powershell.exe -NoProfile -Command "try {$s=Invoke-RestMethod 'http://localhost:4173/api/factory/status' -TimeoutSec 2; if($s.folder){Start-Process 'http://localhost:4173/syllabus';exit 0}} catch {};exit 1"
if not errorlevel 1 exit /b
if not exist "user-data\si-integrated-v1.done" (
 node clean-si.mjs
 if errorlevel 1 (
  pause
  exit /b 1
 )
 if not exist user-data mkdir user-data
 echo done>"user-data\si-integrated-v1.done"
)
start "Crorepati Browser" /min powershell.exe -NoProfile -Command "for($i=0;$i -lt 90;$i++){try{$s=Invoke-RestMethod 'http://localhost:4173/api/factory/status' -TimeoutSec 2;Start-Process 'http://localhost:4173/syllabus';exit}catch{Start-Sleep -Seconds 2}}"
where ollama >nul 2>nul
if not errorlevel 1 powershell.exe -NoProfile -Command "try{$null=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2}catch{Start-Process ollama -ArgumentList 'serve' -WindowStyle Minimized}"
node server.mjs
pause
