// src/screens/LoginScreen.js
// Экран авторизации с компактным переключателем тем

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import api from '../services/api';
import { saveToken } from '../services/storage';

const LoginScreen = ({ navigation }) => {
  const { colors, spacing, changeTheme, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Список тем для переключения
  const themes = [
    { key: 'default', emoji: '🎨', name: 'Default' },
    { key: 'storm', emoji: '⚡', name: 'Storm' },
    { key: 'ice', emoji: '❄️', name: 'Ice' },
    { key: 'blood', emoji: '🔥', name: 'Blood' },
    { key: 'toxic', emoji: '☢️', name: 'Toxic' },
    { key: 'glitch', emoji: '👾', name: 'Glitch' },
  ];

  // Циклическое переключение тем
  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.key === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    changeTheme(themes[nextIndex].key);
  };

  // Получаем текущую тему
  const currentTheme = themes.find(t => t.key === theme);

  const handleLogin = async () => {
    setError('');
    
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);

    try {
const response = await api.post('/api/login', { email, password });
const { token, userId } = response.data; // ← Получаем userId из ответа

await saveToken(token, userId); // ← Передаём оба параметра
navigation.replace('Tasks');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Кнопка переключения темы (в правом верхнем углу) */}
      <TouchableOpacity
        style={[
          styles.themeToggle,
          {
            backgroundColor: colors.surface,
            borderColor: colors.accentBorder,
          },
        ]}
        onPress={cycleTheme}
      >
        <Text style={styles.themeEmoji}>{currentTheme?.emoji}</Text>
      </TouchableOpacity>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Заголовок */}
        <Text style={[styles.title, { color: colors.accentText }]}>
          MINDANDMOTION
        </Text>

        {/* Карточка с формой */}
        <Card style={styles.card}>
          <Input
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Пароль"
            placeholder="••••••••"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            secureTextEntry
          />

          {error ? (
            <Text style={[styles.errorText, { color: colors.danger1 }]}>
              {error}
            </Text>
          ) : null}

          <Button
            title="Войти"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  themeToggle: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  themeEmoji: {
    fontSize: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 0.12,
    textTransform: 'uppercase',
  },
  card: {
    marginBottom: 24,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
});

export default LoginScreen;

