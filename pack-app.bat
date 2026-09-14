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
echo === Rebuilding React bundle ===
cd frontend
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
