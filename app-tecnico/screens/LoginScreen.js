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
  Platform,
  Image
} from 'react-native';
import axios from 'axios';
import { API_URL, THEME, APP_CONFIG } from '../config';

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
      console.log('🔄 Tentando login em:', API_URL);
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        senha
      }, {
        timeout: 15000 // 15 segundos timeout
      });

      const { access_token, user } = response.data;
      
      // Verificar se é técnico ou admin
      const perfil = (user.perfil || '').toLowerCase();
      if (perfil !== 'tecnico' && perfil !== 'admin' && perfil !== 'admin_master' && perfil !== 'operacional') {
        Alert.alert('Acesso Negado', 'Este app é apenas para técnicos e operacionais');
        return;
      }

      console.log('✅ Login bem sucedido:', user.nome);
      onLogin(user, access_token);
    } catch (error) {
      console.error('❌ Erro login:', error.message);
      console.error('URL:', API_URL);
      
      let mensagem = 'Erro ao fazer login';
      if (error.code === 'ECONNABORTED') {
        mensagem = 'Tempo de conexão esgotado. Verifique sua internet.';
      } else if (error.message === 'Network Error') {
        mensagem = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.response?.data?.detail) {
        mensagem = error.response.data.detail;
      }
      
      Alert.alert('Erro', mensagem);
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
        <Image 
          source={require('../assets/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>App do Técnico</Text>
        <Text style={styles.subtitle}>{APP_CONFIG.COMPANY_NAME}</Text>
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
        
        <Text style={styles.versionText}>v{APP_CONFIG.APP_VERSION}</Text>
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
  logo: {
    width: 120,
    height: 120,
    borderRadius: 20,
    marginBottom: 15
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
  },
  versionText: {
    textAlign: 'center',
    marginTop: 15,
    color: '#94a3b8',
    fontSize: 12
  }
});
