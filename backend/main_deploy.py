#!/usr/bin/env python3
"""
Pitch Training Backend - Versão para Deploy (sem captura de áudio)
"""

import asyncio
import json
import math
import time
from typing import Optional
import random

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os


class NoteConverter:
    """Classe para converter frequências em notas musicais"""
    
    # Notas musicais
    NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    @staticmethod
    def frequency_to_note(frequency: float) -> dict:
        """Converte frequência para nota musical"""
        if frequency <= 0:
            return {"note": "", "octave": 0, "cents": 0, "frequency": 0}
        
        # A4 = 440 Hz como referência
        A4 = 440.0
        
        # Calcular o número de semitons desde A4
        semitones_from_a4 = 12 * math.log2(frequency / A4)
        
        # Calcular a nota e oitava
        note_index = int((semitones_from_a4 + 9) % 12)  # +9 para começar em C
        octave = int((semitones_from_a4 + 9) // 12) + 4
        
        # Calcular cents (desvio da afinação)
        exact_semitone = semitones_from_a4 + 9
        cents = int((exact_semitone - int(exact_semitone)) * 100)
        
        return {
            "note": NoteConverter.NOTE_NAMES[note_index],
            "octave": octave,
            "cents": cents,
            "frequency": round(frequency, 2)
        }
    
    @staticmethod
    def note_to_frequency(note: str, octave: int) -> float:
        """Converte nota musical para frequência"""
        # A4 = 440 Hz como referência
        A4 = 440.0
        
        # Encontrar o índice da nota
        if note not in NoteConverter.NOTE_NAMES:
            return 0.0
        
        note_index = NoteConverter.NOTE_NAMES.index(note)
        
        # Calcular semitons desde A4
        semitones_from_a4 = (octave - 4) * 12 + (note_index - 9)
        
        # Calcular frequência
        frequency = A4 * (2 ** (semitones_from_a4 / 12))
        
        return round(frequency, 2)


class MockPitchGenerator:
    """Gerador simulado de pitch para demonstração"""
    
    def __init__(self):
        self.current_note = "A"
        self.current_octave = 4
        self.base_frequency = 440.0
        self.variation = 0
        
    def get_mock_pitch(self) -> float:
        """Gera um pitch simulado com variação natural"""
        # Adicionar variação aleatória para simular voz humana
        self.variation += random.uniform(-5, 5)
        self.variation = max(-30, min(30, self.variation))  # Limitar variação
        
        # Calcular frequência com variação
        frequency = self.base_frequency + self.variation
        
        # Ocasionalmente mudar para uma nota diferente
        if random.random() < 0.02:  # 2% chance
            notes = ["C", "D", "E", "F", "G", "A", "B"]
            octaves = [3, 4, 5]
            self.current_note = random.choice(notes)
            self.current_octave = random.choice(octaves)
            self.base_frequency = NoteConverter.note_to_frequency(self.current_note, self.current_octave)
            self.variation = 0
        
        return max(80, min(2000, frequency))  # Manter na faixa vocal


class ConnectionManager:
    """Gerenciador de conexões WebSocket"""
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.mock_generator = MockPitchGenerator()
        self.is_broadcasting = False
        
    async def connect(self, websocket: WebSocket):
        """Aceita uma nova conexão WebSocket"""
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # Iniciar broadcasting se é a primeira conexão
        if len(self.active_connections) == 1:
            await self.start_broadcasting()
    
    def disconnect(self, websocket: WebSocket):
        """Remove uma conexão WebSocket"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Parar broadcasting se não há mais conexões
        if len(self.active_connections) == 0:
            self.stop_broadcasting()
    
    async def broadcast(self, data: dict):
        """Envia dados para todas as conexões ativas"""
        if not self.active_connections:
            return
        
        message = json.dumps(data)
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.append(connection)
        
        # Remove conexões desconectadas
        for connection in disconnected:
            self.disconnect(connection)
    
    async def start_broadcasting(self):
        """Inicia o broadcasting de dados simulados"""
        if self.is_broadcasting:
            return
        
        self.is_broadcasting = True
        
        # Loop para enviar dados continuamente
        while self.is_broadcasting and self.active_connections:
            try:
                # Gerar pitch simulado
                pitch = self.mock_generator.get_mock_pitch()
                
                # Converter para nota
                note_info = NoteConverter.frequency_to_note(pitch)
                
                # Preparar dados
                data = {
                    "type": "pitch_data",
                    "pitch": pitch,
                    "note": note_info["note"],
                    "octave": note_info["octave"],
                    "cents": note_info["cents"],
                    "frequency": note_info["frequency"],
                    "timestamp": time.time(),
                    "demo": True  # Indica que são dados simulados
                }
                
                # Enviar dados
                await self.broadcast(data)
                
                # Aguardar antes da próxima leitura
                await asyncio.sleep(0.05)  # 20 FPS
                
            except Exception as e:
                print(f"Erro no broadcast: {e}")
                break
    
    def stop_broadcasting(self):
        """Para o broadcasting"""
        self.is_broadcasting = False


# Criar aplicação FastAPI
app = FastAPI(
    title="Pitch Training Backend", 
    version="1.0.0",
    description="Backend para treinamento de afinação vocal - Versão Demo"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gerenciador de conexões
manager = ConnectionManager()

# Configurar arquivos estáticos do frontend
frontend_build_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_build_path):
    app.mount("/static", StaticFiles(directory=frontend_build_path), name="static")
    print(f"📁 Frontend encontrado em: {frontend_build_path}")
else:
    print(f"⚠️ Frontend não encontrado em: {frontend_build_path}")


@app.get("/api")
async def api_root():
    """Endpoint da API"""
    return {
        "message": "🎵 Pitch Training Backend está rodando!",
        "version": "1.0.0",
        "mode": "hybrid",
        "info": "Backend híbrido: aceita dados simulados e dados reais do frontend via WebSocket."
    }


@app.get("/notes")
async def get_notes():
    """Retorna lista de notas disponíveis"""
    notes = []
    for octave in range(2, 7):  # C2 até B6
        for note in NoteConverter.NOTE_NAMES:
            frequency = NoteConverter.note_to_frequency(note, octave)
            notes.append({
                "note": note,
                "octave": octave,
                "frequency": frequency,
                "display": f"{note}{octave}"
            })
    return {"notes": notes}


@app.get("/status")
async def status():
    """Status da aplicação"""
    return {
        "status": "running",
        "connections": len(manager.active_connections),
        "mode": "demo",
        "features": {
            "websocket": True,
            "pitch_detection": False,
            "audio_input": False,
            "simulated_data": True
        }
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Endpoint WebSocket para transmissão de dados de pitch"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Receber dados do cliente
            data = await websocket.receive_text()
            
            try:
                command = json.loads(data)
                
                # Processar dados de áudio vindos do frontend
                if command.get("type") == "audio_data":
                    frequency = command.get("frequency", 0)
                    amplitude = command.get("amplitude", 0)
                    
                    if frequency > 80 and frequency < 2000:  # Frequências válidas
                        # Converter para nota musical
                        note_info = NoteConverter.frequency_to_note(frequency)
                        
                        # Preparar resposta
                        response_data = {
                            "type": "pitch_data",
                            "pitch": frequency,
                            "note": note_info["note"],
                            "octave": note_info["octave"],
                            "cents": note_info["cents"],
                            "frequency": note_info["frequency"],
                            "timestamp": time.time(),
                            "demo": False,  # Dados reais do frontend
                            "amplitude": amplitude
                        }
                        
                        # Enviar de volta para o cliente
                        await websocket.send_text(json.dumps(response_data))
                        
                        # Parar dados simulados quando receber dados reais
                        if manager.is_broadcasting:
                            manager.stop_broadcasting()
                
                elif command.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"Erro WebSocket: {e}")
        manager.disconnect(websocket)


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Servir frontend React para todas as rotas não-API"""
    
    # Rotas da API não devem servir o frontend
    if full_path.startswith(("api", "ws", "notes", "status")) or full_path == "":
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Use /api, /notes, /status, or /ws")
    
    frontend_build_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
    
    # Se existe o arquivo específico, servir ele
    file_path = os.path.join(frontend_build_path, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Caso contrário, servir o index.html (para React Router)
    index_path = os.path.join(frontend_build_path, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    
    # Se não existe frontend buildado, retornar mensagem
    return {
        "message": "Frontend não encontrado. Execute 'npm run build' no diretório frontend/",
        "api_available": True,
        "endpoints": {
            "api": "/",
            "notes": "/notes", 
            "status": "/status",
            "websocket": "/ws"
        }
    }


if __name__ == "__main__":
    import uvicorn
    import os
    
    # Usar porta do Railway ou 8000 como fallback
    port = int(os.environ.get("PORT", 8000))
    
    print("🎵 Iniciando Pitch Training Backend - Versão Demo...")
    print(f"📡 Rodando na porta: {port}")
    print("⚠️  DEMO MODE: Dados simulados (sem captura de áudio real)")
    
    uvicorn.run(app, host="0.0.0.0", port=port) 