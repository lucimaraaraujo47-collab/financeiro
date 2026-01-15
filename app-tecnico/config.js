// Configuração do App do Técnico
// Esta configuração é dinâmica baseada no ambiente

// Para desenvolvimento local com Expo:
// - Android Emulator: use http://10.0.2.2:8001/api
// - iOS Simulator: use http://localhost:8001/api
// - Dispositivo físico: use o IP da máquina (ex: http://192.168.1.100:8001/api)

// Para produção, defina a URL do servidor:
// export const API_URL = 'https://seu-dominio.com/api';

// Detecta ambiente e configura URL automaticamente
const getApiUrl = () => {
  // Em produção, usar a URL do servidor de produção
  // IMPORTANTE: Alterar esta URL quando fazer deploy
  
  // URL de preview Emergent (para testes)
  // return 'https://bizmaster-17.preview.emergentagent.com/api';
  
  // Para testes com Expo Go em dispositivo físico,
  // substitua pelo IP da máquina de desenvolvimento
  // Exemplo: return 'http://192.168.1.100:8001/api';
  
  // URL padrão para desenvolvimento local
  return 'http://192.168.1.100:8001/api';
};

export const API_URL = getApiUrl();

// Configurações adicionais do app
export const APP_CONFIG = {
  // Tempo de timeout para requisições (ms)
  REQUEST_TIMEOUT: 30000,
  
  // Intervalo de atualização automática da lista de OS (ms)
  AUTO_REFRESH_INTERVAL: 60000,
  
  // Qualidade das fotos (0.0 - 1.0)
  PHOTO_QUALITY: 0.7,
  
  // Tamanho máximo de upload de foto (bytes)
  MAX_PHOTO_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Nome do app
  APP_NAME: 'App do Técnico',
  
  // Versão
  VERSION: '1.0.0'
};

// Cores do tema
export const THEME = {
  primary: '#1e40af',
  primaryLight: '#93c5fd',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#1e293b',
  textLight: '#64748b',
  background: '#f1f5f9',
  white: '#ffffff'
};
