@echo off
cd /d "%~dp0desktop"
call nvm use 22.14.0
call pnpm exec vite build
call pnpm exec tauri build
pause
