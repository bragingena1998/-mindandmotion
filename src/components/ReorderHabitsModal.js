// src/components/ReorderHabitsModal.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, ScrollView } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // <-- ADDED
import { useTheme } from '../contexts/ThemeContext';
import Button from './Button';

const ReorderHabitsModal = ({ visible, onClose, habits, onSave }) => {
  const { colors } = useTheme();
  const [data, setData] = useState(habits);

  useEffect(() => {
    if (visible) {
      setData(habits);
    }
  }, [visible, habits]);

  // Функции для кнопок (Web)
  const moveUp = (index) => {
    if (index === 0) return;
    const newData = [...data];
    [newData[index - 1], newData[index]] = [newData[index], newData[index - 1]];
    setData(newData);
  };

  const moveDown = (index) => {
    if (index === data.length - 1) return;
    const newData = [...data];
    [newData[index], newData[index + 1]] = [newData[index + 1], newData[index]];
    setData(newData);
  };

  // Рендер элемента для Drag & Drop (Mobile)
  const renderDraggableItem = ({ item, drag, isActive, index }) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={200}
          style={[
            styles.rowItem,
            { 
              backgroundColor: isActive ? colors.surfaceHover : colors.surface,
              borderColor: isActive ? colors.accent1 : colors.borderSubtle,
              elevation: isActive ? 5 : 0,
            }
          ]}
        >
          <Text style={[styles.dragIcon, { color: colors.textMuted }]}>☰</Text>
          <Text style={[styles.text, { color: colors.textMain }]}>{item.name}</Text>
          {isActive && <Text style={{ fontSize: 16 }}> ✨</Text>}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  // Рендер элемента для кнопок (Web)
  const renderButtonItem = (item, index) => {
    return (
      <View
        key={item.id}
        style={[
          styles.rowItem,
          { 
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
          }
        ]}
      >
        <Text style={[styles.text, { color: colors.textMain, flex: 1 }]}>{item.name}</Text>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => moveUp(index)}
            disabled={index === 0}
            style={[
              styles.arrowButton,
              { 
                backgroundColor: index === 0 ? colors.surface : colors.accent1,
                borderColor: colors.borderSubtle,
              }
            ]}
          >
            <Text style={{ color: index === 0 ? colors.textMuted : '#020617', fontSize: 16 }}>↑</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => moveDown(index)}
            disabled={index === data.length - 1}
            style={[
              styles.arrowButton,
              { 
                backgroundColor: index === data.length - 1 ? colors.surface : colors.accent1,
                borderColor: colors.borderSubtle,
              }
            ]}
          >
            <Text style={{ color: index === data.length - 1 ? colors.textMuted : '#020617', fontSize: 16 }}>↓</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      {/* WRAP IN GESTURE HANDLER ROOT VIEW */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textMain }]}>Порядок привычек</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {Platform.OS === 'web' ? 'Используй кнопки ↑ ↓' : 'Зажми и перетащи'}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              {Platform.OS === 'web' ? (
                // ДЛЯ ВЕБА: Кнопки
                <ScrollView style={{ flex: 1 }}>
                  {data.map((item, index) => renderButtonItem(item, index))}
                </ScrollView>
              ) : (
                // ДЛЯ МОБИЛКИ: Drag & Drop
                <DraggableFlatList
                  data={data}
                  onDragEnd={({ data }) => setData(data)}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={renderDraggableItem}
                  containerStyle={{ flex: 1 }}
                  activationDistance={20}
                />
              )}
            </View>

            <View style={styles.footer}>
              <Button 
                title="Отмена" 
                variant="outline" 
                onPress={onClose} 
                style={{ flex: 1, marginRight: 8 }} 
              />
              <Button 
                title="Сохранить" 
                onPress={() => onSave(data)} 
                style={{ flex: 1, marginLeft: 8 }} 
              />
            </View>

          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
  dragIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
});

export default ReorderHabitsModal;
