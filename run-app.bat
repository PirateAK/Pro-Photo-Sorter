@echo off
REM ============================================================
REM  Pro Photo Sorter — DAILY DEV RUN
REM  Pulls latest code, rebuilds React bundle, syncs to electron-shell,
REM  and launches Electron in dev mode. Use this every time you want to
REM  test the app with the latest code from GitHub.
REM  For a shippable installer .exe, use pack-app.bat instead.
REM ============================================================
cd /d C:\Pro-Photo-Sorter
echo === Pulling latest from GitHub ===
git pull
echo === Syncing docs into frontend/public/docs/ ===
if not exist frontend\public\docs mkdir frontend\public\docs
copy /Y USER_GUIDE.md  frontend\public\docs\USER_GUIDE.md  >nul
copy /Y QUICK_START.md frontend\public\docs\QUICK_START.md >nul
copy /Y CHANGELOG.md   frontend\public\docs\CHANGELOG.md   >nul
echo === Ensuring dependencies are installed (frontend) ===
cd frontend
call npm install --legacy-peer-deps --no-audit --no-fund --loglevel=error
if errorlevel 1 goto :err
echo === Stamping build info ===
call node -e "const p=require('./package.json'),fs=require('fs');fs.writeFileSync('src/buildInfo.json',JSON.stringify({version:p.version,buildDate:new Date().toISOString().slice(0,10)},null,2)+'\n')"
echo === Rebuilding React bundle ===
rmdir /s /q build 2>nul
call npm run build
if errorlevel 1 goto :err
echo === Syncing build into electron-shell ===
cd ..
rmdir /s /q electron-shell\build 2>nul
xcopy /E /I /Y /Q frontend\build electron-shell\build
echo === Ensuring latest Electron files (main.js, preload.js, icon, package.json) ===
copy /Y electron-additions\main.js         electron-shell\main.js         >nul
copy /Y electron-additions\preload.js      electron-shell\preload.js      >nul
copy /Y electron-additions\icon.png        electron-shell\icon.png        >nul
copy /Y electron-additions\package.json    electron-shell\package.json    >nul
echo === Syncing installer version from frontend/package.json ===
call node -e "const fs=require('fs');const fv=require('./frontend/package.json').version;const p=require('./electron-shell/package.json');p.version=fv;fs.writeFileSync('./electron-shell/package.json',JSON.stringify(p,null,2)+'\n');console.log('electron-shell version -> '+fv)"
echo === Ensuring dependencies are installed (electron-shell) ===
cd electron-shell
call npm install --legacy-peer-deps --no-audit --no-fund --loglevel=error
if errorlevel 1 goto :err
echo === Launching Pro Photo Sorter ===
call npx electron .
goto :eof
:err
echo.
echo BUILD FAILED — scroll up for the red error.
pause
