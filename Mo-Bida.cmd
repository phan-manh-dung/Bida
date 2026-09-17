@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Mo-Bida.ps1"
if errorlevel 1 pause
