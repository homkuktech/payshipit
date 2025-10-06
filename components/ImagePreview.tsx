import React from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { X } from 'lucide-react-native';

interface ImagePreviewProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={32} color="#ffffff" />
        </TouchableOpacity>
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
  closeButton: { position: 'absolute', top: 60, right: 20, zIndex: 1 },
  image: { width: '100%', height: '100%' },
});

export default ImagePreview;