@echo off
chcp 65001 >nul
title 🛑 Pitch Training App - Stop

echo.
echo ████████████████████████████████████████████████████████████████
echo ██                                                            ██
echo ██             🛑 PARANDO SERVIDORES 🛑                       ██
echo ██                                                            ██
echo ████████████████████████████████████████████████████████████████
echo.

echo 🔍 Procurando processos rodando...
echo.

REM Matar processos nas portas específicas
echo 🛑 Encerrando Backend (porta 8001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do (
    echo    Matando PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

echo 🛑 Encerrando Frontend (porta 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo    Matando PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

REM Matar todos os processos Python e Node relacionados ao projeto
echo 🛑 Limpando processos Python...
taskkill /f /im python.exe >nul 2>&1

echo 🛑 Limpando processos Node.js...
taskkill /f /im node.exe >nul 2>&1

REM Fechar janelas CMD abertas pelo start.bat
echo 🛑 Fechando janelas do servidor...
taskkill /f /fi "WindowTitle eq 🎵 Backend Server*" >nul 2>&1
taskkill /f /fi "WindowTitle eq 🎵 Frontend Server*" >nul 2>&1

timeout /t 2 >nul

echo.
echo ✅ Todos os servidores foram encerrados!
echo.
echo 💡 Para reiniciar, execute: start.bat
echo.
pause 