import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import OSDetailScreen from './screens/OSDetailScreen';
import SignatureScreen from './screens/SignatureScreen';

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
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1e40af' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      >
        {!isLoggedIn ? (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {props => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Home" options={{ title: 'Minhas OS' }}>
              {props => <HomeScreen {...props} user={user} token={token} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="OSDetail" options={{ title: 'Detalhes da OS' }}>
              {props => <OSDetailScreen {...props} user={user} token={token} />}
            </Stack.Screen>
            <Stack.Screen name="Signature" options={{ title: 'Assinatura do Cliente' }}>
              {props => <SignatureScreen {...props} token={token} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
