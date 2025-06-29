import React, { useState, useEffect, useRef } from 'react';
import { Music, Settings, Play, Pause, Target, Mic, MicOff, Coffee, Code, Zap } from 'lucide-react';
import PitchChart from './components/PitchChart';
import NoteSelector from './components/NoteSelector';
import PitchIndicator from './components/PitchIndicator';
import { config } from './utils/config';

// Tipos TypeScript
interface PitchData {
  type: string;
  pitch: number;
  note: string;
  octave: number;
  cents: number;
  frequency: number;
  timestamp: number;
}

interface Note {
  note: string;
  octave: number;
  frequency: number;
  display: string;
}

const App: React.FC = () => {
  // Estados
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentPitch, setCurrentPitch] = useState<PitchData | null>(null);
  const [pitchHistory, setPitchHistory] = useState<PitchData[]>([]);
  const [targetNote, setTargetNote] = useState<Note | null>(null);
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const pitchHistoryRef = useRef<PitchData[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isListeningRef = useRef<boolean>(false);

  // Solicitar permissão do microfone
  const requestMicrophonePermission = async () => {
    try {
      setMicError(null);
      console.log('🎤 Solicitando permissão do microfone...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          // Configurações específicas para mobile/alta sensibilidade
          ...(navigator.userAgent.includes('Mobile') && {
            latency: 0,
            deviceId: 'default'
          })
        } 
      });
      
      mediaStreamRef.current = stream;
      setHasMicPermission(true);
      console.log('✅ Permissão do microfone concedida!');
      console.log('🎤 Stream ativo:', stream.active);
      console.log('🎤 Tracks de áudio:', stream.getAudioTracks().length);
      
      // Configurar Web Audio API
      setupAudioContext();
      
    } catch (error) {
      console.error('❌ Erro ao acessar microfone:', error);
      setMicError('Não foi possível acessar o microfone. Verifique as permissões.');
      setHasMicPermission(false);
    }
  };

  // Configurar contexto de áudio com MÁXIMA SENSIBILIDADE
  const setupAudioContext = () => {
    if (!mediaStreamRef.current) return;

    try {
      audioContextRef.current = new AudioContext({ sampleRate: 44100 });
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      
      // 🚀 SUPER AMPLIFICAÇÃO - Ganho muito mais alto
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 25.0; // 25x amplificação para móveis!
      
      // 🔥 COMPRESSOR para amplificar sinais fracos
      const compressor = audioContextRef.current.createDynamicsCompressor();
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;
      
      // 📊 ANALYSER com configurações extremamente sensíveis
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096; // FFT maior para mais precisão
      analyserRef.current.smoothingTimeConstant = 0.0; // Sem suavização - máxima responsividade
      analyserRef.current.minDecibels = -120; // Capturar sussurros
      analyserRef.current.maxDecibels = -10; // Range expandido
      
      // 🔗 CADEIA DE ÁUDIO OTIMIZADA: source → gain → compressor → analyser
      source.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(analyserRef.current);
      
      console.log('🚀 SUPER SENSIBILIDADE ATIVADA!');
      console.log(`📊 Sample Rate: ${audioContextRef.current.sampleRate} Hz`);
      console.log(`📊 FFT Size: ${analyserRef.current.fftSize}`);
      console.log('🔥 CONFIGURAÇÃO MÓVEL: Ganho 25x + Compressor + Threshold 0.00001!');
      console.log('🎤 Ideal para celulares e sussurros!');
    } catch (error) {
      console.error('❌ Erro ao configurar áudio:', error);
      setMicError('Erro ao configurar captura de áudio.');
    }
  };

  // Detectar pitch usando FFT melhorado
  const detectPitch = () => {
    if (!analyserRef.current || !isListeningRef.current) {
      console.log('⚠️ Detector parado - analyser:', !!analyserRef.current, 'listening:', isListeningRef.current);
      return;
    }

    // Usar dados de tempo para melhor detecção
    const bufferLength = analyserRef.current.fftSize;
    const timeData = new Float32Array(bufferLength);
    const freqData = new Float32Array(analyserRef.current.frequencyBinCount);
    
    analyserRef.current.getFloatTimeDomainData(timeData);
    analyserRef.current.getFloatFrequencyData(freqData);

    // Calcular RMS para detectar se há som
    let rms = 0;
    for (let i = 0; i < timeData.length; i++) {
      rms += timeData[i] * timeData[i];
    }
    rms = Math.sqrt(rms / timeData.length);

         // 📊 Atualizar indicador de nível (ajustado para SUPER ganho)
     setAudioLevel(Math.min(rms * 200, 100)); // Multiplicador alto para mostrar atividade

     // 🎤 THRESHOLD EXTREMAMENTE BAIXO - Detecta até respiração!
     if (rms > 0.00001) { // 100x mais sensível que antes!
       // Método simples de detecção de pitch via autocorrelação
       const frequency = autoCorrelate(timeData, audioContextRef.current?.sampleRate || 44100);
       
                // Filtrar frequências válidas
         if (frequency > 80 && frequency < 2000) {
           // Log apenas a cada 10 detecções para não spammar
           if (Math.random() < 0.1) {
             console.log(`🎤 Freq: ${frequency.toFixed(1)} Hz, RMS: ${rms.toFixed(4)}`);
           }

           // Enviar dados para o backend via WebSocket
           if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
             const pitchData = {
               type: 'audio_data',
               frequency: frequency,
               amplitude: rms,
               timestamp: Date.now() / 1000
             };
             
             wsRef.current.send(JSON.stringify(pitchData));
           } else {
             console.log('⚠️ WebSocket não conectado, readyState:', wsRef.current?.readyState);
           }
         }
     }

         // Continuar detecção
     if (isListeningRef.current) {
       animationFrameRef.current = requestAnimationFrame(detectPitch);
     }
  };

  // Função de autocorrelação simplificada e corrigida
  const autoCorrelate = (buffer: Float32Array, sampleRate: number): number => {
    const SIZE = buffer.length;
    const correlations = new Array(Math.floor(SIZE / 2));
    
    // Calcular autocorrelação
    for (let i = 0; i < correlations.length; i++) {
      let sum = 0;
      for (let j = 0; j < SIZE - i; j++) {
        sum += buffer[j] * buffer[j + i];
      }
      correlations[i] = sum / (SIZE - i);
    }

    // Encontrar o primeiro mínimo local
    let d = 1;
    while (d < correlations.length - 1 && correlations[d] > correlations[d + 1]) {
      d++;
    }

    // Encontrar o máximo depois do primeiro mínimo
    let maxVal = -1;
    let maxPos = -1;
    
    // Limitar busca à faixa de frequências vocais (80-800 Hz)
    const minPeriod = Math.floor(sampleRate / 800); // 800 Hz max
    const maxPeriod = Math.floor(sampleRate / 80);  // 80 Hz min

    for (let i = Math.max(d, minPeriod); i < Math.min(correlations.length, maxPeriod); i++) {
      if (correlations[i] > maxVal) {
        maxVal = correlations[i];
        maxPos = i;
      }
    }

    if (maxPos === -1 || maxVal < 0.01) { // Threshold SUPER baixo para máxima detecção
      return -1; // Sem pitch detectado
    }

    // Interpolação parabólica para melhor precisão
    let T0 = maxPos;
    if (maxPos > 0 && maxPos < correlations.length - 1) {
      const x1 = correlations[maxPos - 1];
      const x2 = correlations[maxPos];
      const x3 = correlations[maxPos + 1];

      const a = (x1 - 2 * x2 + x3) / 2;
      const b = (x3 - x1) / 2;

      if (a !== 0) {
        T0 = maxPos - b / (2 * a);
      }
    }

    return sampleRate / T0;
  };

  // Iniciar/parar captura de áudio
  const toggleListening = async () => {
    if (!hasMicPermission) {
      await requestMicrophonePermission();
      return;
    }

    if (isListening) {
      // Parar captura
      setIsListening(false);
      isListeningRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      console.log('🛑 Captura de áudio parada');
    } else {
      // Iniciar captura
      setIsListening(true);
      isListeningRef.current = true;
      console.log('🎤 Iniciando captura de áudio...');
      detectPitch();
      console.log('🎤 Detector de pitch iniciado');
    }
  };

  // Conectar ao WebSocket
  const connectWebSocket = () => {
    // Fechar conexão anterior se existir
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      console.log('🔄 Tentando conectar ao WebSocket em', config.wsURL);
      const ws = new WebSocket(config.wsURL);
      
      ws.onopen = () => {
        console.log('🔗 Conectado ao WebSocket');
        setIsConnected(true);
        setConnectionError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data: PitchData = JSON.parse(event.data);
          
          if (data.type === 'pitch_data') {
            setCurrentPitch(data);
            
            // Adicionar ao histórico
            const newHistory = [...pitchHistoryRef.current, data].slice(-100);
            pitchHistoryRef.current = newHistory;
            setPitchHistory(newHistory);
          }
        } catch (error) {
          console.error('Erro ao processar dados do WebSocket:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('❌ WebSocket desconectado', event.code, event.reason);
        setIsConnected(false);
        setConnectionError('Conexão perdida com o servidor');
        
        // Tentar reconectar após 3 segundos
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            console.log('🔄 Tentando reconectar...');
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        setConnectionError('Erro na conexão WebSocket');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      setConnectionError('Não foi possível conectar ao servidor');
    }
  };

  // Desconectar WebSocket
  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
  };

  // Buscar notas disponíveis
  const fetchAvailableNotes = async () => {
    try {
      console.log('📋 Buscando notas disponíveis em:', config.notesURL);
      const response = await fetch(config.notesURL);
      const data = await response.json();
      setAvailableNotes(data.notes);
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      // Limpar recursos quando o componente for desmontado
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      disconnectWebSocket();
    };
  }, []);

  // Efeito para conectar automaticamente
  useEffect(() => {
    fetchAvailableNotes();
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, []);

  // Calcular diferença da nota alvo
  const calculatePitchDifference = (): { cents: number; isInTune: boolean } => {
    if (!currentPitch || !targetNote || currentPitch.pitch <= 0) {
      return { cents: 0, isInTune: false };
    }

    const currentFreq = currentPitch.frequency;
    const targetFreq = targetNote.frequency;
    
    if (currentFreq <= 0 || targetFreq <= 0) {
      return { cents: 0, isInTune: false };
    }

    const cents = Math.round(1200 * Math.log2(currentFreq / targetFreq));
    const isInTune = Math.abs(cents) <= 10;

    return { cents, isInTune };
  };

  const pitchDiff = calculatePitchDifference();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <header className="text-center mb-6 sm:mb-8 lg:mb-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <Music className="w-8 h-8 sm:w-10 sm:h-10 text-music-primary" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-music-primary to-music-secondary bg-clip-text text-transparent">
              Detector de Pitch - Afinador Musical
            </h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-gray-300 max-w-2xl mx-auto px-4">
            Use seu microfone para detectar a frequência da sua voz ou instrumento em tempo real
          </p>
        </header>

        {/* Status do Microfone */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3">
                {hasMicPermission ? (
                  <Mic className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <MicOff className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <span className="font-medium text-sm sm:text-base">
                  {hasMicPermission ? 'Microfone Autorizado' : 'Microfone Não Autorizado'}
                </span>
              </div>
              {micError && (
                <span className="text-red-400 text-xs sm:text-sm">
                  ({micError})
                </span>
              )}
              {hasMicPermission && (
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-400">Volume:</span>
                  <div className="w-16 sm:w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all duration-75"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={hasMicPermission ? toggleListening : requestMicrophonePermission}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto ${
                !hasMicPermission
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                  : isListening 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
            >
              {!hasMicPermission ? (
                <>
                  <Mic className="w-4 h-4 inline-block mr-2" />
                  Permitir Microfone
                </>
              ) : isListening ? (
                <>
                  <Pause className="w-4 h-4 inline-block mr-2" />
                  Parar Captura
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 inline-block mr-2" />
                  Iniciar Captura
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status da Conexão */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="font-medium text-sm sm:text-base">
                  {isConnected ? 'Conectado ao Servidor' : 'Desconectado'}
                </span>
              </div>
              {connectionError && (
                <span className="text-red-400 text-xs sm:text-sm">
                  ({connectionError})
                </span>
              )}
            </div>
            
            <button
              onClick={isConnected ? disconnectWebSocket : connectWebSocket}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto ${
                isConnected 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                  : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              }`}
            >
              {isConnected ? 'Desconectar' : 'Conectar'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Coluna Principal - Detecção de Pitch */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            {/* Display da Nota Atual */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 sm:p-8 text-center">
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-300 mb-2">
                  Nota Atual
                </h2>
                {currentPitch && currentPitch.pitch > 0 ? (
                  <div className="space-y-2">
                    <div className={`text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent ${pitchDiff.isInTune ? 'animate-pulse' : ''}`}>
                      {currentPitch.note}{currentPitch.octave}
                    </div>
                    <div className="text-xl sm:text-2xl font-medium text-gray-300">
                      {currentPitch.frequency} Hz
                    </div>
                    {targetNote && (
                      <div className="text-base sm:text-lg font-medium">
                        <span className={`${
                          pitchDiff.isInTune 
                            ? 'text-green-400' 
                            : Math.abs(pitchDiff.cents) > 50 
                              ? 'text-red-400' 
                              : 'text-yellow-400'
                        }`}>
                          {pitchDiff.cents > 0 ? '+' : ''}{pitchDiff.cents} cents
                        </span>
                        {pitchDiff.isInTune && (
                          <span className="ml-2 text-green-400">✓ Afinado!</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-500">
                    {isListening ? '🎤 Ouvindo...' : '🔇 Silêncio'}
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico de Pitch */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 flex-shrink-0" />
                Gráfico de Pitch
              </h3>
              <div className="h-48 sm:h-64">
                <PitchChart 
                  data={pitchHistory} 
                  targetFrequency={targetNote?.frequency} 
                />
              </div>
            </div>
          </div>

          {/* Sidebar - Controles */}
          <div className="space-y-4 sm:space-y-6">
            {/* Seletor de Nota Alvo */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 flex-shrink-0" />
                Nota Alvo
              </h3>
              <NoteSelector
                notes={availableNotes}
                selectedNote={targetNote}
                onSelectNote={setTargetNote}
              />
              
              {targetNote && (
                <div className="mt-4 p-3 bg-white/5 rounded-lg">
                  <div className="text-sm text-gray-300">
                    <div>Nota: <span className="font-medium text-white">{targetNote.display}</span></div>
                    <div>Frequência: <span className="font-medium text-white">{targetNote.frequency} Hz</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Indicador de Afinação */}
            {targetNote && (
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-4">
                  Indicador de Afinação
                </h3>
                <PitchIndicator
                  currentPitch={currentPitch}
                  targetNote={targetNote}
                  pitchDifference={pitchDiff}
                />
              </div>
            )}

            {/* Estatísticas */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                Estatísticas
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Pontos coletados:</span>
                  <span className="font-medium">{pitchHistory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Microfone:</span>
                  <span className={`font-medium ${hasMicPermission ? 'text-green-400' : 'text-red-400'}`}>
                    {hasMicPermission ? 'Autorizado' : 'Não autorizado'}
                  </span>
                </div>  
                <div className="flex justify-between">
                  <span className="text-gray-300">Captura:</span>
                  <span className={`font-medium ${isListening ? 'text-green-400' : 'text-gray-400'}`}>
                    {isListening ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Nível de áudio:</span>
                  <span className="font-medium text-blue-400">
                    {audioLevel.toFixed(1)}%
                  </span>
                </div>
                {currentPitch && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Última atualização:</span>
                      <span className="font-medium text-xs sm:text-sm">
                        {new Date(currentPitch.timestamp * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pitch atual:</span>
                      <span className="font-medium">{currentPitch.pitch.toFixed(1)} Hz</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-white/10">
          <div className="text-center space-y-4">
            {/* Créditos */}
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <span>Desenvolvido com muito</span>
              <Coffee className="w-5 h-5 text-amber-400" />
              <span>por um futuro Dev</span>
            </div>

            {/* Stacks Usadas */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-400 flex items-center justify-center gap-2">
                <Code className="w-4 h-4" />
                Stacks Usadas
              </h4>
              
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                {/* Frontend */}
                <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                  <Zap className="w-3 h-3" />
                  React 18
                </div>
                <div className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                  TypeScript
                </div>
                <div className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full">
                  TailwindCSS
                </div>
                <div className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                  Vite
                </div>
                <div className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full">
                  Recharts
                </div>
                <div className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full">
                  Web Audio API
                </div>
                
                {/* Backend */}
                <div className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
                  Python
                </div>
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                  FastAPI
                </div>
                <div className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full">
                  WebSockets
                </div>
                
                {/* Deploy */}
                <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full">
                  Railway
                </div>
                <div className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-full">
                  GitHub
                </div>
              </div>
            </div>

            {/* Descrição técnica */}
            <div className="text-xs text-gray-500 max-w-2xl mx-auto">
              Aplicação full-stack para treinamento de afinação vocal em tempo real. 
              Frontend com Web Audio API para captura de microfone, backend Python para processamento de dados, 
              comunicação via WebSocket para latência mínima.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App; 