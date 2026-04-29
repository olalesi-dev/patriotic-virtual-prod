@echo off
title Patriot EMR - Fix & Start
echo ==========================================
echo   Patriotic EMR - Repair Script
echo ==========================================
echo.
echo 1. Stopping any stuck Node.js processes...
taskkill /F /IM node.exe > nul 2>&1

echo.
echo 2. Cleaning up corrupted node_modules...
cd emr-portal
if exist node_modules (
    rmdir /s /q node_modules
)

echo.
echo 3. Installing dependencies (clean slate)...
call npm install

echo.
echo 4. Starting EMR Dashboard...
echo    (Please wait for localhost:3000 to open)
echo.
call npm run dev
pause
