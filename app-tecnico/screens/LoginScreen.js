import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) {
      Alert.alert('Erro', 'Preencha email e senha');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        senha
      });

      const { access_token, user } = response.data;
      
      // Verificar se é técnico ou admin
      if (user.perfil !== 'tecnico' && user.perfil !== 'admin' && user.perfil !== 'ADMIN_MASTER') {
        Alert.alert('Acesso Negado', 'Este app é apenas para técnicos');
        return;
      }

      onLogin(user, access_token);
    } catch (error) {
      console.error('Erro login:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.detail || 'Erro ao fazer login'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>🛠️</Text>
        <Text style={styles.title}>App do Técnico</Text>
        <Text style={styles.subtitle}>ECHO SHOP</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#94a3b8"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    padding: 20
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40
  },
  logoText: {
    fontSize: 60,
    marginBottom: 10
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 16,
    color: '#93c5fd'
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#1e293b'
  },
  button: {
    backgroundColor: '#1e40af',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
