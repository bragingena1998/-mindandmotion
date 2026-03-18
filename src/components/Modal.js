// src/components/Modal.js
import React from 'react';
import {
  View, Text, Modal as RNModal, StyleSheet,
  TouchableOpacity, ScrollView, Pressable, Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const Modal = ({ visible, onClose, title, children }) => {
  const { colors } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Тап по фону */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/*
          View вместо Pressable — имеет пиксельный maxHeight,
          поэтому ScrollView внутри знает свою границу и скроллит правильно.
          Pressable наружу перехватывает тап — внутренний View stopPropagation не нужен,
          потому что View не передаёт нажатие вверх.
        */}
        <View style={styles.modalWrapper}>
          <Pressable onPress={e => e.stopPropagation()} style={styles.modalInner}>
            <View style={[
              styles.modal,
              { backgroundColor: colors.surface, borderColor: colors.accent1 || '#333' },
            ]}>
              {/* ЗАГОЛОВОК */}
              {title && (
                <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
                  <Text style={[styles.title, { color: colors.textMain }]}>{title}</Text>
                  <TouchableOpacity
                    style={[styles.closeButton, { borderColor: colors.borderSubtle || '#444' }]}
                    onPress={onClose}
                  >
                    <Text style={[styles.closeIcon, { color: colors.textMain }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* СКРОЛЛ — flex:1 занимает остаток модалки, скроллит в любой точке */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                bounces={true}
              >
                {children}
              </ScrollView>
            </View>
          </Pressable>
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
  // View с пиксельным maxHeight — flex работает
  modalWrapper: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.90,
    flexDirection: 'column',
  },
  // Pressable для блокировки тапа на контент
  modalInner: {
    flex: 1,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'column',
    flex: 1,
    borderWidth: 2,
    borderRadius: 20,
    overflow: 'hidden',
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
    paddingBottom: 16,
    borderBottomWidth: 1,
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
});

export default Modal;
