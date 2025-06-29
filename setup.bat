@echo off
echo 🎵 Pitch Training App - Setup para Windows
echo ==========================================

REM Verificar se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python não encontrado. Instale Python 3.8+ primeiro.
    echo Download: https://python.org/downloads/
    pause
    exit /b 1
)

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado. Instale Node.js primeiro.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Pré-requisitos encontrados!
echo.

REM Executar setup em Python
python setup.py

pause 