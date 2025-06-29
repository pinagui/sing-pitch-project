import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PitchData {
  type: string;
  pitch: number;
  note: string;
  octave: number;
  cents: number;
  frequency: number;
  timestamp: number;
}

interface PitchChartProps {
  data: PitchData[];
  targetFrequency?: number;
}

const PitchChart: React.FC<PitchChartProps> = ({ data, targetFrequency }) => {
  // Preparar dados para o gráfico
  const chartData = data
    .filter(item => item.frequency > 0)
    .slice(-50) // Mostrar apenas os últimos 50 pontos
    .map((item, index) => ({
      index,
      frequency: item.frequency,
      time: new Date(item.timestamp * 1000).toLocaleTimeString(),
    }));

  return (
    <div className="h-full w-full">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="index" 
              stroke="#9CA3AF"
              fontSize={10}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={10}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              domain={['dataMin - 50', 'dataMax + 50']}
              width={50}
            />
            
            {/* Linha de referência para nota alvo */}
            {targetFrequency && (
              <ReferenceLine 
                y={targetFrequency} 
                stroke="#10B981" 
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: "Alvo", fontSize: 10 }}
              />
            )}
            
            {/* Linha do pitch atual */}
            <Line 
              type="monotone" 
              dataKey="frequency" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#8B5CF6', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-gray-500">
          <div className="text-center px-4">
            <div className="text-2xl sm:text-3xl lg:text-4xl mb-2">📊</div>
            <div className="text-sm sm:text-base">Aguardando dados de pitch...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PitchChart; 