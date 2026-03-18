// src/components/Modal.js
import React from 'react';
import {
  View, Text, Modal as RNModal, StyleSheet,
  TouchableOpacity, ScrollView, Pressable, Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// Максимальная высота модалки — 92% экрана
const MAX_MODAL_HEIGHT = SCREEN_HEIGHT * 0.92;

const Modal = ({ visible, onClose, title, children }) => {
  const { colors } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable>
          {/*
            modal: maxHeight через пиксельное значение — так flex понимает границу.
            Внутри: header фиксирован, ScrollView flex:1 заполняет остаток.
          */}
          <View style={[
            styles.modal,
            { backgroundColor: colors.surface, borderColor: colors.accent1 || '#333' },
          ]}>
            {/* ЗАГОЛОВОК — фиксирован */}
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

            {/* СКРОЛЛ — flex:1, работает в любой точке */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              bounces={true}
            >
              {children}
            </ScrollView>
          </View>
        </Pressable>
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
  modal: {
    width: '100%',
    maxWidth: 500,
    // Пиксельное maxHeight — flex знает границу и ScrollView может занять flex:1
    maxHeight: MAX_MODAL_HEIGHT,
    flexDirection: 'column',
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
    padding: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
});

export default Modal;
