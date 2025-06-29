#!/usr/bin/env python3
"""
Setup script para Pitch Training App
Automatiza a instalação e execução do projeto
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def run_command(command, cwd=None, shell=False):
    """Executa um comando e retorna o resultado"""
    try:
        if shell or platform.system() == "Windows":
            result = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
        else:
            result = subprocess.run(command.split(), cwd=cwd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Erro executando: {command}")
            print(f"Saída: {result.stderr}")
            return False
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def check_python():
    """Verifica se Python está instalado"""
    try:
        version = sys.version_info
        if version.major < 3 or (version.major == 3 and version.minor < 8):
            print("❌ Python 3.8+ é necessário")
            return False
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} encontrado")
        return True
    except:
        print("❌ Python não encontrado")
        return False

def check_node():
    """Verifica se Node.js está instalado"""
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js {result.stdout.strip()} encontrado")
            return True
        else:
            print("❌ Node.js não encontrado")
            return False
    except:
        print("❌ Node.js não encontrado")
        return False

def setup_backend():
    """Configura o backend Python"""
    print("\n🔧 Configurando Backend...")
    
    backend_dir = Path("backend")
    backend_dir.mkdir(exist_ok=True)
    
    # Criar ambiente virtual
    venv_path = backend_dir / "venv"
    if not venv_path.exists():
        print("📦 Criando ambiente virtual...")
        if not run_command(f"python -m venv {venv_path}"):
            return False
    
    # Ativar ambiente virtual e instalar dependências
    if platform.system() == "Windows":
        activate_cmd = str(venv_path / "Scripts" / "activate")
        pip_cmd = str(venv_path / "Scripts" / "pip")
    else:
        activate_cmd = str(venv_path / "bin" / "activate")
        pip_cmd = str(venv_path / "bin" / "pip")
    
    print("📦 Instalando dependências do backend...")
    if not run_command(f"{pip_cmd} install -r requirements.txt", cwd=backend_dir):
        return False
    
    print("✅ Backend configurado com sucesso!")
    return True

def setup_frontend():
    """Configura o frontend React"""
    print("\n🔧 Configurando Frontend...")
    
    frontend_dir = Path("frontend")
    frontend_dir.mkdir(exist_ok=True)
    
    print("📦 Instalando dependências do frontend...")
    if not run_command("npm install", cwd=frontend_dir, shell=True):
        return False
    
    print("✅ Frontend configurado com sucesso!")
    return True

def start_backend():
    """Inicia o servidor backend"""
    print("\n🚀 Iniciando Backend...")
    
    backend_dir = Path("backend")
    if platform.system() == "Windows":
        python_cmd = str(backend_dir / "venv" / "Scripts" / "python")
    else:
        python_cmd = str(backend_dir / "venv" / "bin" / "python")
    
    # Executar em background
    try:
        process = subprocess.Popen([python_cmd, "main.py"], cwd=backend_dir)
        print(f"✅ Backend iniciado (PID: {process.pid})")
        print("📡 WebSocket: ws://localhost:8000/ws")
        print("🌐 API: http://localhost:8000")
        return process
    except Exception as e:
        print(f"❌ Erro ao iniciar backend: {e}")
        return None

def start_frontend():
    """Inicia o servidor frontend"""
    print("\n🚀 Iniciando Frontend...")
    
    frontend_dir = Path("frontend")
    try:
        # No Windows, usar shell=True para comandos npm
        if platform.system() == "Windows":
            process = subprocess.Popen(["npm", "run", "dev"], cwd=frontend_dir, shell=True)
        else:
            process = subprocess.Popen(["npm", "run", "dev"], cwd=frontend_dir)
        
        print(f"✅ Frontend iniciado (PID: {process.pid})")
        print("🌐 App: http://localhost:5173")
        return process
    except Exception as e:
        print(f"❌ Erro ao iniciar frontend: {e}")
        return None

def main():
    """Função principal"""
    print("🎵 Pitch Training App - Setup e Execução")
    print("=" * 50)
    
    # Verificar pré-requisitos
    if not check_python():
        print("\n❌ Instale Python 3.8+ primeiro")
        sys.exit(1)
    
    if not check_node():
        print("\n❌ Instale Node.js primeiro")
        sys.exit(1)
    
    # Verificar se já está configurado
    backend_configured = (Path("backend") / "venv").exists()
    frontend_configured = (Path("frontend") / "node_modules").exists()
    
    if not backend_configured:
        if not setup_backend():
            print("\n❌ Falha na configuração do backend")
            sys.exit(1)
    else:
        print("✅ Backend já configurado")
    
    if not frontend_configured:
        if not setup_frontend():
            print("\n❌ Falha na configuração do frontend")
            sys.exit(1)
    else:
        print("✅ Frontend já configurado")
    
    # Perguntar se quer iniciar os servidores
    print("\n🚀 Deseja iniciar os servidores agora? (y/n): ", end="")
    response = input().lower().strip()
    
    if response in ['y', 'yes', 's', 'sim']:
        backend_process = start_backend()
        if backend_process:
            frontend_process = start_frontend()
            if frontend_process:
                print("\n✅ Ambos os servidores estão rodando!")
                print("\n📋 Comandos úteis:")
                print("  - Abra http://localhost:5173 no navegador")
                print("  - Pressione Ctrl+C para parar os servidores")
                
                try:
                    # Aguardar até o usuário pressionar Ctrl+C
                    backend_process.wait()
                except KeyboardInterrupt:
                    print("\n⏹️  Parando servidores...")
                    backend_process.terminate()
                    frontend_process.terminate()
                    print("✅ Servidores parados")
    else:
        print("\n✅ Setup concluído!")
        print("\n📋 Para iniciar manualmente:")
        print("  Backend: cd backend && python main.py")
        print("  Frontend: cd frontend && npm run dev")

if __name__ == "__main__":
    main() 