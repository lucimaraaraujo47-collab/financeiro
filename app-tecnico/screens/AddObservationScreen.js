import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { THEME } from '../config';
import OfflineService from '../services/OfflineService';

export default function AddObservationScreen({ route, navigation, token }) {
  const { osId, currentObs } = route.params;
  const [observacao, setObservacao] = useState(currentObs || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!observacao.trim()) {
      Alert.alert('Atenção', 'Digite uma observação');
      return;
    }

    setSaving(true);
    try {
      const isOnline = await OfflineService.checkNetwork();
      
      if (isOnline) {
        // Tentar salvar online
        const axios = require('axios').default;
        const { API_URL } = require('../config');
        
        await axios.patch(
          `${API_URL}/ordens-servico/${osId}/observacoes`,
          { observacoes_tecnico: observacao },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        Alert.alert('Sucesso', 'Observação salva!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Salvar offline
        await OfflineService.addToSyncQueue({
          type: 'ADD_OBSERVATION',
          osId,
          observacoes: observacao
        });
        
        Alert.alert(
          '📴 Salvo Offline',
          'A observação será sincronizada quando houver conexão.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Erro ao salvar observação:', error);
      
      // Salvar offline em caso de erro
      await OfflineService.addToSyncQueue({
        type: 'ADD_OBSERVATION',
        osId,
        observacoes: observacao
      });
      
      Alert.alert(
        '📴 Salvo Offline',
        'Erro de conexão. A observação será sincronizada quando houver internet.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setSaving(false);
    }
  };

  const sugestoes = [
    'Cliente ausente',
    'Reagendamento solicitado',
    'Aguardando peça',
    'Serviço concluído sem pendências',
    'Necessita visita de retorno'
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.label}>Observação do Técnico</Text>
        
        <TextInput
          style={styles.textInput}
          value={observacao}
          onChangeText={setObservacao}
          placeholder="Digite suas observações sobre o serviço..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={styles.sugestoesLabel}>Sugestões rápidas:</Text>
        <View style={styles.sugestoesContainer}>
          {sugestoes.map((sug, index) => (
            <TouchableOpacity
              key={index}
              style={styles.sugestaoChip}
              onPress={() => setObservacao(prev => prev ? `${prev}\n${sug}` : sug)}
            >
              <Text style={styles.sugestaoText}>{sug}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? '⏳ Salvando...' : '💾 Salvar'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9'
  },
  scrollContainer: {
    flex: 1,
    padding: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 10
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sugestoesLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 20,
    marginBottom: 10
  },
  sugestoesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  sugestaoChip: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  sugestaoText: {
    fontSize: 13,
    color: '#475569'
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
    marginBottom: 20
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#e2e8f0'
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600'
  },
  saveButton: {
    backgroundColor: THEME.primary
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.7
  }
});
