// src/components/Modal.js
// Модальное окно (как на вашем сайте)

import React from 'react';
import { View, Text, Modal as RNModal, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const Modal = ({ visible, onClose, title, children }) => {
  const { colors, spacing } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Затемнённый фон */}
      <TouchableOpacity 
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Контент модалки (не закрывается при клике) */}
        <TouchableOpacity 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.modal,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accentBorder,
                borderRadius: spacing.radiusLg,
              },
            ]}
          >
            {/* Заголовок */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.accentText }]}>
                {title}
              </Text>
              
              {/* Кнопка закрытия */}
              <TouchableOpacity
                style={[styles.closeButton, { borderColor: colors.borderSubtle }]}
                onPress={onClose}
              >
                <Text style={[styles.closeIcon, { color: colors.textMain }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {/* Контент */}
            <View style={styles.content}>
              {children}
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    borderWidth: 2,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.95,
    shadowRadius: 60,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    // Контент внутри модалки
  },
});

export default Modal;

