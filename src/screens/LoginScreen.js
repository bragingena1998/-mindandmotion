// src/screens/LoginScreen.js
import React, { useState, useEffect } from 'react'; // Добавил useEffect
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import api from '../services/api';
import axios from 'axios';
import { saveToken, saveUserEmail, getUserEmail } from '../services/storage'; // Импортируем новые методы
import Background from '../components/Background';

const LoginScreen = ({ onLoginSuccess, onNavigate }) => {
  const { colors, spacing, changeTheme, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Загружаем сохраненный email при монтировании
  useEffect(() => {
    const loadEmail = async () => {
      const savedEmail = await getUserEmail();
      if (savedEmail) {
        setEmail(savedEmail);
      }
    };
    loadEmail();
  }, []);

  const themes = [
    { key: 'default', emoji: '🎨', name: 'Default' },
    { key: 'storm', emoji: '⚡', name: 'Storm' },
    { key: 'ice', emoji: '❄️', name: 'Ice' },
    { key: 'blood', emoji: '🔥', name: 'Blood' },
    { key: 'toxic', emoji: '☢️', name: 'Toxic' },
    { key: 'glitch', emoji: '👾', name: 'Glitch' },
  ];

  const currentTheme = themes.find(t => t.key === theme) || themes[0];

  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.key === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    changeTheme(themes[nextIndex].key);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await axios.post('http://85.198.96.149:5000/api/login', {
        email,
        password,
      });

      const { token, userId } = response.data; // Предполагаем, что userId тоже возвращается

      // ✅ СОХРАНЯЕМ ТОКЕН и EMAIL через асинхронное хранилище
      await saveToken(token, userId);
      await saveUserEmail(email);

      console.log('✅ Логин успешен, токен сохранён');

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.error('❌ Ошибка логина:', error);
      setError(error.response?.data?.error || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      <View style={styles.container}>
        <TouchableOpacity 
          style={[styles.themeToggle, { borderColor: colors.border, backgroundColor: colors.surface }]} 
          onPress={cycleTheme}
        >
          <Text style={styles.themeEmoji}>{currentTheme.emoji}</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.title, { color: colors.textMain }]}>
            MIND<Text style={{ color: colors.accent1 }}>AND</Text>MOTION
          </Text>

          <Card style={styles.card}>
            <Input
              label="Email"
              placeholder="name@example.com"
              value={email}
              onChangeText={(text) => { setEmail(text); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Input
              label="Пароль"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => { setPassword(text); setError(''); }}
              secureTextEntry
              style={{ marginTop: 16 }}
            />

           {/* Кнопка "Забыли пароль" (над кнопкой Войти или где удобно) */}
     <TouchableOpacity 
       onPress={() => onNavigate('forgot-password')} 
       style={{ alignSelf: 'flex-end', marginBottom: 12 }}
     >
       <Text style={{ color: colors.accent1, fontSize: 12 }}>Забыли пароль?</Text>
     </TouchableOpacity>

            {error ? (
              <Text style={[styles.errorText, { color: colors.danger1 }]}>{error}</Text>
            ) : null}

            <Button 
              title="Войти" 
              onPress={handleLogin} 
              loading={loading}
              style={styles.button}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
        <Text style={{ color: colors.textMuted }}>Нет аккаунта? </Text>
        <TouchableOpacity onPress={() => onNavigate('register')}>
          <Text style={{ color: colors.accent1, fontWeight: 'bold' }}>Создать</Text>
        </TouchableOpacity>
     </View>

          </Card>
        </ScrollView>
      </View>
    </Background>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  themeEmoji: {
    fontSize: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    padding: 24,
  },
  errorText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    marginTop: 24,
  },
});

export default LoginScreen;
