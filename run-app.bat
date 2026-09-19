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
echo === Ensuring dependencies are installed ===
cd frontend
call npm install --no-audit --no-fund --loglevel=error
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
echo === Launching Pro Photo Sorter ===
cd electron-shell
call npx electron .
goto :eof
:err
echo.
echo BUILD FAILED — scroll up for the red error.
pause
