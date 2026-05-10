// src/components/Modal.js
import React from 'react';
import {
  View, Text, Modal as RNModal, StyleSheet,
  TouchableOpacity, ScrollView, Pressable,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const Modal = ({ visible, onClose, title, children }) => {
  const { colors } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Тап по фону — закрыть */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Стоп пропаганда клика через контент, но пропускаем скролл */}
        <View
          style={styles.modalWrapper}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <View style={[
            styles.modal,
            { backgroundColor: colors.surface, borderColor: colors.accent1 || '#333' },
          ]}>
            {title && (
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textMain }]}>{title}</Text>
                <TouchableOpacity
                  style={[styles.closeButton, { borderColor: colors.borderSubtle || '#444' }]}
                  onPress={onClose}
                >
                  <Text style={[styles.closeIcon, { color: colors.textMain }]}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {children}
            </ScrollView>
          </View>
        </View>
      </Pressable>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalWrapper: {
    width: '100%',
    maxHeight: '92%',
    alignItems: 'center',
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%', // Ограничиваем высоту модалки
    borderWidth: 2,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, maxWidth: '80%',
  },
  closeButton: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { fontSize: 14, fontWeight: 'bold', marginTop: -2 },
  scrollContent: { 
    flex: 1, // Занимает доступное пространство
    width: '100%' 
  },
  scrollContentContainer: { 
    paddingBottom: 20, // Больше отступ снизу
    flexGrow: 1, // Позволяет ScrollView расти
  },
});

export default Modal;
