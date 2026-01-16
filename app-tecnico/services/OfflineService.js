// Serviço de armazenamento offline e sincronização
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { API_URL } from '../config';

const STORAGE_KEYS = {
  CACHED_OS_LIST: 'cached_os_list',
  CACHED_OS_DETAILS: 'cached_os_details_',
  PENDING_SYNC: 'pending_sync_queue',
  LAST_SYNC: 'last_sync_timestamp',
  USER_DATA: 'user',
  TOKEN: 'token'
};

class OfflineService {
  constructor() {
    this.isOnline = true;
    this.syncInProgress = false;
    this.listeners = [];
    this.initNetworkListener();
  }

  // Inicializar listener de rede
  initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      // Notificar listeners
      this.listeners.forEach(listener => listener(this.isOnline));
      
      // Se voltou online, tentar sincronizar
      if (wasOffline && this.isOnline) {
        console.log('📶 Conexão restaurada - Iniciando sincronização...');
        this.syncPendingChanges();
      }
    });
  }

  // Adicionar listener de status de rede
  addNetworkListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Verificar status da rede
  async checkNetwork() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable;
    return this.isOnline;
  }

  // ==================== CACHE DE DADOS ====================

  // Salvar lista de OS no cache
  async cacheOSList(ordens, empresaId) {
    try {
      const cacheData = {
        data: ordens,
        empresaId,
        timestamp: new Date().toISOString()
      };
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_OS_LIST, JSON.stringify(cacheData));
      console.log(`💾 ${ordens.length} OS salvas no cache`);
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }

  // Obter lista de OS do cache
  async getCachedOSList() {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_OS_LIST);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        return { data, timestamp, fromCache: true };
      }
      return null;
    } catch (error) {
      console.error('Erro ao ler cache:', error);
      return null;
    }
  }

  // Salvar detalhes de uma OS no cache
  async cacheOSDetails(osId, osData) {
    try {
      const key = STORAGE_KEYS.CACHED_OS_DETAILS + osId;
      const cacheData = {
        data: osData,
        timestamp: new Date().toISOString()
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Erro ao salvar detalhes da OS:', error);
    }
  }

  // Obter detalhes de uma OS do cache
  async getCachedOSDetails(osId) {
    try {
      const key = STORAGE_KEYS.CACHED_OS_DETAILS + osId;
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        return { data, timestamp, fromCache: true };
      }
      return null;
    } catch (error) {
      console.error('Erro ao ler detalhes da OS:', error);
      return null;
    }
  }

  // ==================== FILA DE SINCRONIZAÇÃO ====================

  // Adicionar ação à fila de sincronização
  async addToSyncQueue(action) {
    try {
      const queue = await this.getSyncQueue();
      const newAction = {
        id: Date.now().toString(),
        ...action,
        createdAt: new Date().toISOString(),
        retryCount: 0
      };
      queue.push(newAction);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(queue));
      console.log(`📝 Ação adicionada à fila: ${action.type}`);
      return newAction.id;
    } catch (error) {
      console.error('Erro ao adicionar à fila:', error);
      throw error;
    }
  }

  // Obter fila de sincronização
  async getSyncQueue() {
    try {
      const queue = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Erro ao ler fila:', error);
      return [];
    }
  }

  // Remover item da fila
  async removeFromSyncQueue(actionId) {
    try {
      const queue = await this.getSyncQueue();
      const newQueue = queue.filter(item => item.id !== actionId);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(newQueue));
    } catch (error) {
      console.error('Erro ao remover da fila:', error);
    }
  }

  // Sincronizar alterações pendentes
  async syncPendingChanges(token) {
    if (this.syncInProgress) {
      console.log('⏳ Sincronização já em andamento...');
      return { success: false, message: 'Sincronização em andamento' };
    }

    if (!this.isOnline) {
      console.log('📴 Sem conexão - Sincronização adiada');
      return { success: false, message: 'Sem conexão' };
    }

    this.syncInProgress = true;
    const results = { synced: 0, failed: 0, errors: [] };

    try {
      // Obter token se não fornecido
      if (!token) {
        token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      }

      if (!token) {
        throw new Error('Token não encontrado');
      }

      const queue = await this.getSyncQueue();
      console.log(`🔄 Sincronizando ${queue.length} ações pendentes...`);

      for (const action of queue) {
        try {
          await this.executeAction(action, token);
          await this.removeFromSyncQueue(action.id);
          results.synced++;
          console.log(`✅ Sincronizado: ${action.type}`);
        } catch (error) {
          results.failed++;
          results.errors.push({ action: action.type, error: error.message });
          console.error(`❌ Erro ao sincronizar ${action.type}:`, error.message);
          
          // Incrementar contador de retry
          action.retryCount++;
          if (action.retryCount >= 3) {
            await this.removeFromSyncQueue(action.id);
            console.log(`🗑️ Ação removida após 3 tentativas: ${action.type}`);
          }
        }
      }

      // Atualizar timestamp da última sincronização
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    } catch (error) {
      console.error('Erro na sincronização:', error);
      results.errors.push({ action: 'sync', error: error.message });
    } finally {
      this.syncInProgress = false;
    }

    return {
      success: results.failed === 0,
      ...results,
      message: `Sincronizado: ${results.synced}, Falhas: ${results.failed}`
    };
  }

  // Executar uma ação da fila
  async executeAction(action, token) {
    const headers = { Authorization: `Bearer ${token}` };
    const config = { headers };

    switch (action.type) {
      case 'UPDATE_STATUS':
        await axios.patch(
          `${API_URL}/ordens-servico/${action.osId}/status`,
          { status: action.status },
          config
        );
        break;

      case 'UPDATE_CHECKLIST':
        await axios.patch(
          `${API_URL}/ordens-servico/${action.osId}/checklist`,
          { item_index: action.itemIndex, concluido: action.concluido },
          config
        );
        break;

      case 'ADD_PHOTO':
        await axios.post(
          `${API_URL}/ordens-servico/${action.osId}/fotos`,
          { url: action.photoData, tipo: action.tipo, descricao: action.descricao },
          config
        );
        break;

      case 'SIGN_CONTRACT':
        await axios.post(
          `${API_URL}/contratos/${action.contratoId}/assinar`,
          { assinatura_base64: action.signature },
          config
        );
        break;

      case 'ADD_OBSERVATION':
        await axios.patch(
          `${API_URL}/ordens-servico/${action.osId}/observacoes`,
          { observacoes_tecnico: action.observacoes },
          config
        );
        break;

      default:
        console.warn(`Tipo de ação desconhecido: ${action.type}`);
    }
  }

  // ==================== OPERAÇÕES OFFLINE ====================

  // Atualizar status (offline-first)
  async updateOSStatus(osId, status, token) {
    if (this.isOnline) {
      try {
        await axios.patch(
          `${API_URL}/ordens-servico/${osId}/status`,
          { status },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, offline: false };
      } catch (error) {
        console.log('Falha online, salvando offline...');
      }
    }

    // Salvar para sincronização posterior
    await this.addToSyncQueue({
      type: 'UPDATE_STATUS',
      osId,
      status
    });

    // Atualizar cache local
    const cached = await this.getCachedOSDetails(osId);
    if (cached) {
      cached.data.status = status;
      await this.cacheOSDetails(osId, cached.data);
    }

    return { success: true, offline: true };
  }

  // Atualizar checklist (offline-first)
  async updateChecklist(osId, itemIndex, concluido, token) {
    if (this.isOnline) {
      try {
        await axios.patch(
          `${API_URL}/ordens-servico/${osId}/checklist`,
          { item_index: itemIndex, concluido },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, offline: false };
      } catch (error) {
        console.log('Falha online, salvando offline...');
      }
    }

    await this.addToSyncQueue({
      type: 'UPDATE_CHECKLIST',
      osId,
      itemIndex,
      concluido
    });

    // Atualizar cache local
    const cached = await this.getCachedOSDetails(osId);
    if (cached && cached.data.checklist) {
      cached.data.checklist[itemIndex].concluido = concluido;
      await this.cacheOSDetails(osId, cached.data);
    }

    return { success: true, offline: true };
  }

  // Adicionar foto (offline-first)
  async addPhoto(osId, photoData, tipo, descricao, token) {
    if (this.isOnline) {
      try {
        await axios.post(
          `${API_URL}/ordens-servico/${osId}/fotos`,
          { url: photoData, tipo, descricao },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, offline: false };
      } catch (error) {
        console.log('Falha online, salvando offline...');
      }
    }

    await this.addToSyncQueue({
      type: 'ADD_PHOTO',
      osId,
      photoData,
      tipo,
      descricao
    });

    return { success: true, offline: true };
  }

  // Assinar contrato (offline-first)
  async signContract(contratoId, signature, token) {
    if (this.isOnline) {
      try {
        await axios.post(
          `${API_URL}/contratos/${contratoId}/assinar`,
          { assinatura_base64: signature },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, offline: false };
      } catch (error) {
        console.log('Falha online, salvando offline...');
      }
    }

    await this.addToSyncQueue({
      type: 'SIGN_CONTRACT',
      contratoId,
      signature
    });

    return { success: true, offline: true };
  }

  // ==================== UTILIDADES ====================

  // Obter estatísticas de sincronização
  async getSyncStats() {
    const queue = await this.getSyncQueue();
    const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    
    return {
      pendingCount: queue.length,
      pendingActions: queue.map(a => ({ type: a.type, createdAt: a.createdAt })),
      lastSync: lastSync || 'Nunca',
      isOnline: this.isOnline
    };
  }

  // Limpar cache
  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => 
        k.startsWith(STORAGE_KEYS.CACHED_OS_LIST) ||
        k.startsWith(STORAGE_KEYS.CACHED_OS_DETAILS)
      );
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('🗑️ Cache limpo');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  // Limpar tudo (logout)
  async clearAll() {
    try {
      await AsyncStorage.clear();
      console.log('🗑️ Todos os dados locais removidos');
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
    }
  }
}

// Exportar instância singleton
export default new OfflineService();
