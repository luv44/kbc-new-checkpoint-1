@echo off
title Google Flow - 32-Second Veo Reel Assembler
cd /d "%~dp0"

echo ==============================================================================
echo  GOOGLE FLOW / VEO 3.1 LITE - LOCAL 32-SECOND REEL ASSEMBLER
echo ==============================================================================
echo.

set "FLOW_DIR=%~dp0public\videos\flow_clips"
set "VIDEO_DIR=%~dp0public\videos"

if not exist "%FLOW_DIR%" mkdir "%FLOW_DIR%"

:: Check for WSL
where wsl.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [Environment] Windows Subsystem for Linux (WSL) detected.
    wsl.exe bash -c "cd \"$(wslpath -u '%~dp0')\" && python3 ./assemble_flow_clips.py"
    goto :FINISH
)

:: Native Windows fallback
where python.exe >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed. Please install Python 3.10+ from python.org.
    pause
    exit /b 1
)

python "%~dp0assemble_flow_clips.py"

:FINISH
if %ERRORLEVEL% equ 0 (
    echo.
    echo [Explorer] Opening output folder...
    explorer.exe "%VIDEO_DIR%"
) else (
    echo.
    echo Please place your 4 downloaded clips into:
    echo   %FLOW_DIR%
    echo Named: scene1.mp4, scene2.mp4, scene3.mp4, scene4.mp4
)

echo.
pause
