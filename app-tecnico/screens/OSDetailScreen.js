import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

export default function OSDetailScreen({ route, navigation, user, token }) {
  const { osId } = route.params;
  const [os, setOS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const statusColors = {
    aberta: '#6b7280',
    agendada: '#8b5cf6',
    em_andamento: '#f59e0b',
    aguardando_assinatura: '#3b82f6',
    concluida: '#10b981',
    cancelada: '#ef4444'
  };

  useEffect(() => {
    loadOS();
  }, []);

  const loadOS = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/ordens-servico/${osId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOS(response.data);
    } catch (error) {
      console.error('Erro ao carregar OS:', error);
      Alert.alert('Erro', 'Não foi possível carregar a OS');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await axios.patch(
        `${API_URL}/ordens-servico/${osId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadOS();
      Alert.alert('Sucesso', `Status atualizado para ${newStatus}`);
    } catch (error) {
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao atualizar status');
    } finally {
      setUpdating(false);
    }
  };

  const toggleChecklist = async (index) => {
    try {
      const item = os.checklist[index];
      await axios.patch(
        `${API_URL}/ordens-servico/${osId}/checklist`,
        { item_index: index, concluido: !item.concluido },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadOS();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o checklist');
    }
  };

  const handleConcluir = () => {
    // Verificar checklist
    const pendentes = os.checklist.filter(i => i.obrigatorio && !i.concluido);
    if (pendentes.length > 0) {
      Alert.alert(
        'Itens Pendentes',
        `Complete os itens obrigatórios:\n${pendentes.map(p => `- ${p.item}`).join('\n')}`
      );
      return;
    }

    // Verificar contrato
    if (os.contrato_id && !os.contrato_assinado) {
      Alert.alert(
        'Contrato Pendente',
        'O cliente precisa assinar o contrato antes de concluir a OS',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Coletar Assinatura', 
            onPress: () => navigation.navigate('Signature', { 
              osId: os.id, 
              contratoId: os.contrato_id 
            })
          }
        ]
      );
      return;
    }

    Alert.alert(
      'Concluir OS',
      'Deseja realmente concluir esta ordem de serviço?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Concluir', onPress: () => updateStatus('concluida') }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!os) {
    return (
      <View style={styles.loadingContainer}>
        <Text>OS não encontrada</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.numero}>{os.numero}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[os.status] }]}>
          <Text style={styles.statusText}>
            {os.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Cliente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Cliente</Text>
        <Text style={styles.clienteNome}>{os.cliente?.nome_completo || os.cliente_nome}</Text>
        <Text style={styles.clienteInfo}>📞 {os.cliente?.telefone || 'N/A'}</Text>
        <Text style={styles.clienteInfo}>📍 {os.endereco_servico}</Text>
      </View>

      {/* Checklist */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✅ Checklist</Text>
        {os.checklist?.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.checklistItem,
              item.concluido && styles.checklistItemDone
            ]}
            onPress={() => toggleChecklist(index)}
          >
            <View style={[
              styles.checkbox,
              item.concluido && styles.checkboxDone
            ]}>
              {item.concluido && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[
              styles.checklistText,
              item.concluido && styles.checklistTextDone
            ]}>
              {item.item}
              {item.obrigatorio && <Text style={styles.obrigatorio}> *</Text>}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contrato */}
      {os.contrato_id && (
        <View style={[styles.section, os.contrato_assinado ? styles.sectionSuccess : styles.sectionWarning]}>
          <Text style={styles.sectionTitle}>📝 Contrato</Text>
          <Text style={styles.contratoStatus}>
            {os.contrato_assinado ? '✅ Assinado' : '⚠️ Pendente de Assinatura'}
          </Text>
          {!os.contrato_assinado && (
            <TouchableOpacity
              style={styles.assinaturaBtn}
              onPress={() => navigation.navigate('Signature', { osId: os.id, contratoId: os.contrato_id })}
            >
              <Text style={styles.assinaturaBtnText}>✍️ Coletar Assinatura</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Ações */}
      <View style={styles.actionsContainer}>
        {os.status === 'agendada' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => updateStatus('em_andamento')}
            disabled={updating}
          >
            <Text style={styles.actionBtnText}>
              {updating ? 'Atualizando...' : '▶️ Iniciar Execução'}
            </Text>
          </TouchableOpacity>
        )}

        {os.status === 'em_andamento' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSuccess]}
            onPress={handleConcluir}
            disabled={updating}
          >
            <Text style={styles.actionBtnText}>
              {updating ? 'Atualizando...' : '✅ Concluir OS'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
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
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  numero: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 0,
    borderRadius: 12,
    padding: 15
  },
  sectionSuccess: {
    backgroundColor: '#ecfdf5'
  },
  sectionWarning: {
    backgroundColor: '#fef3c7'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 10
  },
  clienteNome: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 8
  },
  clienteInfo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8
  },
  checklistItemDone: {
    backgroundColor: '#ecfdf5'
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxDone: {
    backgroundColor: '#10b981',
    borderColor: '#10b981'
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold'
  },
  checklistText: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b'
  },
  checklistTextDone: {
    textDecorationLine: 'line-through',
    color: '#64748b'
  },
  obrigatorio: {
    color: '#ef4444'
  },
  contratoStatus: {
    fontSize: 16,
    marginBottom: 10
  },
  assinaturaBtn: {
    backgroundColor: '#1e40af',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  assinaturaBtnText: {
    color: '#fff',
    fontWeight: '600'
  },
  actionsContainer: {
    padding: 15,
    paddingBottom: 30
  },
  actionBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10
  },
  actionBtnPrimary: {
    backgroundColor: '#1e40af'
  },
  actionBtnSuccess: {
    backgroundColor: '#10b981'
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
