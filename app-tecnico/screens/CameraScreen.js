import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Camera } from 'expo-camera';
import axios from 'axios';
import { API_URL } from '../config';

export default function CameraScreen({ route, navigation, token }) {
  const { osId, tipoFoto } = route.params;
  const [hasPermission, setHasPermission] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const cameraRef = useRef(null);

  const tipoLabels = {
    antes: '📷 Foto Antes',
    durante: '🔧 Foto Durante',
    depois: '✅ Foto Depois',
    equipamento: '📦 Foto Equipamento',
    documento: '📄 Foto Documento',
    geral: '📸 Foto Geral'
  };

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photoData = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
          exif: false
        });
        setPhoto(photoData);
      } catch (error) {
        console.error('Erro ao tirar foto:', error);
        Alert.alert('Erro', 'Não foi possível tirar a foto');
      }
    }
  };

  const retakePicture = () => {
    setPhoto(null);
  };

  const uploadPhoto = async () => {
    if (!photo) return;

    setUploading(true);
    try {
      // Enviar foto como base64
      await axios.post(
        `${API_URL}/ordens-servico/${osId}/fotos`,
        {
          url: `data:image/jpeg;base64,${photo.base64}`,
          tipo: tipoFoto || 'geral',
          descricao: tipoLabels[tipoFoto] || 'Foto'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        'Sucesso',
        'Foto adicionada com sucesso!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const flipCamera = () => {
    setCameraType(
      cameraType === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.permissionText}>Verificando permissão da câmera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Permissão Negada</Text>
        <Text style={styles.permissionText}>
          O app precisa de permissão para usar a câmera.
          Vá em Configurações e habilite a câmera para este app.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (photo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{tipoLabels[tipoFoto] || 'Foto'}</Text>
        </View>

        <View style={styles.previewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.preview} />
        </View>

        <View style={styles.previewActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.retakeButton]}
            onPress={retakePicture}
          >
            <Text style={styles.retakeButtonText}>🔄 Tirar Outra</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton, uploading && styles.buttonDisabled]}
            onPress={uploadPhoto}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>✅ Usar Foto</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tipoLabels[tipoFoto] || 'Tirar Foto'}</Text>
        <Text style={styles.headerSubtitle}>Posicione a câmera e toque para capturar</Text>
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          type={cameraType}
          ref={cameraRef}
        >
          <View style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
              <Text style={styles.flipButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </Camera>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <View style={{ width: 70 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  header: {
    backgroundColor: '#1e40af',
    padding: 15,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#93c5fd',
    marginTop: 4
  },
  cameraContainer: {
    flex: 1
  },
  camera: {
    flex: 1
  },
  cameraOverlay: {
    position: 'absolute',
    top: 20,
    right: 20
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },
  flipButtonText: {
    fontSize: 24
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 30,
    backgroundColor: '#000'
  },
  cancelButton: {
    width: 70
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff'
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000'
  },
  preview: {
    flex: 1,
    resizeMode: 'contain'
  },
  previewActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
    backgroundColor: '#000'
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  retakeButton: {
    backgroundColor: '#374151'
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  uploadButton: {
    backgroundColor: '#10b981'
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  permissionIcon: {
    fontSize: 60,
    marginBottom: 20
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10
  },
  permissionText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 30
  },
  backButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
