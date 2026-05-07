@echo off
REM ============================================================
REM   Camera Markup Tool - First-Time Setup (Windows)
REM   Downloads the three support libraries from cdnjs.
REM   Run this once. Then double-click camera_markup_tool.html.
REM ============================================================

setlocal
cd /d "%~dp0"

echo.
echo =====================================================
echo  Camera Markup Tool - First-Time Setup
echo =====================================================
echo.
echo Creating lib folder...
if not exist lib mkdir lib

echo.
echo Downloading PDF.js library (1 of 3)...
curl -fsSL -o lib\pdf.min.js https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
if errorlevel 1 goto :failed

echo Downloading PDF.js worker (2 of 3)...
curl -fsSL -o lib\pdf.worker.min.js https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js
if errorlevel 1 goto :failed

echo Downloading jsPDF library (3 of 3)...
curl -fsSL -o lib\jspdf.umd.min.js https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
if errorlevel 1 goto :failed

echo.
echo =====================================================
echo  Setup complete!
echo =====================================================
echo.
echo You can now double-click camera_markup_tool.html to
echo open the tool. You only need to run setup once.
echo.
pause
exit /b 0

:failed
echo.
echo =====================================================
echo  Setup FAILED - could not download a library file.
echo =====================================================
echo.
echo This usually means:
echo  1. No internet connection, or
echo  2. Your firewall is blocking cdnjs.cloudflare.com
echo.
echo See README.md for instructions to download the files
echo manually from another computer.
echo.
pause
exit /b 1
