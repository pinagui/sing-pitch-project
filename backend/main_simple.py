#!/usr/bin/env python3
"""
Pitch Training Backend - Versão Simplificada para Windows
Detecta pitch usando análise de frequência básica sem Aubio
"""

import asyncio
import json
import math
import threading
import time
from typing import Optional

import numpy as np
import sounddevice as sd
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware


class SimplePitchDetector:
    """Detector de pitch simples usando FFT"""
    
    def __init__(self, sample_rate: int = 44100, buffer_size: int = 4096):
        self.sample_rate = sample_rate
        self.buffer_size = buffer_size
        self.current_pitch = 0.0
        self.is_recording = False
        
    def detect_pitch_fft(self, audio_data):
        """Detecta pitch usando FFT"""
        # Aplicar janela de Hanning para reduzir vazamento espectral
        windowed = audio_data * np.hanning(len(audio_data))
        
        # Calcular FFT
        fft = np.fft.rfft(windowed)
        magnitude = np.abs(fft)
        
        # Encontrar o pico de frequência
        peak_index = np.argmax(magnitude)
        
        # Converter índice para frequência
        frequency = peak_index * self.sample_rate / len(audio_data)
        
        # Filtrar frequências irrelevantes
        if frequency < 80 or frequency > 2000:
            return 0.0
        
        # Verificar se o pico é significativo
        if magnitude[peak_index] < np.mean(magnitude) * 3:
            return 0.0
        
        return frequency
    
    def start_recording(self):
        """Inicia a captura de áudio"""
        self.is_recording = True
        
        def audio_callback(indata, frames, time, status):
            if status:
                print(f"Áudio status: {status}")
            
            # Converter para float32 e mono
            audio_data = indata[:, 0].astype(np.float32)
            
            # Detectar pitch usando FFT
            pitch = self.detect_pitch_fft(audio_data)
            
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
        self.pitch_detector = SimplePitchDetector()
        self.is_broadcasting = False
        
    async def connect(self, websocket: WebSocket):
        """Aceita uma nova conexão WebSocket"""
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remove uma conexão WebSocket"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
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
    
    # Métodos de detecção automática removidos - agora o frontend envia os dados


# Criar aplicação FastAPI
app = FastAPI(title="Pitch Training Backend (Simplified)", version="1.0.0")

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
    return {"message": "Pitch Training Backend (Simplified) está rodando!"}


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
            # Receber dados do cliente
            data = await websocket.receive_text()
            
            # Processar comandos do cliente
            try:
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                
                elif message.get("type") == "audio_data":
                    # Processar dados de áudio do frontend
                    frequency = message.get("frequency", 0)
                    amplitude = message.get("amplitude", 0)
                    timestamp = message.get("timestamp", time.time())
                    
                    if frequency > 0:
                        # Converter para nota
                        note_info = NoteConverter.frequency_to_note(frequency)
                        
                        # Preparar dados de resposta
                        pitch_data = {
                            "type": "pitch_data",
                            "pitch": frequency,
                            "note": note_info["note"],
                            "octave": note_info["octave"],
                            "cents": note_info["cents"],
                            "frequency": note_info["frequency"],
                            "timestamp": timestamp
                        }
                        
                        # Enviar dados processados de volta
                        await websocket.send_text(json.dumps(pitch_data))
                        
            except json.JSONDecodeError:
                print("Erro ao decodificar JSON do WebSocket")
            except Exception as e:
                print(f"Erro ao processar mensagem WebSocket: {e}")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"Erro WebSocket: {e}")
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    
    print("🎵 Iniciando Pitch Training Backend (Simplified)...")
    print("⚠️  Usando detector de pitch simplificado (sem Aubio)")
    print("📡 WebSocket: ws://localhost:8001/ws")
    print("🌐 API: http://localhost:8001")
    print("📋 Notas: http://localhost:8001/notes")
    
    uvicorn.run(app, host="0.0.0.0", port=8001) 