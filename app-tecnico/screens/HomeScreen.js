import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert
} from 'react-native';
import axios from 'axios';
import { API_URL, THEME, LABELS, APP_CONFIG } from '../config';

export default function HomeScreen({ navigation, user, token, onLogout }) {
  const [ordens, setOrdens] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const statusColors = THEME.statusColors;
  const statusLabels = LABELS.status;
  const tipoLabels = LABELS.tipo;

  useEffect(() => {
    loadOrdens();
  }, []);

  const loadOrdens = async () => {
    try {
      // Buscar empresas do usuário
      const empresaId = user.empresa_ids?.[0];
      if (!empresaId) {
        Alert.alert('Erro', 'Usuário sem empresa vinculada');
        return;
      }

      const response = await axios.get(
        `${API_URL}/empresas/${empresaId}/ordens-servico?tecnico_id=${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Filtrar apenas OS não concluídas/canceladas
      const ordensAtivas = response.data.filter(
        os => !['concluida', 'cancelada'].includes(os.status)
      );

      setOrdens(ordensAtivas);
    } catch (error) {
      console.error('Erro ao carregar OS:', error);
      Alert.alert('Erro', 'Não foi possível carregar as ordens de serviço');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrdens();
    setRefreshing(false);
  }, []);

  const renderOS = ({ item }) => (
    <TouchableOpacity
      style={styles.osCard}
      onPress={() => navigation.navigate('OSDetail', { osId: item.id })}
    >
      <View style={styles.osHeader}>
        <Text style={styles.osNumero}>{item.numero}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
            {statusLabels[item.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.osTipo}>{tipoLabels[item.tipo] || item.tipo}</Text>

      <View style={styles.osInfo}>
        <Text style={styles.osLabel}>👤 Cliente</Text>
        <Text style={styles.osValue}>{item.cliente_nome || 'N/A'}</Text>
      </View>

      <View style={styles.osInfo}>
        <Text style={styles.osLabel}>📍 Endereço</Text>
        <Text style={styles.osValue} numberOfLines={2}>
          {item.endereco_servico || 'N/A'}
        </Text>
      </View>

      {item.data_agendamento && (
        <View style={styles.osInfo}>
          <Text style={styles.osLabel}>📅 Agendamento</Text>
          <Text style={styles.osValue}>
            {new Date(item.data_agendamento).toLocaleDateString('pt-BR')}
            {item.horario_previsto ? ` às ${item.horario_previsto}` : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Olá, {user?.nome?.split(' ')[0] || 'Técnico'}</Text>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{ordens.length}</Text>
          <Text style={styles.statLabel}>OS Pendentes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {ordens.filter(o => o.status === 'agendada').length}
          </Text>
          <Text style={styles.statLabel}>Agendadas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {ordens.filter(o => o.status === 'em_andamento').length}
          </Text>
          <Text style={styles.statLabel}>Em Andamento</Text>
        </View>
      </View>

      <FlatList
        data={ordens}
        renderItem={renderOS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>Nenhuma OS pendente</Text>
            <Text style={styles.emptySubtext}>Puxe para atualizar</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff'
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b'
  },
  logoutBtn: {
    padding: 8
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af'
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  listContainer: {
    padding: 15
  },
  osCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  osHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  osNumero: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500'
  },
  osTipo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10
  },
  osInfo: {
    marginBottom: 8
  },
  osLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2
  },
  osValue: {
    fontSize: 14,
    color: '#1e293b'
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10
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
