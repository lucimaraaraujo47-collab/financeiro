import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { API_URL, LABELS } from '../config';

const { width: screenWidth } = Dimensions.get('window');

export default function PhotoGalleryScreen({ route, navigation, token }) {
  const { osId, fotos = [] } = route.params;
  const [photos, setPhotos] = useState(fotos);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const tipoLabels = {
    antes: 'Antes',
    durante: 'Durante',
    depois: 'Depois',
    equipamento: 'Equipamento',
    documento: 'Documento',
    geral: 'Geral'
  };

  const handleAddPhoto = (tipo) => {
    navigation.navigate('Camera', { osId, tipoFoto: tipo });
  };

  const renderPhoto = ({ item, index }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => setSelectedPhoto(item)}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.photoLabel}>
        <Text style={styles.photoLabelText}>
          {tipoLabels[item.tipo] || 'Foto'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Botões para adicionar fotos */}
      <View style={styles.addButtons}>
        <Text style={styles.sectionTitle}>Adicionar Foto</Text>
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddPhoto('antes')}
          >
            <Text style={styles.addButtonIcon}>📷</Text>
            <Text style={styles.addButtonText}>Antes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddPhoto('durante')}
          >
            <Text style={styles.addButtonIcon}>🔧</Text>
            <Text style={styles.addButtonText}>Durante</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddPhoto('depois')}
          >
            <Text style={styles.addButtonIcon}>✅</Text>
            <Text style={styles.addButtonText}>Depois</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddPhoto('equipamento')}
          >
            <Text style={styles.addButtonIcon}>📦</Text>
            <Text style={styles.addButtonText}>Equip.</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Galeria */}
      <View style={styles.gallery}>
        <Text style={styles.sectionTitle}>
          Fotos da OS ({photos.length})
        </Text>

        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyText}>Nenhuma foto ainda</Text>
            <Text style={styles.emptySubtext}>
              Adicione fotos para documentar o serviço
            </Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={renderPhoto}
            keyExtractor={(item, index) => `photo-${index}`}
            numColumns={3}
            contentContainerStyle={styles.photoGrid}
          />
        )}
      </View>

      {/* Modal de visualização */}
      <Modal
        visible={!!selectedPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedPhoto(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          {selectedPhoto && (
            <>
              <Image
                source={{ uri: selectedPhoto.url }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>
                  {tipoLabels[selectedPhoto.tipo] || 'Foto'}
                </Text>
                {selectedPhoto.timestamp && (
                  <Text style={styles.modalTimestamp}>
                    {new Date(selectedPhoto.timestamp).toLocaleString('pt-BR')}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9'
  },
  addButtons: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  addButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4
  },
  addButtonIcon: {
    fontSize: 24,
    marginBottom: 4
  },
  addButtonText: {
    fontSize: 12,
    color: '#64748b'
  },
  gallery: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15
  },
  photoGrid: {
    paddingBottom: 20
  },
  photoItem: {
    width: (screenWidth - 50) / 3,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0'
  },
  thumbnail: {
    width: '100%',
    height: '100%'
  },
  photoLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 4
  },
  photoLabelText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 5
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 24
  },
  fullImage: {
    width: screenWidth,
    height: screenWidth,
    maxHeight: '70%'
  },
  modalInfo: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  modalInfoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center'
  },
  modalTimestamp: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center'
  }
});
