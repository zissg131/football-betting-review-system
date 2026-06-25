@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-dev-server.ps1"
start "" "http://127.0.0.1:3000/daily"
