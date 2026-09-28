@echo off
REM ============================================================
REM  Tag Pack Creator — PACKAGE a shippable Windows installer
REM  Reuses the React bundle built by pack-app.bat (or builds it
REM  fresh if missing), then wraps it in the TPC Electron shell.
REM ============================================================
cd /d C:\Pro-Photo-Sorter
if not exist frontend\build\index.html (
  echo === No React build found — building it first ===
  cd frontend
  call npm install --legacy-peer-deps --no-audit --no-fund --loglevel=error
  if errorlevel 1 goto :err
  call node -e "const p=require('./package.json'),fs=require('fs');fs.writeFileSync('src/buildInfo.json',JSON.stringify({version:p.version,buildDate:new Date().toISOString().slice(0,10)},null,2)+'\n')"
  call npm run build
  if errorlevel 1 goto :err
  cd ..
)
echo === Syncing build into electron-shell-tpc ===
rmdir /s /q electron-shell-tpc\build 2>nul
xcopy /E /I /Y /Q frontend\build electron-shell-tpc\build
echo === Syncing installer version from frontend/package.json ===
call node -e "const fs=require('fs');const fv=require('./frontend/package.json').version;const p=require('./electron-shell-tpc/package.json');p.version=fv;fs.writeFileSync('./electron-shell-tpc/package.json',JSON.stringify(p,null,2)+'\n');console.log('electron-shell-tpc version -> '+fv)"
echo === Ensuring dependencies are installed (electron-shell-tpc) ===
cd electron-shell-tpc
call npm install --legacy-peer-deps --no-audit --no-fund --loglevel=error
if errorlevel 1 goto :err
echo === Packaging Tag Pack Creator installer ===
rmdir /s /q dist 2>nul
call npx electron-builder --win --x64
if errorlevel 1 goto :err
echo.
echo === DONE: electron-shell-tpc\dist\Tag Pack Creator Setup x.y.z.exe ===
cd ..
exit /b 0
:err
echo.
echo *** BUILD FAILED — scroll up for the first red line ***
cd /d C:\Pro-Photo-Sorter
exit /b 1
