import React, { useState } from 'react';
import { Mic, Volume2, AlertCircle, CheckCircle } from 'lucide-react';

interface MicrophoneCalibrationProps {
  isVisible: boolean;
  onClose: () => void;
  audioLevel: number;
}

const MicrophoneCalibration: React.FC<MicrophoneCalibrationProps> = ({ 
  isVisible, 
  onClose, 
  audioLevel 
}) => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev.slice(-4), message]);
  };

  const runSensitivityTest = async () => {
    setIsTestRunning(true);
    setTestResults([]);
    
    addTestResult('🔧 Iniciando teste de sensibilidade...');
    
    // Aguardar alguns segundos para coletar dados
    for (let i = 3; i > 0; i--) {
      addTestResult(`⏱️ Fale normalmente... ${i}s`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Analisar resultados baseado no audioLevel
    if (audioLevel > 30) {
      addTestResult('✅ Sensibilidade ÓTIMA! Microfone funcionando perfeitamente.');
    } else if (audioLevel > 10) {
      addTestResult('⚠️ Sensibilidade BOA. Pode falar um pouco mais alto.');
    } else if (audioLevel > 1) {
      addTestResult('📢 Sensibilidade BAIXA. Aproxime-se do microfone.');
    } else {
      addTestResult('🔇 Nenhum áudio detectado. Verifique permissões do microfone.');
    }
    
    setIsTestRunning(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Calibração do Microfone
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Indicador visual de áudio */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Nível de Áudio</span>
          </div>
          
          <div className="w-full h-6 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-100 ${
                audioLevel > 50 ? 'bg-green-400' :
                audioLevel > 20 ? 'bg-yellow-400' :
                audioLevel > 5 ? 'bg-orange-400' :
                'bg-red-400'
              }`}
              style={{ width: `${Math.min(audioLevel, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Silêncio</span>
            <span className="font-medium">
              {audioLevel.toFixed(1)}%
            </span>
            <span>Alto</span>
          </div>
        </div>

        {/* Status da sensibilidade */}
        <div className="mb-4 p-3 rounded-lg bg-black/20">
          <div className="flex items-center gap-2 mb-2">
            {audioLevel > 20 ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-400" />
            )}
            <span className="text-sm font-medium">
              {audioLevel > 30 ? '✅ Sensibilidade Ótima' :
               audioLevel > 10 ? '⚠️ Sensibilidade Boa' :
               audioLevel > 1 ? '📢 Sensibilidade Baixa' :
               '🔇 Nenhum áudio detectado'}
            </span>
          </div>
          
          <p className="text-xs text-gray-300">
            {audioLevel > 30 ? 'Perfeito! Seu microfone está captando bem.' :
             audioLevel > 10 ? 'Bom! Pode falar um pouco mais alto para melhor detecção.' :
             audioLevel > 1 ? 'Aproxime-se do microfone ou fale mais alto.' :
             'Verifique se o microfone está funcionando e se deu permissão.'}
          </p>
        </div>

        {/* Botão de teste */}
        <button
          onClick={runSensitivityTest}
          disabled={isTestRunning}
          className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 mb-4"
        >
          {isTestRunning ? '🔄 Testando...' : '🧪 Executar Teste de Sensibilidade'}
        </button>

        {/* Resultados do teste */}
        {testResults.length > 0 && (
          <div className="space-y-1 text-xs">
            {testResults.map((result, index) => (
              <div key={index} className="text-gray-300 p-2 bg-black/10 rounded">
                {result}
              </div>
            ))}
          </div>
        )}

        {/* Dicas */}
        <div className="mt-4 p-3 bg-black/10 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-400 mb-2">💡 Dicas para melhor detecção:</h4>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• Aproxime o dispositivo da boca (especialmente celular)</li>
            <li>• Fale/cante claramente e com volume normal</li>
            <li>• Evite ruídos de fundo</li>
            <li>• Em celulares, segure próximo ao rosto</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MicrophoneCalibration; 