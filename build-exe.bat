@echo off
chcp 65001 >nul
title FaceLock Desktop Guard - Windows .EXE Builder
echo ==========================================================
echo        FACELOCK DESKTOP GUARD - BUILD SANG BAN .EXE
echo ==========================================================
echo.
echo [1/4] Kiem tra moi truong Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Chua cai dat Node.js tren may tinh!
    echo Vui long tai va cai dat Node.js tu: https://nodejs.org
    pause
    exit /b 1
)
node -v
echo.

echo [2/4] Dang cai dat thu vien dong goi Electron...
call npm install --save-dev electron electron-builder
if %errorlevel% neq 0 (
    echo [CANH BAO] Khong the cai dat package online, thu voi cache...
)
echo.

echo [3/4] Dang bien dich ma nguon giao dien (Vite Build)...
call npm run build
if %errorlevel% neq 0 (
    echo [LOI] Bien dich giao dien that bai!
    pause
    exit /b 1
)
echo.

echo [4/4] Dang dong goi file thuc thi Windows .EXE...
echo Dang tao file FaceLock-Setup.exe va FaceLock-Portable.exe...
call npx electron-builder --win nsis portable --config.asar=true
if %errorlevel% neq 0 (
    echo [LOI] Dong goi EXE that bai!
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo        BUILD HOAN TAT THANH CONG!
echo ==========================================================
echo File cai dat FaceLock-Setup.exe va ban chay ngay FaceLock-Portable.exe
echo da duoc tao trong thu muc: release/
echo.
if exist release (
    explorer release
) else (
    explorer dist
)
pause
