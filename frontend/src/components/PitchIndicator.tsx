import React from 'react';

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

interface PitchIndicatorProps {
  currentPitch: PitchData | null;
  targetNote: Note;
  pitchDifference: { cents: number; isInTune: boolean };
}

const PitchIndicator: React.FC<PitchIndicatorProps> = ({ 
  currentPitch, 
  targetNote, 
  pitchDifference 
}) => {
  // Calcular posição da barra (0-100%)
  const getBarPosition = () => {
    if (!currentPitch || currentPitch.pitch <= 0) {
      return 50; // Centro se não há pitch
    }
    
    // Mapear cents (-100 a +100) para posição (0-100%)
    const maxCents = 100;
    const clampedCents = Math.max(-maxCents, Math.min(maxCents, pitchDifference.cents));
    return 50 + (clampedCents / maxCents) * 50;
  };

  const barPosition = getBarPosition();

  // Cor baseada na afinação
  const getBarColor = () => {
    if (!currentPitch || currentPitch.pitch <= 0) {
      return 'bg-gray-500';
    }
    
    if (pitchDifference.isInTune) {
      return 'bg-music-success';
    } else if (Math.abs(pitchDifference.cents) > 50) {
      return 'bg-music-error';
    } else {
      return 'bg-music-warning';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Informações da nota alvo */}
      <div className="text-center p-3 bg-white/5 rounded-lg">
        <div className="text-xs sm:text-sm text-gray-300 mb-1">Nota Alvo</div>
        <div className="text-xl sm:text-2xl font-bold text-music-primary">
          {targetNote.display}
        </div>
        <div className="text-xs sm:text-sm text-gray-400">
          {targetNote.frequency} Hz
        </div>
      </div>

      {/* Indicador visual */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Bemol</span>
          <span>Afinado</span>
          <span>Sustenido</span>
        </div>
        
        {/* Barra de afinação */}
        <div className="relative h-6 sm:h-8 bg-gray-700 rounded-full overflow-hidden">
          {/* Zona verde (afinado) */}
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-4 sm:w-6 bg-music-success/20" />
          
          {/* Linha central */}
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/50" />
          
          {/* Indicador de posição */}
          <div 
            className={`absolute inset-y-0 w-2 sm:w-3 rounded-full transition-all duration-200 ${getBarColor()}`}
            style={{ left: `${Math.max(0, Math.min(97, barPosition - 1.5))}%` }}
          />
        </div>
        
        {/* Escala numérica */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>-100¢</span>
          <span className="hidden sm:inline">-50¢</span>
          <span>0¢</span>
          <span className="hidden sm:inline">+50¢</span>
          <span>+100¢</span>
        </div>
      </div>

      {/* Status atual */}
      <div className="text-center p-3 bg-white/5 rounded-lg">
        {currentPitch && currentPitch.pitch > 0 ? (
          <div>
            <div className="text-xs sm:text-sm text-gray-300 mb-1">Sua Afinação</div>
            <div className={`text-base sm:text-lg font-bold ${
              pitchDifference.isInTune 
                ? 'text-music-success' 
                : Math.abs(pitchDifference.cents) > 50 
                  ? 'text-music-error' 
                  : 'text-music-warning'
            }`}>
              {pitchDifference.cents > 0 ? '+' : ''}{pitchDifference.cents} cents
            </div>
            {pitchDifference.isInTune && (
              <div className="text-xs sm:text-sm text-music-success mt-1">
                ✓ Perfeitamente afinado!
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">
            🎤 Aguardando sua voz...
          </div>
        )}
      </div>
    </div>
  );
};

export default PitchIndicator; 