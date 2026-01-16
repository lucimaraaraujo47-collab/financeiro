import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { API_URL, THEME, LABELS, APP_CONFIG } from '../config';
import OfflineService from '../services/OfflineService';
import NetworkStatusBar from '../components/NetworkStatusBar';

export default function HomeScreen({ navigation, user, token, onLogout }) {
  const [ordens, setOrdens] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const statusColors = THEME.statusColors;
  const statusLabels = LABELS.status;
  const tipoLabels = LABELS.tipo;

  useEffect(() => {
    loadOrdens();
    
    // Listener de rede
    const unsubscribe = OfflineService.addNetworkListener(online => {
      setIsOffline(!online);
      if (online) {
        loadOrdens(); // Recarregar quando voltar online
      }
    });

    return () => unsubscribe();
  }, []);

  const loadOrdens = async () => {
    try {
      const empresaId = user.empresa_ids?.[0];
      if (!empresaId) {
        Alert.alert('Erro', 'Usuário sem empresa vinculada');
        return;
      }

      const isOnline = await OfflineService.checkNetwork();

      if (isOnline) {
        // Buscar do servidor
        const response = await axios.get(
          `${API_URL}/empresas/${empresaId}/ordens-servico`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Filtrar OS do técnico e ativas
        const todasOS = response.data;
        const ordensAtivas = todasOS.filter(
          os => !['concluida', 'cancelada'].includes(os.status)
        );

        setOrdens(ordensAtivas);
        setFromCache(false);

        // Salvar no cache
        await OfflineService.cacheOSList(ordensAtivas, empresaId);

        // Cachear detalhes de cada OS
        for (const os of ordensAtivas) {
          await OfflineService.cacheOSDetails(os.id, os);
        }

      } else {
        // Buscar do cache
        const cached = await OfflineService.getCachedOSList();
        if (cached) {
          setOrdens(cached.data);
          setFromCache(true);
          console.log('📦 Dados carregados do cache');
        } else {
          Alert.alert(
            'Sem Conexão',
            'Não há dados em cache. Conecte-se à internet para carregar as OS.'
          );
        }
      }
    } catch (error) {
      console.error('Erro ao carregar OS:', error);
      
      // Tentar carregar do cache em caso de erro
      const cached = await OfflineService.getCachedOSList();
      if (cached) {
        setOrdens(cached.data);
        setFromCache(true);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar as ordens de serviço');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrdens();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair do aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: async () => {
            // Sincronizar antes de sair se online
            const isOnline = await OfflineService.checkNetwork();
            if (isOnline) {
              const stats = await OfflineService.getSyncStats();
              if (stats.pendingCount > 0) {
                Alert.alert(
                  'Pendências',
                  `Você tem ${stats.pendingCount} alteração(ões) não sincronizada(s). Deseja sincronizar antes de sair?`,
                  [
                    { text: 'Sair sem sincronizar', onPress: onLogout, style: 'destructive' },
                    { 
                      text: 'Sincronizar e sair', 
                      onPress: async () => {
                        await OfflineService.syncPendingChanges(token);
                        onLogout();
                      }
                    }
                  ]
                );
                return;
              }
            }
            onLogout();
          }
        }
      ]
    );
  };

  const getStatusStyle = (status) => ({
    backgroundColor: statusColors[status] || '#6b7280'
  });

  const renderOS = ({ item }) => (
    <TouchableOpacity
      style={styles.osCard}
      onPress={() => navigation.navigate('OSDetail', { osId: item.id })}
      data-testid={`os-card-${item.id}`}
    >
      <View style={styles.osHeader}>
        <Text style={styles.osNumero}>{item.numero}</Text>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>
            {statusLabels[item.status] || item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.osTipo}>{tipoLabels[item.tipo] || item.tipo}</Text>

      <View style={styles.osInfo}>
        <Text style={styles.osCliente} numberOfLines={1}>
          👤 {item.cliente_nome || 'Cliente'}
        </Text>
        {item.data_agendamento && (
          <Text style={styles.osData}>
            📅 {new Date(item.data_agendamento).toLocaleDateString('pt-BR')}
          </Text>
        )}
      </View>

      {item.endereco_servico && (
        <Text style={styles.osEndereco} numberOfLines={1}>
          📍 {item.endereco_servico}
        </Text>
      )}
    </TouchableOpacity>
  );

  const getStats = () => {
    const total = ordens.length;
    const agendadas = ordens.filter(o => o.status === 'agendada').length;
    const emAndamento = ordens.filter(o => o.status === 'em_andamento').length;
    const abertas = ordens.filter(o => o.status === 'aberta').length;
    return { total, agendadas, emAndamento, abertas };
  };

  const stats = getStats();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NetworkStatusBar onSyncPress={loadOrdens} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.nome?.split(' ')[0] || 'Técnico'}!</Text>
          <Text style={styles.subtitle}>
            {fromCache ? '📦 Dados do cache' : '📶 Online'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
          <Text style={styles.statNumber}>{stats.agendadas}</Text>
          <Text style={styles.statLabel}>Agendadas</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
          <Text style={styles.statNumber}>{stats.emAndamento}</Text>
          <Text style={styles.statLabel}>Em Andamento</Text>
        </View>
      </View>

      {/* Lista de OS */}
      <FlatList
        data={ordens}
        renderItem={renderOS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[THEME.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Nenhuma OS pendente</Text>
            <Text style={styles.emptySubtext}>
              {isOffline 
                ? 'Conecte-se para verificar novas OS' 
                : 'Puxe para atualizar'
              }
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9'
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 25,
    backgroundColor: '#fff'
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  logoutBtn: {
    padding: 10
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '500'
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  listContainer: {
    padding: 15,
    paddingTop: 5
  },
  osCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  osHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  osNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  osTipo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10
  },
  osInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  osCliente: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1
  },
  osData: {
    fontSize: 13,
    color: '#64748b'
  },
  osEndereco: {
    fontSize: 13,
    color: '#64748b'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#64748b'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 5
  }
});
