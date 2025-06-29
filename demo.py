#!/usr/bin/env python3
"""
Demo rápida do detector de pitch
Testa a funcionalidade básica sem interface gráfica
"""

import sys
import time
import math
try:
    import aubio
    import sounddevice as sd
    import numpy as np
except ImportError as e:
    print(f"❌ Dependência não encontrada: {e}")
    print("💡 Execute: pip install aubio sounddevice numpy")
    sys.exit(1)

class PitchDemo:
    """Demo simples do detector de pitch"""
    
    def __init__(self):
        self.sample_rate = 44100
        self.buffer_size = 4096
        
        # Configurar detector de pitch
        self.pitch_detector = aubio.pitch("default", self.buffer_size, self.buffer_size//4, self.sample_rate)
        self.pitch_detector.set_unit("Hz")
        self.pitch_detector.set_tolerance(0.8)
        
        # Notas musicais
        self.note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    def frequency_to_note(self, frequency):
        """Converte frequência para nota musical"""
        if frequency <= 0:
            return "Silêncio", 0, 0
        
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
        
        return self.note_names[note_index], octave, cents
    
    def run_demo(self, duration=10):
        """Executa a demo por um tempo determinado"""
        print("🎵 Demo do Detector de Pitch")
        print("=" * 40)
        print(f"⏱️  Executando por {duration} segundos...")
        print("🎤 Fale, cante ou assovie no microfone!")
        print("📊 Pressione Ctrl+C para parar\n")
        
        start_time = time.time()
        
        def audio_callback(indata, frames, time, status):
            if status:
                print(f"Status: {status}")
            
            # Converter para float32 e mono
            audio_data = indata[:, 0].astype(np.float32)
            
            # Detectar pitch
            pitch = self.pitch_detector(audio_data)[0]
            
            # Mostrar resultado se há som suficiente
            if pitch > 80:  # Filtrar ruído muito baixo
                note, octave, cents = self.frequency_to_note(pitch)
                
                # Barra de afinação simples
                bar_length = 20
                center = bar_length // 2
                offset = int((cents / 100) * (bar_length // 2))
                position = max(0, min(bar_length - 1, center + offset))
                
                bar = ['-'] * bar_length
                bar[center] = '|'  # Centro
                bar[position] = '●'  # Posição atual
                
                # Cor baseada na afinação
                if abs(cents) <= 10:
                    status_icon = "✅"  # Afinado
                elif abs(cents) <= 30:
                    status_icon = "⚠️"   # Próximo
                else:
                    status_icon = "❌"  # Desafinado
                
                print(f"\r{status_icon} {note}{octave} | {pitch:6.1f} Hz | {''.join(bar)} | {cents:+3d}¢", end='', flush=True)
        
        try:
            # Iniciar stream de áudio
            with sd.InputStream(
                callback=audio_callback,
                channels=1,
                samplerate=self.sample_rate,
                blocksize=self.buffer_size//4,
                dtype=np.float32
            ):
                while time.time() - start_time < duration:
                    time.sleep(0.1)
                    
        except KeyboardInterrupt:
            pass
        finally:
            print("\n\n✅ Demo finalizada!")

def main():
    """Função principal"""
    try:
        demo = PitchDemo()
        
        # Verificar se há dispositivos de áudio
        devices = sd.query_devices()
        input_devices = [d for d in devices if d['max_input_channels'] > 0]
        
        if not input_devices:
            print("❌ Nenhum dispositivo de entrada de áudio encontrado")
            return
        
        print(f"🎤 Usando dispositivo: {sd.query_devices(kind='input')['name']}")
        
        # Executar demo
        demo.run_demo(30)  # 30 segundos
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        print("💡 Verifique se o microfone está conectado e funcionando")

if __name__ == "__main__":
    main() 