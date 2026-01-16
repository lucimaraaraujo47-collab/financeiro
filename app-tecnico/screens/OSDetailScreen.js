import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking
} from 'react-native';
import axios from 'axios';
import { API_URL, THEME, LABELS } from '../config';
import OfflineService from '../services/OfflineService';
import NetworkStatusBar from '../components/NetworkStatusBar';

export default function OSDetailScreen({ route, navigation, user, token }) {
  const { osId } = route.params;
  const [os, setOS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(false);

  const statusColors = THEME.statusColors;
  const statusLabels = LABELS.status;
  const tipoLabels = LABELS.tipo;

  useEffect(() => {
    loadOS();
  }, []);

  const loadOS = async () => {
    try {
      const isOnline = await OfflineService.checkNetwork();
      
      if (isOnline) {
        const response = await axios.get(
          `${API_URL}/ordens-servico/${osId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOS(response.data);
        setFromCache(false);
        
        // Salvar no cache
        await OfflineService.cacheOSDetails(osId, response.data);
      } else {
        // Carregar do cache
        const cached = await OfflineService.getCachedOSDetails(osId);
        if (cached) {
          setOS(cached.data);
          setFromCache(true);
        } else {
          Alert.alert('Erro', 'Dados não disponíveis offline');
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar OS:', error);
      
      // Tentar cache em caso de erro
      const cached = await OfflineService.getCachedOSDetails(osId);
      if (cached) {
        setOS(cached.data);
        setFromCache(true);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar a OS');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOS();
    setRefreshing(false);
  }, []);

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const result = await OfflineService.updateOSStatus(osId, newStatus, token);
      
      if (result.offline) {
        // Atualizar UI localmente
        setOS(prev => ({ ...prev, status: newStatus }));
        setPendingChanges(true);
        Alert.alert(
          '📴 Salvo Offline',
          `Status será atualizado quando houver conexão`
        );
      } else {
        await loadOS();
        Alert.alert('Sucesso', `Status atualizado para ${statusLabels[newStatus]}`);
      }
    } catch (error) {
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao atualizar status');
    } finally {
      setUpdating(false);
    }
  };

  const toggleChecklist = async (index) => {
    try {
      const item = os.checklist[index];
      const result = await OfflineService.updateChecklist(osId, index, !item.concluido, token);
      
      if (result.offline) {
        // Atualizar UI localmente
        const newChecklist = [...os.checklist];
        newChecklist[index].concluido = !item.concluido;
        setOS(prev => ({ ...prev, checklist: newChecklist }));
        setPendingChanges(true);
      } else {
        await loadOS();
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o checklist');
    }
  };

  const openMaps = () => {
    if (!os?.endereco_servico) return;
    
    const address = encodeURIComponent(os.endereco_servico);
    const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
    Linking.openURL(url);
  };

  const callClient = () => {
    const phone = os?.cliente?.telefone || os?.cliente?.celular;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      Linking.openURL(`tel:${cleanPhone}`);
    } else {
      Alert.alert('Erro', 'Telefone do cliente não disponível');
    }
  };

  const openWhatsApp = () => {
    const phone = os?.cliente?.celular || os?.cliente?.telefone;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const message = encodeURIComponent(
        `Olá! Sou o técnico responsável pela sua ordem de serviço ${os.numero}. `
      );
      Linking.openURL(`whatsapp://send?phone=55${cleanPhone}&text=${message}`);
    } else {
      Alert.alert('Erro', 'Telefone do cliente não disponível');
    }
  };

  const handleConcluir = () => {
    // Verificar checklist
    const pendentes = os.checklist?.filter(i => i.obrigatorio && !i.concluido) || [];
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

  const navigateToPhotos = () => {
    navigation.navigate('PhotoGallery', { 
      osId: os.id, 
      fotos: os.fotos || [] 
    });
  };

  const navigateToCamera = (tipo) => {
    navigation.navigate('Camera', { osId: os.id, tipoFoto: tipo });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  if (!os) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>OS não encontrada</Text>
      </View>
    );
  }

  const checklistProgress = os.checklist?.length > 0
    ? Math.round((os.checklist.filter(i => i.concluido).length / os.checklist.length) * 100)
    : 0;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header com Status */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.numero}>{os.numero}</Text>
            <Text style={styles.tipo}>{tipoLabels[os.tipo] || os.tipo}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[os.status] }]}>
            <Text style={styles.statusText}>
              {statusLabels[os.status] || os.status}
            </Text>
          </View>
        </View>
        
        {os.data_agendamento && (
          <View style={styles.agendamentoInfo}>
            <Text style={styles.agendamentoLabel}>📅 Agendado para:</Text>
            <Text style={styles.agendamentoValue}>
              {new Date(os.data_agendamento).toLocaleDateString('pt-BR')}
              {os.horario_previsto && ` às ${os.horario_previsto}`}
            </Text>
          </View>
        )}
      </View>

      {/* Info do Cliente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Cliente</Text>
        <Text style={styles.clienteNome}>
          {os.cliente?.nome_completo || os.cliente_nome || 'N/A'}
        </Text>
        
        {os.cliente?.telefone && (
          <Text style={styles.clienteInfo}>📞 {os.cliente.telefone}</Text>
        )}
        
        <TouchableOpacity onPress={openMaps} style={styles.enderecoContainer}>
          <Text style={styles.clienteInfo}>📍 {os.endereco_servico || 'N/A'}</Text>
          <Text style={styles.mapLink}>Abrir no mapa →</Text>
        </TouchableOpacity>

        {/* Ações rápidas de contato */}
        <View style={styles.contactActions}>
          <TouchableOpacity style={styles.contactBtn} onPress={callClient}>
            <Text style={styles.contactBtnText}>📞 Ligar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactBtn} onPress={openWhatsApp}>
            <Text style={styles.contactBtnText}>💬 WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactBtn} onPress={openMaps}>
            <Text style={styles.contactBtnText}>🗺️ Rota</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Checklist com Progresso */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>✅ Checklist</Text>
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>{checklistProgress}%</Text>
          </View>
        </View>
        
        {/* Barra de progresso */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${checklistProgress}%` }]} />
        </View>

        {os.checklist?.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.checklistItem,
              item.concluido && styles.checklistItemDone
            ]}
            onPress={() => toggleChecklist(index)}
            disabled={os.status === 'concluida'}
          >
            <View style={[
              styles.checkbox,
              item.concluido && styles.checkboxDone
            ]}>
              {item.concluido && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.checklistContent}>
              <Text style={[
                styles.checklistText,
                item.concluido && styles.checklistTextDone
              ]}>
                {item.item}
              </Text>
              {item.obrigatorio && (
                <Text style={styles.obrigatorioLabel}>Obrigatório</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {(!os.checklist || os.checklist.length === 0) && (
          <Text style={styles.emptyText}>Nenhum item no checklist</Text>
        )}
      </View>

      {/* Fotos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📷 Fotos</Text>
          <TouchableOpacity onPress={navigateToPhotos}>
            <Text style={styles.viewAllLink}>
              Ver todas ({os.fotos?.length || 0}) →
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.photoActions}>
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => navigateToCamera('antes')}
          >
            <Text style={styles.photoBtnIcon}>📷</Text>
            <Text style={styles.photoBtnText}>Antes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => navigateToCamera('durante')}
          >
            <Text style={styles.photoBtnIcon}>🔧</Text>
            <Text style={styles.photoBtnText}>Durante</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => navigateToCamera('depois')}
          >
            <Text style={styles.photoBtnIcon}>✅</Text>
            <Text style={styles.photoBtnText}>Depois</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contrato */}
      {os.contrato_id && (
        <View style={[
          styles.section, 
          os.contrato_assinado ? styles.sectionSuccess : styles.sectionWarning
        ]}>
          <Text style={styles.sectionTitle}>📝 Contrato</Text>
          <View style={styles.contratoStatus}>
            <Text style={styles.contratoStatusIcon}>
              {os.contrato_assinado ? '✅' : '⚠️'}
            </Text>
            <Text style={styles.contratoStatusText}>
              {os.contrato_assinado ? 'Assinado' : 'Pendente de Assinatura'}
            </Text>
          </View>
          
          {os.contrato_assinado && os.contrato?.assinado_em && (
            <Text style={styles.contratoInfo}>
              Assinado em: {new Date(os.contrato.assinado_em).toLocaleDateString('pt-BR')}
            </Text>
          )}

          {!os.contrato_assinado && os.status !== 'concluida' && (
            <TouchableOpacity
              style={styles.assinaturaBtn}
              onPress={() => navigation.navigate('Signature', { 
                osId: os.id, 
                contratoId: os.contrato_id 
              })}
            >
              <Text style={styles.assinaturaBtnText}>✍️ Coletar Assinatura</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Equipamentos Vinculados */}
      {os.equipamentos_vinculados?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Equipamentos</Text>
          {os.equipamentos_vinculados.map((equip, index) => (
            <View key={index} style={styles.equipamentoItem}>
              <Text style={styles.equipamentoNome}>{equip.tipo}</Text>
              <Text style={styles.equipamentoSerial}>SN: {equip.numero_serie}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Observações */}
      {os.observacoes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Observações</Text>
          <Text style={styles.observacoesText}>{os.observacoes}</Text>
        </View>
      )}

      {/* Ações */}
      <View style={styles.actionsContainer}>
        {os.status === 'aberta' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => Alert.alert('Info', 'Aguardando agendamento pelo administrador')}
          >
            <Text style={styles.actionBtnTextSecondary}>
              ⏳ Aguardando Agendamento
            </Text>
          </TouchableOpacity>
        )}

        {os.status === 'agendada' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => updateStatus('em_andamento')}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>▶️ Iniciar Execução</Text>
            )}
          </TouchableOpacity>
        )}

        {os.status === 'em_andamento' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSuccess]}
            onPress={handleConcluir}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>✅ Concluir OS</Text>
            )}
          </TouchableOpacity>
        )}

        {os.status === 'concluida' && (
          <View style={[styles.actionBtn, styles.actionBtnCompleted]}>
            <Text style={styles.actionBtnTextCompleted}>
              ✅ OS Concluída
            </Text>
            {os.data_fim_execucao && (
              <Text style={styles.completedDate}>
                {new Date(os.data_fim_execucao).toLocaleDateString('pt-BR')}
              </Text>
            )}
          </View>
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
    alignItems: 'center',
    backgroundColor: '#f1f5f9'
  },
  errorText: {
    fontSize: 16,
    color: '#64748b'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  numero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  tipo: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  agendamentoInfo: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  agendamentoLabel: {
    fontSize: 13,
    color: '#64748b'
  },
  agendamentoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginTop: 2
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b'
  },
  viewAllLink: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '500'
  },
  clienteNome: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 10
  },
  clienteInfo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6
  },
  enderecoContainer: {
    marginBottom: 15
  },
  mapLink: {
    fontSize: 13,
    color: '#1e40af',
    marginTop: 4
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10
  },
  contactBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  contactBtnText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500'
  },
  progressBadge: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginBottom: 15,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 8
  },
  checklistItemDone: {
    backgroundColor: '#ecfdf5'
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
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
    fontWeight: 'bold',
    fontSize: 14
  },
  checklistContent: {
    flex: 1
  },
  checklistText: {
    fontSize: 15,
    color: '#1e293b'
  },
  checklistTextDone: {
    textDecorationLine: 'line-through',
    color: '#64748b'
  },
  obrigatorioLabel: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 3
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10
  },
  photoBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center'
  },
  photoBtnIcon: {
    fontSize: 24,
    marginBottom: 6
  },
  photoBtnText: {
    fontSize: 13,
    color: '#64748b'
  },
  contratoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  contratoStatusIcon: {
    fontSize: 20,
    marginRight: 8
  },
  contratoStatusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b'
  },
  contratoInfo: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10
  },
  assinaturaBtn: {
    backgroundColor: '#1e40af',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  assinaturaBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15
  },
  equipamentoItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  equipamentoNome: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b'
  },
  equipamentoSerial: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  observacoesText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22
  },
  actionsContainer: {
    padding: 15,
    paddingBottom: 35
  },
  actionBtn: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10
  },
  actionBtnPrimary: {
    backgroundColor: '#1e40af'
  },
  actionBtnSuccess: {
    backgroundColor: '#10b981'
  },
  actionBtnSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  actionBtnCompleted: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#10b981'
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600'
  },
  actionBtnTextSecondary: {
    color: '#64748b',
    fontSize: 16
  },
  actionBtnTextCompleted: {
    color: '#10b981',
    fontSize: 17,
    fontWeight: '600'
  },
  completedDate: {
    color: '#059669',
    fontSize: 13,
    marginTop: 4
  }
});
