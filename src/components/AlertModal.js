import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Modal from './Modal';
import Button from './Button';

const AlertModal = ({ visible, title, message, onClose, type = 'success' }) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} onClose={onClose} title={title}>
      <View style={styles.container}>
        <Text style={[styles.message, { color: colors.textMain }]}>
          {message}
        </Text>
        <Button 
          title="OK" 
          onPress={onClose} 
          style={{ marginTop: 20, backgroundColor: type === 'error' ? colors.danger1 : colors.accent1 }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  }
});

export default AlertModal;
