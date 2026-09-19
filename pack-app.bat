@echo off
REM ============================================================
REM  Pro Photo Sorter — PACKAGE a shippable Windows .exe
REM  Use this ONLY when you want a fresh redistributable build
REM  (e.g. before sending a copy to a customer or friend).
REM  For daily use, run-app.bat is faster and always current.
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
echo === Packaging Windows .exe (may take several minutes over satellite) ===
cd electron-shell
rmdir /s /q dist 2>nul
call npx electron-builder --win --x64
if errorlevel 1 goto :err
echo.
echo ============================================================
echo  DONE. Fresh .exe is at:
echo  C:\Pro-Photo-Sorter\electron-shell\dist\win-unpacked\Pro Photo Sorter.exe
echo  Installer .exe is at:
echo  C:\Pro-Photo-Sorter\electron-shell\dist\
echo ============================================================
pause
goto :eof
:err
echo.
echo BUILD FAILED — scroll up for the red error.
pause
