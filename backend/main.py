#!/usr/bin/env python3
"""
Pitch Training Backend - Detecta pitch em tempo real e envia via WebSocket
"""

import asyncio
import json
import math
import threading
import time
from typing import Optional

import aubio
import numpy as np
import sounddevice as sd
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware


class PitchDetector:
    """Classe para detectar pitch em tempo real usando Aubio"""
    
    def __init__(self, sample_rate: int = 44100, buffer_size: int = 4096):
        self.sample_rate = sample_rate
        self.buffer_size = buffer_size
        
        # Configurar detector de pitch do Aubio
        self.pitch_detector = aubio.pitch("default", self.buffer_size, self.buffer_size//4, self.sample_rate)
        self.pitch_detector.set_unit("Hz")
        self.pitch_detector.set_tolerance(0.8)
        
        # Buffer para armazenar áudio
        self.audio_buffer = np.zeros(self.buffer_size, dtype=np.float32)
        self.current_pitch = 0.0
        self.is_recording = False
        
    def start_recording(self):
        """Inicia a captura de áudio"""
        self.is_recording = True
        
        def audio_callback(indata, frames, time, status):
            if status:
                print(f"Áudio status: {status}")
            
            # Converter para float32 e mono
            audio_data = indata[:, 0].astype(np.float32)
            
            # Detectar pitch
            pitch = self.pitch_detector(audio_data)[0]
            
            # Filtrar ruído (frequências muito baixas ou muito altas)
            if 80 <= pitch <= 2000:  # Faixa vocal humana típica
                self.current_pitch = pitch
            else:
                self.current_pitch = 0.0
        
        # Iniciar stream de áudio
        self.stream = sd.InputStream(
            callback=audio_callback,
            channels=1,
            samplerate=self.sample_rate,
            blocksize=self.buffer_size//4,
            dtype=np.float32
        )
        self.stream.start()
        
    def stop_recording(self):
        """Para a captura de áudio"""
        self.is_recording = False
        if hasattr(self, 'stream'):
            self.stream.stop()
            self.stream.close()
    
    def get_current_pitch(self) -> float:
        """Retorna o pitch atual detectado"""
        return self.current_pitch


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


class ConnectionManager:
    """Gerenciador de conexões WebSocket"""
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.pitch_detector = PitchDetector()
        self.is_broadcasting = False
        
    async def connect(self, websocket: WebSocket):
        """Aceita uma nova conexão WebSocket"""
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # Iniciar detecção de pitch se é a primeira conexão
        if len(self.active_connections) == 1:
            self.start_pitch_detection()
    
    def disconnect(self, websocket: WebSocket):
        """Remove uma conexão WebSocket"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Parar detecção se não há mais conexões
        if len(self.active_connections) == 0:
            self.stop_pitch_detection()
    
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
    
    def start_pitch_detection(self):
        """Inicia a detecção de pitch e broadcasting"""
        if self.is_broadcasting:
            return
        
        self.is_broadcasting = True
        self.pitch_detector.start_recording()
        
        # Thread para enviar dados continuamente
        def broadcast_loop():
            while self.is_broadcasting and self.active_connections:
                try:
                    # Obter pitch atual
                    pitch = self.pitch_detector.get_current_pitch()
                    
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
                        "timestamp": time.time()
                    }
                    
                    # Enviar dados (usar asyncio para executar a função async)
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(self.broadcast(data))
                    loop.close()
                    
                    # Aguardar um pouco antes da próxima leitura
                    time.sleep(0.05)  # 20 FPS
                    
                except Exception as e:
                    print(f"Erro no broadcast: {e}")
                    break
        
        # Iniciar thread
        self.broadcast_thread = threading.Thread(target=broadcast_loop, daemon=True)
        self.broadcast_thread.start()
    
    def stop_pitch_detection(self):
        """Para a detecção de pitch"""
        self.is_broadcasting = False
        self.pitch_detector.stop_recording()


# Criar aplicação FastAPI
app = FastAPI(title="Pitch Training Backend", version="1.0.0")

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


@app.get("/")
async def root():
    """Endpoint raiz"""
    return {"message": "Pitch Training Backend está rodando!"}


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


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Endpoint WebSocket para transmissão de dados de pitch"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Manter conexão viva
            data = await websocket.receive_text()
            
            # Processar comandos do cliente se necessário
            try:
                command = json.loads(data)
                if command.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"Erro WebSocket: {e}")
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    
    print("🎵 Iniciando Pitch Training Backend...")
    print("📡 WebSocket: ws://localhost:8000/ws")
    print("🌐 API: http://localhost:8000")
    print("📋 Notas: http://localhost:8000/notes")
    
    uvicorn.run(app, host="0.0.0.0", port=8000) 