// Serviço de Push Notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';

const STORAGE_KEYS = {
  PUSH_TOKEN: 'push_token',
  NOTIFICATIONS_ENABLED: 'notifications_enabled'
};

// Configurar como as notificações são exibidas quando o app está em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Registrar para push notifications
  async registerForPushNotifications() {
    let token = null;

    // Verificar se é um dispositivo físico
    if (!Device.isDevice) {
      console.log('Push notifications requerem dispositivo físico');
      return null;
    }

    // Verificar permissões existentes
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Solicitar permissão se não foi concedida
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permissão para notificações não concedida');
      return null;
    }

    // Obter token do Expo Push
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId || '691bb83b-a36c-4bb2-b555-314ddf890c14'
      })).data;
      
      console.log('📱 Push Token:', token);
      this.expoPushToken = token;

      // Salvar token localmente
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);

    } catch (error) {
      console.error('Erro ao obter push token:', error);
    }

    // Configurar canal de notificação para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notificações',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1e40af',
        sound: 'default'
      });

      await Notifications.setNotificationChannelAsync('os-nova', {
        name: 'Nova OS',
        description: 'Notificações de novas ordens de serviço',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#10b981',
        sound: 'default'
      });

      await Notifications.setNotificationChannelAsync('os-urgente', {
        name: 'OS Urgente',
        description: 'Notificações urgentes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        lightColor: '#ef4444',
        sound: 'default'
      });
    }

    return token;
  }

  // Registrar token no backend
  async registerTokenOnBackend(userId, userToken) {
    if (!this.expoPushToken) {
      console.log('Nenhum push token disponível');
      return false;
    }

    try {
      await axios.post(
        `${API_URL}/users/${userId}/push-token`,
        { 
          push_token: this.expoPushToken,
          platform: Platform.OS,
          device_name: Device.deviceName || 'Unknown'
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      
      console.log('✅ Push token registrado no backend');
      return true;
    } catch (error) {
      console.error('Erro ao registrar token no backend:', error);
      return false;
    }
  }

  // Configurar listeners de notificação
  setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
    // Listener para notificações recebidas com app aberto
    this.notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('📬 Notificação recebida:', notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // Listener para quando usuário interage com a notificação
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('👆 Usuário interagiu com notificação:', response);
        if (onNotificationResponse) {
          onNotificationResponse(response);
        }
      }
    );
  }

  // Remover listeners
  removeNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Enviar notificação local (para testes)
  async sendLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default'
      },
      trigger: null // Enviar imediatamente
    });
  }

  // Obter token salvo
  async getSavedToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    } catch (error) {
      return null;
    }
  }

  // Verificar se notificações estão habilitadas
  async areNotificationsEnabled() {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // Obter contagem de badges
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  // Definir contagem de badges
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Limpar todas as notificações
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }

  // Obter última notificação que abriu o app
  async getLastNotificationResponse() {
    return await Notifications.getLastNotificationResponseAsync();
  }
}

// Exportar instância singleton
export default new PushNotificationService();
