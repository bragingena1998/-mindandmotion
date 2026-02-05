// src/components/DatePicker.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Web: react-datepicker + ReactDOM для Portal
let ReactDatePicker = null;
let ReactDOM = null;
if (Platform.OS === 'web') {
  ReactDatePicker = require('react-datepicker').default;
  ReactDOM = require('react-dom');
  require('react-datepicker/dist/react-datepicker.css');
  require('./DatePicker.css');
}

// Mobile: DateTimePicker
let DateTimePicker = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const DatePicker = ({ label, value, onChangeDate }) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Конвертация YYYY-MM-DD в Date объект
  const getDateFromString = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-');
    return new Date(year, month - 1, day);
  };

  // Конвертация Date в YYYY-MM-DD
  const getStringFromDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Форматирование для отображения (ДД.ММ.ГГГГ)
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'Выберите дату';
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
  };

  // WEB: react-datepicker с Portal
  if (Platform.OS === 'web' && ReactDatePicker && ReactDOM) {
    const calendarPortal = isOpen && ReactDOM.createPortal(
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
      }}>
        {/* Затемнённый фон */}
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 999999,
          }}
          onClick={() => {
            console.log('❌ Закрытие по клику на фон');
            setIsOpen(false);
          }}
        />
        
        {/* Карточка календаря */}
        <div style={{
          position: 'relative',
          zIndex: 1000000,
          borderRadius: '16px',
          padding: '20px',
          backgroundColor: colors.surface,
          border: `2px solid ${colors.borderSubtle}`,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
          maxWidth: '360px',
          width: '90%',
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '16px',
            textAlign: 'center',
            color: colors.accentText,
          }}>
            Выберите дату
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <ReactDatePicker
              selected={getDateFromString(value)}
              onChange={(date) => {
                console.log('📅 Дата выбрана:', date);
                const dateString = getStringFromDate(date);
                console.log('📅 Преобразовано в:', dateString);
                onChangeDate(dateString);
                setIsOpen(false);
              }}
              inline
              locale="ru"
              dateFormat="dd.MM.yyyy"
            />
          </div>
          
          <button
            onClick={() => {
              console.log('❌ Закрываем календарь');
              setIsOpen(false);
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: colors.danger1,
              color: '#020617',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            Закрыть
          </button>
        </div>
      </div>,
      document.body // ← РЕНДЕРИМ В BODY, А НЕ ВНУТРИ МОДАЛКИ!
    );

    return (
      <View style={styles.container}>
        {label && (
          <Text style={[styles.label, { color: colors.textMain }]}>
            {label}
          </Text>
        )}
        
        <TouchableOpacity
          style={[styles.button, { 
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
          }]}
          onPress={() => {
            console.log('📅 Открываем календарь');
            setIsOpen(true);
          }}
        >
          <Text style={[styles.buttonText, { color: colors.textMain }]}>
            {formatDateForDisplay(value)}
          </Text>
          <Text style={styles.icon}>📅</Text>
        </TouchableOpacity>

        {calendarPortal}
      </View>
    );
  }

  // iOS/ANDROID: DateTimePicker
  if (Platform.OS !== 'web' && DateTimePicker) {
    return (
      <View style={styles.container}>
        {label && (
          <Text style={[styles.label, { color: colors.textMain }]}>
            {label}
          </Text>
        )}
        
        <TouchableOpacity
          style={[styles.button, { 
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
          }]}
          onPress={() => {
            console.log('📅 Открываем нативный календарь (iOS/Android)');
            setIsOpen(true);
          }}
        >
          <Text style={[styles.buttonText, { color: colors.textMain }]}>
            {formatDateForDisplay(value)}
          </Text>
          <Text style={styles.icon}>📅</Text>
        </TouchableOpacity>

        {isOpen && (
          <DateTimePicker
            value={getDateFromString(value)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              console.log('📅 Нативная дата выбрана:', selectedDate);
              setIsOpen(Platform.OS === 'ios');
              
              if (selectedDate) {
                const dateString = getStringFromDate(selectedDate);
                console.log('📅 Преобразовано в:', dateString);
                onChangeDate(dateString);
              }
            }}
            locale="ru-RU"
          />
        )}
      </View>
    );
  }

  // Fallback
  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textMain }]}>
          {label}
        </Text>
      )}
      
      <View style={[styles.button, { 
        backgroundColor: colors.surface,
        borderColor: colors.borderSubtle,
      }]}>
        <Text style={[styles.buttonText, { color: colors.textMuted }]}>
          {formatDateForDisplay(value)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.06,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
  },
  icon: {
    fontSize: 20,
  },
});

export default DatePicker;

