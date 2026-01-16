// Configuração do App do Técnico - ECHO SHOP
// Versão de Produção

// ============================================
// CONFIGURAÇÃO DA API
// ============================================

// URL de PRODUÇÃO - Servidor Emergent
const PRODUCTION_URL = 'https://techflow-16.preview.emergentagent.com/api';

// URL de DESENVOLVIMENTO - IP local (alterar conforme necessário)
const DEVELOPMENT_URL = 'http://192.168.1.100:8001/api';

// Detectar ambiente automaticamente
const __DEV__ = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';

// Função para obter URL da API
const getApiUrl = () => {
  // Para desenvolvimento local, descomente a linha abaixo:
  // return DEVELOPMENT_URL;
  
  // URL de produção (padrão)
  return PRODUCTION_URL;
};

export const API_URL = getApiUrl();

// ============================================
// CONFIGURAÇÕES DO APP
// ============================================

export const APP_CONFIG = {
  // Informações do App
  APP_NAME: 'App do Técnico',
  APP_VERSION: '1.3.0',
  COMPANY_NAME: 'ECHO SHOP',
  
  // Timeouts (em milissegundos)
  REQUEST_TIMEOUT: 30000,
  AUTO_REFRESH_INTERVAL: 60000,
  
  // Configurações de Foto
  PHOTO_QUALITY: 0.7,
  MAX_PHOTO_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Configurações de Cache
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 horas
  
  // Tipos de foto permitidos
  PHOTO_TYPES: ['antes', 'durante', 'depois', 'equipamento', 'documento', 'geral'],
  
  // Status de OS
  OS_STATUS: {
    ABERTA: 'aberta',
    AGENDADA: 'agendada',
    EM_ANDAMENTO: 'em_andamento',
    AGUARDANDO_ASSINATURA: 'aguardando_assinatura',
    CONCLUIDA: 'concluida',
    CANCELADA: 'cancelada'
  },
  
  // Tipos de OS
  OS_TIPOS: {
    INSTALACAO: 'instalacao',
    MANUTENCAO: 'manutencao',
    TROCA: 'troca',
    RETIRADA: 'retirada'
  }
};

// ============================================
// TEMA DE CORES
// ============================================

export const THEME = {
  // Cores principais
  primary: '#1e40af',
  primaryLight: '#93c5fd',
  primaryDark: '#1e3a8a',
  
  // Cores de status
  success: '#10b981',
  successLight: '#ecfdf5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  info: '#3b82f6',
  infoLight: '#eff6ff',
  
  // Cores de texto
  text: '#1e293b',
  textLight: '#64748b',
  textMuted: '#94a3b8',
  
  // Cores de fundo
  background: '#f1f5f9',
  backgroundDark: '#e2e8f0',
  white: '#ffffff',
  
  // Cores de borda
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  
  // Status de OS (cores)
  statusColors: {
    aberta: '#6b7280',
    agendada: '#8b5cf6',
    em_andamento: '#f59e0b',
    aguardando_assinatura: '#3b82f6',
    concluida: '#10b981',
    cancelada: '#ef4444'
  }
};

// ============================================
// LABELS E TEXTOS
// ============================================

export const LABELS = {
  status: {
    aberta: 'Aberta',
    agendada: 'Agendada',
    em_andamento: 'Em Andamento',
    aguardando_assinatura: 'Aguardando Assinatura',
    concluida: 'Concluída',
    cancelada: 'Cancelada'
  },
  
  tipo: {
    instalacao: '📦 Instalação',
    manutencao: '🔧 Manutenção',
    troca: '🔄 Troca',
    retirada: '📤 Retirada'
  },
  
  tipoFoto: {
    antes: '📷 Foto Antes',
    durante: '🔧 Foto Durante',
    depois: '✅ Foto Depois',
    equipamento: '📦 Foto Equipamento',
    documento: '📄 Foto Documento',
    geral: '📸 Foto Geral'
  }
};

// ============================================
// MENSAGENS
// ============================================

export const MESSAGES = {
  errors: {
    network: 'Erro de conexão. Verifique sua internet.',
    auth: 'Sessão expirada. Faça login novamente.',
    generic: 'Ocorreu um erro. Tente novamente.',
    camera: 'Não foi possível acessar a câmera.',
    location: 'Não foi possível obter sua localização.'
  },
  
  success: {
    login: 'Login realizado com sucesso!',
    osUpdated: 'OS atualizada com sucesso!',
    photoAdded: 'Foto adicionada com sucesso!',
    signed: 'Contrato assinado com sucesso!'
  },
  
  confirm: {
    logout: 'Deseja realmente sair?',
    concluir: 'Deseja concluir esta OS?',
    cancelar: 'Deseja cancelar esta ação?'
  }
};

// ============================================
// CONFIGURAÇÕES DE BUILD
// ============================================

export const BUILD_CONFIG = {
  // Para builds de produção
  production: {
    enableLogs: false,
    enableAnalytics: true,
    apiUrl: PRODUCTION_URL
  },
  
  // Para builds de desenvolvimento
  development: {
    enableLogs: true,
    enableAnalytics: false,
    apiUrl: DEVELOPMENT_URL
  }
};

// Log da configuração atual (apenas em dev)
if (__DEV__) {
  console.log('🔧 App Config:', {
    apiUrl: API_URL,
    version: APP_CONFIG.APP_VERSION
  });
}
