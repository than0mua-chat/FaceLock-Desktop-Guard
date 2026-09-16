@echo off
title FaceLock Desktop Guard - Dong Goi File Cai Dat EXE
color 0a
echo ========================================================
echo        DONG GOI FILE CAI DAT WINDOWS (.EXE)
echo        FaceLock Desktop Guard (NSIS / Portable)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Dang bien dich ma nguon ung dung...
call npm run build
if %errorlevel% neq 0 (
    echo [LOI] Build ma nguon that bai!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Dang dong goi file cai dat .exe vao thu muc "release"...
call npx electron-builder --win

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  THANH CONG! File cai dat da duoc tao trong thu muc "release"
    echo  Ban co the chia se va cai dat len bat ky may Windows nao.
    echo ========================================================
) else (
    echo.
    echo [LOI] Qua trinh dong goi gap loi.
)

pause
