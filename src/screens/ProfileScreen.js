// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator 
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { getToken, removeToken } from '../services/storage';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';

const ProfileScreen = () => {
  const { colors, theme, changeTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ tasks: 0, habits: 0 });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  // Загрузка данных
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      // 1. Профиль
      const userRes = await api.get('/user/profile'); // Используем тот роут, что мы правили утром
      setUser(userRes.data);

      // 2. Статистика (нужно добавить роут или посчитать примерно)
      // Пока заглушка или реальный запрос, если есть
      // const statsRes = await api.get('/user/stats/total'); 
      // setStats(statsRes.data);
      
    } catch (err) {
      console.error('Ошибка профиля:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await removeToken();
    window.location.href = '/'; // Перезагрузка на логин
  };

  const toggleGender = async () => {
    const newGender = user.gender === 'male' ? 'female' : 'male';
    // Оптимистичное обновление
    setUser({ ...user, gender: newGender });
    
    try {
      // Отправляем на сервер (нужен роут PUT /api/user/profile)
      // Если роута нет, то просто визуально поменяется до перезагрузки
      await api.put('/user/profile', { gender: newGender });
    } catch (err) {
      console.error('Ошибка смены пола:', err);
      // alert('Не удалось сохранить пол');
    }
  };

  // Темы для переключателя
  const themes = [
    { key: 'default', label: 'Обычная 🌑' },
    { key: 'storm', label: 'Шторм ⚡' },
    { key: 'ice', label: 'Лед ❄️' },
    { key: 'blood', label: 'Кровь 🔥' },
    { key: 'toxic', label: 'Токсик ☢️' },
    { key: 'glitch', label: 'Глитч 👾' },
  ];
// Функция смены пароля
  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      alert('Новые пароли не совпадают');
      return;
    }
    if (passwords.new.length < 6) {
      alert('Пароль должен быть минимум 6 символов');
      return;
    }

    try {
      await api.put('/user/password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      alert('Пароль успешно изменен!');
      setShowPasswordModal(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Ошибка смены пароля');
    }
  };
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent1} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      
           {/* 1. ШАПКА ПРОФИЛЯ */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        
        {/* Стильный аватар с инициалами */}
        <View style={[styles.avatarContainer, { 
          backgroundColor: colors.surface,
          borderColor: colors.accent1,
          shadowColor: colors.accent1,
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 5
        }]}>
          <Text style={[styles.avatarText, { color: colors.accent1 }]}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
          </Text>
        </View>

        <Text style={[styles.userName, { color: colors.textMain }]}>
          {user?.name || 'Пользователь'}
        </Text>

        <Text style={[styles.userEmail, { color: colors.textMuted }]}>
          {user?.email}
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
            В ПУТИ С {new Date(user?.created_at).getFullYear()} ГОДА
          </Text>
        </View>
      </View>

      {/* 2. НАСТРОЙКИ */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>НАСТРОЙКИ</Text>
        
        {/* Пол (Влияет на статистику жизни) */}
        <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
          <Text style={[styles.rowLabel, { color: colors.textMain }]}>Пол (для статистики)</Text>
          <TouchableOpacity 
            onPress={toggleGender}
            style={[styles.genderButton, { backgroundColor: colors.surface, borderColor: colors.accent1 }]}
          >
            <Text style={{ color: colors.textMain, fontWeight: 'bold' }}>
              {user?.gender === 'female' ? 'ЖЕНСКИЙ' : 'МУЖСКОЙ'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Выбор Темы */}
        <View style={[styles.row, { borderBottomColor: 'transparent', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
          <Text style={[styles.rowLabel, { color: colors.textMain }]}>Тема оформления</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {themes.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.themeChip,
                  { 
                    backgroundColor: theme === t.key ? colors.accent1 : colors.surface,
                    borderColor: theme === t.key ? colors.accent1 : colors.borderSubtle
                  }
                ]}
                onPress={() => changeTheme(t.key)}
              >
                <Text style={{ 
                  fontSize: 12, 
                  fontWeight: '600',
                  color: theme === t.key ? '#020617' : colors.textMain 
                }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* 3. АККАУНТ */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>АККАУНТ</Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
          // onPress={() => alert('Функция смены пароля в разработке')}
        >
          <Text style={[styles.actionText, { color: colors.textMain }]}>🔒 Сменить пароль</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: colors.danger1, marginTop: 12 }]}
          onPress={handleLogout}
        >
          <Text style={[styles.actionText, { color: colors.danger1 }]}>🚪 Выйти</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
      <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 10 }}>
        MIND & MOTION v1.0.2
      </Text>
      <View style={{ height: 40 }} />

      {/* Модалка смены пароля */}
      <Modal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Смена пароля"
      >
        <Input
          label="Текущий пароль"
          secureTextEntry
          value={passwords.current}
          onChangeText={(t) => setPasswords({ ...passwords, current: t })}
        />
        <Input
          label="Новый пароль"
          secureTextEntry
          value={passwords.new}
          onChangeText={(t) => setPasswords({ ...passwords, new: t })}
        />
        <Input
          label="Повторите новый пароль"
          secureTextEntry
          value={passwords.confirm}
          onChangeText={(t) => setPasswords({ ...passwords, confirm: t })}
        />
        <Button title="Сохранить новый пароль" onPress={handleChangePassword} />
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  genderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
    avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
  },

});

export default ProfileScreen;
