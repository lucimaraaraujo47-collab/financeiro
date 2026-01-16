import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import OfflineService from '../services/OfflineService';

export default function NetworkStatusBar({ onSyncPress }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    // Verificar status inicial
    checkStatus();

    // Adicionar listener de rede
    const unsubscribe = OfflineService.addNetworkListener(online => {
      setIsOnline(online);
      animateBar(!online || pendingCount > 0);
    });

    // Verificar pendências periodicamente
    const interval = setInterval(checkStatus, 30000);

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
    
    animateBar(!online || stats.pendingCount > 0);
  };

  const animateBar = (show) => {
    Animated.timing(slideAnim, {
      toValue: show ? 0 : -50,
      duration: 300,
      useNativeDriver: true
    }).start();
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
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
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
            : 'Modo Offline - Alterações serão sincronizadas'
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
            {syncing ? '⏳' : '🔄 Sincronizar'}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
