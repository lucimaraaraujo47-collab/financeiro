import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import OSDetailScreen from './screens/OSDetailScreen';
import SignatureScreen from './screens/SignatureScreen';
import CameraScreen from './screens/CameraScreen';
import PhotoGalleryScreen from './screens/PhotoGalleryScreen';

import PushNotificationService from './services/PushNotificationService';
import NetworkStatusBar from './components/NetworkStatusBar';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const navigationRef = useRef(null);

  useEffect(() => {
    checkLogin();
    setupNotifications();
  }, []);

  // Configurar notificações quando usuário fizer login
  useEffect(() => {
    if (isLoggedIn && user && token) {
      registerPushToken();
    }
  }, [isLoggedIn, user, token]);

  const checkLogin = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      const savedUser = await AsyncStorage.getItem('user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Erro ao verificar login:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupNotifications = async () => {
    // Configurar listeners de notificação
    PushNotificationService.setupNotificationListeners(
      // Quando notificação é recebida com app aberto
      (notification) => {
        console.log('📬 Notificação recebida:', notification.request.content);
      },
      // Quando usuário clica na notificação
      (response) => {
        const data = response.notification.request.content.data;
        console.log('👆 Usuário clicou na notificação:', data);
        
        // Navegar para a OS se tiver osId
        if (data?.osId && navigationRef.current) {
          navigationRef.current.navigate('OSDetail', { osId: data.osId });
        }
      }
    );

    // Verificar se app foi aberto por uma notificação
    const lastNotification = await PushNotificationService.getLastNotificationResponse();
    if (lastNotification) {
      const data = lastNotification.notification.request.content.data;
      if (data?.osId) {
        // Aguardar navegação estar pronta
        setTimeout(() => {
          if (navigationRef.current) {
            navigationRef.current.navigate('OSDetail', { osId: data.osId });
          }
        }, 1000);
      }
    }

    return () => {
      PushNotificationService.removeNotificationListeners();
    };
  };

  const registerPushToken = async () => {
    try {
      // Registrar para push notifications
      const pushToken = await PushNotificationService.registerForPushNotifications();
      
      if (pushToken && user?.id) {
        // Registrar token no backend
        await PushNotificationService.registerTokenOnBackend(user.id, token);
      }
    } catch (error) {
      console.error('Erro ao registrar push notifications:', error);
    }
  };

  const handleLogin = async (userData, userToken) => {
    try {
      await AsyncStorage.setItem('token', userToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setToken(userToken);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Erro ao salvar login:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // Limpar notificações
      await PushNotificationService.clearAllNotifications();
      
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setUser(null);
      setToken(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Carregando...</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.appContainer}>
        {isLoggedIn && <NetworkStatusBar />}
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: '#1e40af' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
              headerBackTitleVisible: false
            }}
          >
          {!isLoggedIn ? (
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {props => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen 
                name="Home" 
                options={{ 
                  title: 'Minhas OS',
                  headerLeft: () => null
                }}
              >
                {props => (
                  <HomeScreen 
                    {...props} 
                    user={user} 
                    token={token} 
                    onLogout={handleLogout} 
                  />
                )}
              </Stack.Screen>

              <Stack.Screen 
                name="OSDetail" 
                options={{ title: 'Detalhes da OS' }}
              >
                {props => (
                  <OSDetailScreen 
                    {...props} 
                    user={user} 
                    token={token} 
                  />
                )}
              </Stack.Screen>

              <Stack.Screen 
                name="Signature" 
                options={{ title: 'Assinatura do Cliente' }}
              >
                {props => <SignatureScreen {...props} token={token} />}
              </Stack.Screen>

              <Stack.Screen 
                name="Camera" 
                options={{ 
                  title: 'Câmera',
                  headerShown: false 
                }}
              >
                {props => <CameraScreen {...props} token={token} />}
              </Stack.Screen>

              <Stack.Screen 
                name="PhotoGallery" 
                options={{ title: 'Fotos da OS' }}
              >
                {props => <PhotoGalleryScreen {...props} token={token} />}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e40af'
  },
  loadingText: {
    marginTop: 15,
    color: '#fff',
    fontSize: 16
  }
});
