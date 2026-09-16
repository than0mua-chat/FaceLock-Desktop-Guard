@echo off
chcp 65001 >nul
title FaceLock Desktop Guard - Khoi dong App Desktop
echo ==========================================================
echo        KHOI DONG FACELOCK GUARD (DESKTOP MODE)
echo ==========================================================
echo.

echo [1/2] Dang kiem tra va bien dich ma nguon moi nhat (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [LOI] Bien dich giao dien that bai! Vui long kiem tra lai Node.js.
    pause
    exit /b 1
)

echo.
echo [2/2] Dang khoi chay FaceLock Desktop Guard (che do phan cung on dinh)...
npx electron electron/main.cjs
if %errorlevel% neq 0 (
    echo.
    echo [THONG BAO] Dang kiem tra cai dat Electron...
    call npm install --save-dev electron
    npx electron electron/main.cjs
)
pause
