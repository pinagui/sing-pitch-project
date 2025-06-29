@echo off
chcp 65001 >nul
title 🎵 Pitch Training App - Launcher

echo.
echo ████████████████████████████████████████████████████████████████
echo ██                                                            ██
echo ██          🎵 PITCH TRAINING APP - LAUNCHER 🎵               ██
echo ██                                                            ██
echo ████████████████████████████████████████████████████████████████
echo.

echo 🔄 Parando servidores anteriores...
echo.

REM Matar processos nas portas 8001 e 5173
echo 🛑 Encerrando processos na porta 8001 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo 🛑 Encerrando processos na porta 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM Matar processos Python e Node que possam estar rodando
echo 🛑 Limpando processos Python/Node restantes...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

timeout /t 2 >nul

echo ✅ Servidores anteriores encerrados!
echo.

echo 🚀 Iniciando Backend (Python)...
echo.

REM Criar script temporário para backend
echo @echo off > temp_backend.bat
echo cd backend >> temp_backend.bat
echo call venv\Scripts\activate.bat >> temp_backend.bat
echo python main_simple.py >> temp_backend.bat
echo pause >> temp_backend.bat

REM Iniciar Backend
start "🎵 Backend Server" temp_backend.bat

echo ⏳ Aguardando backend inicializar...
timeout /t 5 >nul

echo 🚀 Iniciando Frontend (React)...
echo.

REM Criar script temporário para frontend
echo @echo off > temp_frontend.bat
echo cd frontend >> temp_frontend.bat
echo npm run dev >> temp_frontend.bat
echo pause >> temp_frontend.bat

REM Iniciar Frontend
start "🎵 Frontend Server" temp_frontend.bat

echo ⏳ Aguardando frontend inicializar...
timeout /t 5 >nul

echo.
echo ████████████████████████████████████████████████████████████████
echo ██                                                            ██
echo ██                      ✅ TUDO INICIADO!                     ██
echo ██                                                            ██
echo ████████████████████████████████████████████████████████████████
echo.
echo 🎯 SERVIÇOS RODANDO:
echo.
echo 🔵 Backend:   http://localhost:8001
echo 🔵 Frontend:  http://localhost:5173
echo 🔵 WebSocket: ws://localhost:8001/ws
echo.
echo 📱 Abra seu navegador em: http://localhost:5173
echo.
echo 💡 Para parar os servidores: feche as janelas ou use stop.bat
echo.

REM Aguardar um pouco e verificar se os servidores estão rodando
timeout /t 8 >nul

echo 🔍 Verificando status dos servidores...
echo.

netstat -an | findstr :8001 >nul
if %errorlevel% == 0 (
    echo ✅ Backend rodando na porta 8001
) else (
    echo ❌ Backend não está rodando na porta 8001
    echo 💡 Verifique a janela do Backend Server para erros
)

netstat -an | findstr :5173 >nul
if %errorlevel% == 0 (
    echo ✅ Frontend rodando na porta 5173
) else (
    echo ❌ Frontend não está rodando na porta 5173
    echo 💡 Verifique a janela do Frontend Server para erros
)

echo.
echo 🎉 Pronto! Sua aplicação deve estar rodando!
echo 🌐 Acesse: http://localhost:5173
echo.

REM Limpar arquivos temporários
del temp_backend.bat >nul 2>&1
del temp_frontend.bat >nul 2>&1

pause 