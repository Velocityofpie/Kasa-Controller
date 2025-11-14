@echo off
cd /d "%~dp0"
call npm run build
if %errorlevel% equ 0 (
    call node_modules\.bin\electron.cmd .
)
