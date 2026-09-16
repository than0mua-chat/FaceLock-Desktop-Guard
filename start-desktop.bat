@echo off
title FaceLock Desktop Guard - Windows Launcher
color 0b
echo ========================================================
echo        FACELOCK DESKTOP GUARD (WINDOWS 10/11)
echo        Bao Ve May Tinh Bang Nhan Dien Khuon Mat
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Kiem tra xem da co thu muc node_modules chua
if not exist "node_modules\" (
    echo [1/3] Dang cai dat cac goi thu vien phan mem...
    call npm install
    if %errorlevel% neq 0 (
        echo [LOI] Khong the cai dat dependencies! Vui long kiem tra Node.js.
        pause
        exit /b %errorlevel%
    )
) else (
    echo [1/3] Thu vien phan mem da san sang.
)

:: 2. Kiem tra ban build dist
if not exist "dist\index.html" (
    echo [2/3] Dang bien dich ung dung Desktop offline (Vite Build)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [LOI] Khong the build ung dung!
        pause
        exit /b %errorlevel%
    )
) else (
    echo [2/3] Ban build ung dung da san sang.
)

:: 3. Khoi chay ung dung Desktop hoan toan (Electron C++ Native)
echo [3/3] Dang khoi chay FaceLock Desktop Native...
echo      - Khong phu thuoc trinh duyet Web
echo      - Hoat dong 100%% Offline khong can mang
echo      - Tich hop Windows System Tray & LockWorkStation
echo.

npx electron electron/main.cjs

if %errorlevel% neq 0 (
    echo [Thong bao] Tien trinh da ket thuc.
)
