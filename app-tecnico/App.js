import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import OSDetailScreen from './screens/OSDetailScreen';
import SignatureScreen from './screens/SignatureScreen';
import CameraScreen from './screens/CameraScreen';
import PhotoGalleryScreen from './screens/PhotoGalleryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    checkLogin();
  }, []);

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
      <NavigationContainer>
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
    </>
  );
}

const styles = StyleSheet.create({
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
