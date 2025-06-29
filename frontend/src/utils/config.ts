// Configuração para URLs de desenvolvimento e produção
const getBaseURL = () => {
  // Em produção, usar a URL do Railway
  if (window.location.hostname === 'sing-pitch-project-production.up.railway.app') {
    return 'https://sing-pitch-project-production.up.railway.app';
  }
  
  // Se for outra URL de produção, usar a mesma
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
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