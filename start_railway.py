#!/usr/bin/env python3
"""
Script de inicialização para Railway
Garante que todas as dependências estão instaladas antes de iniciar o servidor
"""

import subprocess
import sys
import os

def install_requirements():
    """Instalar requirements se necessário"""
    try:
        import uvicorn
        import fastapi
        print("✅ Dependências Python já instaladas")
    except ImportError:
        print("📦 Instalando dependências Python...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

def start_server():
    """Iniciar servidor uvicorn"""
    port = int(os.environ.get("PORT", 8000))
    
    print(f"🚀 Iniciando servidor na porta {port}")
    print("📁 Diretório atual:", os.getcwd())
    print("📋 Arquivos:", os.listdir("."))
    
    # Importar e iniciar app
    from backend.main_deploy import app
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port)

if __name__ == "__main__":
    install_requirements()
    start_server() 