// src/components/Modal.js
import React, { useRef } from 'react';
import {
  View, Text, Modal as RNModal, StyleSheet,
  TouchableOpacity, ScrollView, Pressable,
  PanResponder, Animated,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const Modal = ({ visible, onClose, title, children }) => {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(0)).current;

  // Жест свайпа вниз для закрытия
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        translateY.setOffset(0);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        if (g.dy > 80 || g.vy > 0.5) {
          Animated.timing(translateY, { toValue: 600, duration: 200, useNativeDriver: true }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const handleClose = () => {
    translateY.setValue(0);
    onClose();
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      {/* Тап по фону — закрыть */}
      <Pressable style={styles.backdrop} onPress={handleClose}>
        {/* Обёртка контента — стоп-пропаганда + жест */}
        <Pressable style={styles.modalWrapper}>
          <Animated.View
            style={[
              styles.modal,
              { backgroundColor: colors.surface, borderColor: colors.accent1 || '#333', borderRadius: 20 },
              { transform: [{ translateY }] },
            ]}
          >
            {/* Ручка-индикатор для свайпа */}
            <View {...panResponder.panHandlers} style={styles.dragHandle}>
              <View style={[styles.dragBar, { backgroundColor: colors.borderSubtle }]} />
            </View>

            {title && (
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textMain }]}>{title}</Text>
                <TouchableOpacity
                  style={[styles.closeButton, { borderColor: colors.borderSubtle || '#444' }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.closeIcon, { color: colors.textMain }]}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {children}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  modal: {
    width: '100%',
    maxHeight: '92%',
    maxWidth: 500,
    borderWidth: 2,
    borderBottomWidth: 0,
    padding: 24,
    paddingTop: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 24,
  },
  dragHandle: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
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
  content: { width: '100%' },
  contentContainer: { paddingBottom: 32 },
});

export default Modal;
