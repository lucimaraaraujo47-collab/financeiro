import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import OfflineService from '../services/OfflineService';

export default function NetworkStatusBar({ onSyncPress }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Verificar status inicial
    checkStatus();

    // Adicionar listener de rede
    const unsubscribe = OfflineService.addNetworkListener(online => {
      setIsOnline(online);
    });

    // Verificar pendências periodicamente
    const interval = setInterval(checkStatus, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const checkStatus = async () => {
    const online = await OfflineService.checkNetwork();
    setIsOnline(online);
    
    const stats = await OfflineService.getSyncStats();
    setPendingCount(stats.pendingCount);
  };

  const handleSync = async () => {
    if (syncing || !isOnline) return;
    
    setSyncing(true);
    try {
      await OfflineService.syncPendingChanges();
      await checkStatus();
      if (onSyncPress) onSyncPress();
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <View 
      style={[
        styles.container,
        isOnline ? styles.pendingBar : styles.offlineBar
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>
          {isOnline ? '🔄' : '📴'}
        </Text>
        <Text style={styles.text}>
          {isOnline 
            ? `${pendingCount} alteração(ões) pendente(s)`
            : 'Modo Offline - Dados salvos localmente'
          }
        </Text>
      </View>
      
      {isOnline && pendingCount > 0 && (
        <TouchableOpacity 
          style={styles.syncButton}
          onPress={handleSync}
          disabled={syncing}
        >
          <Text style={styles.syncButtonText}>
            {syncing ? '⏳ Sincronizando...' : '🔄 Sincronizar'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    zIndex: 1000
  },
  offlineBar: {
    backgroundColor: '#ef4444'
  },
  pendingBar: {
    backgroundColor: '#f59e0b'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  icon: {
    fontSize: 16,
    marginRight: 8
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500'
  },
  syncButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  }
});
