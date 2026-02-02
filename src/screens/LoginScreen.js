import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { authAPI } from '../services/api';
import { saveToken } from '../services/storage'; // ← ДОБАВЬ ЭТУ СТРОКУ

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
const [successMessage, setSuccessMessage] = useState(''); // ← ДОБАВЬ ЭТУ СТРОКУ

// Функция логина
const handleLogin = async () => {
  console.log('🔵 Кнопка нажата!');
  console.log('Email:', email);
  console.log('Password:', password ? '***' : 'пусто');
  
  // Валидация
  if (!email || !password) {
    console.log('❌ Ошибка валидации');
    Alert.alert('Ошибка', 'Заполните все поля');
    return;
  }

  console.log('✅ Валидация пройдена');
  setLoading(true);

  try {
    console.log('🚀 Отправляем запрос на сервер...');
    
    // Отправляем запрос на сервер
    const response = await authAPI.login(email, password);
    
    console.log('✅ Ответ сервера:', response);
    
    // Если успешно - сохраняем токен и переходим на главный экран

if (response.token) {
  console.log('✅ Токен получен:', response.token.substring(0, 20) + '...');
  
  // Сохраняем токен в AsyncStorage
  await saveToken(response.token, response.userId);
  
  // Показываем сообщение об успехе
  setSuccessMessage('✅ Успешный вход! Токен получен!');
  
  // Через 1 секунду переходим на экран задач
  setTimeout(() => {
    navigation.replace('Tasks');
  }, 1000);
}else {
      console.log('⚠️ Токен не получен');
      Alert.alert('Ошибка', 'Токен не получен от сервера');
    }
  } catch (error) {
    console.log('❌ ОШИБКА:', error);
    console.log('Response:', error.response?.data);
    
    // Обработка ошибок
    const message = error.response?.data?.error || 'Ошибка входа';
    Alert.alert('Ошибка', message);
  } finally {
    console.log('🏁 Завершение');
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Заголовок */}
        <Text style={styles.title}>MindAndMotion</Text>
        <Text style={styles.subtitle}>Вход в систему</Text>

{/* ДОБАВЬ ЭТО */}
{successMessage ? (
  <View style={styles.successBox}>
    <Text style={styles.successText}>{successMessage}</Text>
  </View>
) : null}

        {/* Поле Email */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Поле Password */}
        <TextInput
          style={styles.input}
          placeholder="Пароль"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        {/* Кнопка входа */}
        <TouchableOpacity 
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Войти</Text>
          )}
        </TouchableOpacity>

        {/* Ссылки */}
        <TouchableOpacity 
          style={styles.linkContainer}
          onPress={() => Alert.alert('Скоро', 'Экран регистрации в разработке')}
        >
          <Text style={styles.link}>Нет аккаунта? Зарегистрироваться</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkContainer}
          onPress={() => Alert.alert('Скоро', 'Восстановление пароля в разработке')}
        >
          <Text style={styles.link}>Забыли пароль?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  link: {
    color: '#007AFF',
    fontSize: 14,
  },

link: {
  color: '#007AFF',
  fontSize: 14,
},
// ДОБАВЬ ЭТО:
successBox: {
  backgroundColor: '#4CAF50',
  borderRadius: 8,
  padding: 15,
  marginBottom: 20,
  alignItems: 'center',
},
successText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},

});

