// src/components/Modal.js
import React from 'react';
import {
  View, Text, Modal as RNModal, StyleSheet,
  TouchableOpacity, ScrollView, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
      {/* GestureHandlerRootView ВНУТРИ Modal — создаёт новое дерево жестов */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
        >
          <Pressable style={styles.backdrop} onPress={onClose}>
            <Pressable style={styles.modalWrapper}>
              <View
                style={[
                  styles.modal,
                  { backgroundColor: colors.surface, borderColor: colors.accent1 || '#333' },
                ]}
              >
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
                  contentContainerStyle={styles.contentContainer}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                  nestedScrollEnabled
                  bounces={false}
                >
                  {children}
                </ScrollView>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
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
    flexShrink: 1,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    borderWidth: 2,
    borderRadius: 20,
    overflow: 'hidden',
    flexShrink: 1,
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
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
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});

export default Modal;
