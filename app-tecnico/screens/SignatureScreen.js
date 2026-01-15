import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import axios from 'axios';
import { API_URL } from '../config';

export default function SignatureScreen({ route, navigation, token }) {
  const { osId, contratoId } = route.params;
  const signatureRef = useRef(null);
  const [assinadoPor, setAssinadoPor] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleSave = () => {
    if (!assinadoPor.trim()) {
      Alert.alert('Erro', 'Informe o nome de quem está assinando');
      return;
    }
    signatureRef.current?.readSignature();
  };

  const handleSignature = async (signature) => {
    if (!signature || signature === 'data:,') {
      Alert.alert('Erro', 'Por favor, faça a assinatura');
      return;
    }

    setSaving(true);
    try {
      // Enviar assinatura para o backend
      await axios.post(
        `${API_URL}/contratos/${contratoId}/assinar`,
        {
          assinatura_base64: signature,
          assinado_por: assinadoPor.trim(),
          ip_assinatura: 'app-tecnico'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        'Sucesso',
        'Contrato assinado com sucesso!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erro ao salvar assinatura:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao salvar assinatura');
    } finally {
      setSaving(false);
    }
  };

  const handleEmpty = () => {
    Alert.alert('Erro', 'Por favor, faça a assinatura antes de salvar');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 Assinatura do Contrato</Text>
        <Text style={styles.subtitle}>Peça para o cliente assinar abaixo</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Nome do assinante *</Text>
        <TextInput
          style={styles.input}
          value={assinadoPor}
          onChangeText={setAssinadoPor}
          placeholder="Nome completo do cliente"
          placeholderTextColor="#94a3b8"
        />
      </View>

      <View style={styles.canvasContainer}>
        <Text style={styles.canvasLabel}>Assinatura</Text>
        <View style={styles.canvasWrapper}>
          <SignatureCanvas
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={handleEmpty}
            descriptionText=""
            clearText=""
            confirmText=""
            webStyle={`
              .m-signature-pad { box-shadow: none; border: none; }
              .m-signature-pad--body { border: none; }
              .m-signature-pad--footer { display: none; }
              body, html { width: 100%; height: 100%; }
            `}
            backgroundColor="#fff"
            penColor="#1e293b"
            style={styles.canvas}
          />
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonClear]}
          onPress={handleClear}
        >
          <Text style={styles.buttonClearText}>🗑️ Limpar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSave, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonSaveText}>✅ Salvar Assinatura</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b'
  },
  inputContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 15
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b'
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
    padding: 15
  },
  canvasLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 10
  },
  canvasWrapper: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderStyle: 'dashed',
    overflow: 'hidden'
  },
  canvas: {
    flex: 1
  },
  buttonsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  buttonClear: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  buttonClearText: {
    color: '#64748b',
    fontWeight: '600'
  },
  buttonSave: {
    backgroundColor: '#10b981'
  },
  buttonSaveText: {
    color: '#fff',
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.7
  }
});
