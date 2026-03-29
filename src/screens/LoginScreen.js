// src/screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import api from '../services/api'; // Используем настроенный API, а не прямой axios!
import { saveToken, saveUserEmail, getUserEmail } from '../services/storage';
import Background from '../components/Background';

const { height } = Dimensions.get('window');

const LoginScreen = ({ onLoginSuccess, onNavigate }) => {
  const { colors, theme, changeTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Загружаем сохраненный email
  useEffect(() => {
    const loadEmail = async () => {
      const savedEmail = await getUserEmail();
      if (savedEmail) setEmail(savedEmail);
    };
    loadEmail();
  }, []);

  const themes = [
    { key: 'default', emoji: '🎨' },
    { key: 'storm', emoji: '⚡' },
    { key: 'ice', emoji: '❄️' },
    { key: 'blood', emoji: '🔥' },
    { key: 'toxic', emoji: '☢️' },
    { key: 'glitch', emoji: '👾' },
  ];

  const currentTheme = themes.find(t => t.key === theme) || themes[0];

  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.key === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    changeTheme(themes[nextIndex].key);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Используем api.post вместо axios.post (URL уже в конфиге)
      const response = await api.post('/login', {
        email,
        password,
      });

      const { token, userId, user } = response.data;

      if (token) {
        await saveToken(token, userId);
        await saveUserEmail(email);
        console.log('✅ Логин успешен');
        if (onLoginSuccess) onLoginSuccess(user);
      } else {
        setError('Сервер не вернул токен');
      }

    } catch (err) {
      console.error('❌ Ошибка логина:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Неверный email или пароль';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      {/* KeyboardAvoidingView важен, чтобы клавиатура не закрывала поля */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Кнопка смены темы */}
          <TouchableOpacity 
            style={[styles.themeToggle, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]} 
            onPress={cycleTheme}
          >
            <Text style={styles.themeEmoji}>{currentTheme.emoji}</Text>
          </TouchableOpacity>

          <View style={styles.centerContainer}>
            <Text style={[styles.title, { color: '#fff' }]}>
              MIND<Text style={{ color: colors.accent1 }}>AND</Text>MOTION
            </Text>

            <Card style={[styles.card, { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.1)' }]}>
              <Input
                label="Email"
                placeholder="name@example.com"
                value={email}
                onChangeText={(text) => { setEmail(text); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ color: '#fff' }} // Цвет текста ввода
              />
              
              <Input
                label="Пароль"
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => { setPassword(text); setError(''); }}
                secureTextEntry
                style={{ marginTop: 16, color: '#fff' }}
              />

              <TouchableOpacity 
                onPress={() => onNavigate('forgot-password')} 
                style={{ alignSelf: 'flex-end', marginVertical: 12 }}
              >
                <Text style={{ color: colors.accent1, fontSize: 13 }}>Забыли пароль?</Text>
              </TouchableOpacity>

              {error ? (
                <Text style={[styles.errorText, { color: '#ff4d4d' }]}>{error}</Text>
              ) : null}

              <Button 
                title="ВОЙТИ" 
                onPress={handleLogin} 
                loading={loading}
                style={styles.button}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
                <Text style={{ color: '#aaa' }}>Нет аккаунта? </Text>
                <TouchableOpacity onPress={() => onNavigate('register')}>
                  <Text style={{ color: colors.accent1, fontWeight: 'bold' }}>Создать</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Background>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    minHeight: height, // Растягиваем на всю высоту экрана
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40, // Отступ снизу
  },
  themeToggle: {
    position: 'absolute',
    top: 50, // Безопасная зона
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeEmoji: {
    fontSize: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  button: {
    marginTop: 10,
    height: 50,
  },
});

export default LoginScreen;
