// Configuração para URLs de desenvolvimento e produção
const getBaseURL = () => {
  // Em produção (Vercel/Netlify), usar backend Railway
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://sing-pitch-project-production.up.railway.app';
  }
  
  // Local development
  return 'http://localhost:8001';
};

const getWebSocketURL = () => {
  const baseURL = getBaseURL();
  return baseURL.replace(/^https?:\/\//, '').replace(/^http/, 'ws').replace(/^https/, 'wss');
};

export const config = {
  apiURL: getBaseURL(),
  wsURL: `${getBaseURL().startsWith('https') ? 'wss' : 'ws'}://${getWebSocketURL()}/ws`,
  notesURL: `${getBaseURL()}/notes`
};

console.log('🔧 Config URLs:', config); 