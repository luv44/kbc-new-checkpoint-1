@echo off
setlocal enabledelayedexpansion
title Crorepati Revision - Google Veo 3.1 Video Generator

echo ==============================================================================
echo  CROREPATI REVISION - GOOGLE VEO 3.1 32-SECOND EDUCATIONAL REEL WORKFLOW
echo ==============================================================================
echo.

cd /d "%~dp0"
set "VIDEO_DIR=%~dp0public\videos"

:: Check if WSL is available on this Windows PC
where wsl.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [Environment] Windows Subsystem for Linux (WSL) detected.
    echo [Launcher] Passing execution to start_video_wsl.sh inside Ubuntu/WSL...
    echo.
    wsl.exe bash -c "cd \"$(wslpath -u '%~dp0')\" && bash ./start_video_wsl.sh"
    goto :FINISHED
)

:: Fallback if WSL is not installed: Native Windows execution
echo [Environment] WSL not found. Running in native Windows mode...
echo.

:: Check Python
where python.exe >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in your Windows PATH.
    echo Please install Python 3.10+ from https://www.python.org/ or install WSL Ubuntu.
    pause
    exit /b 1
)

:: Securely prompt for Gemini API Key using PowerShell (masked input, never echoed, never saved)
if "%GEMINI_API_KEY%"=="" (
    echo Please enter your Google Gemini / Veo API Key.
    echo (Input is hidden for security and is NEVER saved to disk.)
    for /f "usebackq delims=" %%K in (`powershell -Command "$k = Read-Host -Prompt 'Enter Gemini API Key' -AsSecureString; $b = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($k); [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($b)"`) do (
        set "GEMINI_API_KEY=%%K"
    )
)

if "%GEMINI_API_KEY%"=="" (
    echo [ERROR] No API key entered. Exiting.
    pause
    exit /b 1
)

:: Run Python pipeline directly on Windows
python "%~dp0run_veo_pipeline.py"
set "EXIT_CODE=%ERRORLEVEL%"

:: Clear API key from memory
set "GEMINI_API_KEY="

:FINISHED
echo.
if exist "%VIDEO_DIR%" (
    echo [Explorer] Opening output folder: %VIDEO_DIR%
    explorer.exe "%VIDEO_DIR%"
)

echo.
echo ==============================================================================
echo  All steps finished!
echo ==============================================================================
pause
