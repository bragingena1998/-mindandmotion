import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
// Убрали removeUserEmail, так как он вызывает ошибку
import { removeToken } from '../services/storage';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import AlertModal from '../components/AlertModal';
import DatePickerModal from '../components/DatePickerModal';

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const [y, m, d] = cleanDate.split('-');
  return `${d}.${m}.${y}`;
};

const ProfileScreen = ({ onLogout }) => {
  const { colors, theme, changeTheme } = useTheme();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Состояния модалок
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'success' });

  const showAlert = (title, message, type = 'success') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      setUser(response.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleUpdateProfile = async (updates) => {
    try {
      const res = await api.put('/user/profile', updates);
      setUser(res.data);
    } catch (error) { showAlert('Ошибка', 'Не удалось обновить профиль', 'error'); }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) return showAlert('Ошибка', 'Пароли не совпадают', 'error');
    if (passwordData.new.length < 6) return showAlert('Ошибка', 'Минимум 6 символов', 'error');
    
    try {
      await api.put('/user/password', { currentPassword: passwordData.current, newPassword: passwordData.new });
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      showAlert('Успешно', 'Пароль изменен');
    } catch (error) {
      showAlert('Ошибка', error.response?.data?.error || 'Не удалось сменить пароль', 'error');
    }
  };

  // ИСПРАВЛЕНИЕ ОШИБКИ ВЫХОДА
  const handleLogout = async () => {
    await removeToken();
    // Убрали removeUserEmail(), так как этой функции нет в storage.js
    onLogout();
  };

  // Вернули эмодзи для красивой карусели
  const themes = [
    { key: 'default', emoji: '🌑', name: 'Default' },
    { key: 'storm', emoji: '⚡', name: 'Storm' },
    { key: 'ice', emoji: '❄️', name: 'Ice' },
    { key: 'blood', emoji: '🔥', name: 'Blood' },
    { key: 'toxic', emoji: '☢️', name: 'Toxic' },
    { key: 'glitch', emoji: '👾', name: 'Glitch' },
  ];

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent1} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* 1. ШАПКА ПРОФИЛЯ */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.surface, borderColor: colors.accent1, shadowColor: colors.accent1 }]}>
          <Text style={[styles.avatarText, { color: colors.accent1 }]}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
          </Text>
        </View>

        <Text style={[styles.userName, { color: colors.textMain }]}>{user?.name || 'Пользователь'}</Text>
        <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email}</Text>
        
        <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {/* ИСПРАВЛЕНИЕ: Делаем текст светлым (цвета textMain вместо textSecondary) */}
          <Text style={[styles.badgeText, { color: colors.textMain }]}>
            В ПУТИ С {user?.created_at ? new Date(user.created_at).getFullYear() : '2026'} ГОДА
          </Text>
        </View>
      </View>

      {/* 2. НАСТРОЙКИ */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ЛИЧНЫЕ ДАННЫЕ</Text>
        
        {/* Имя */}
        <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
          <Text style={[styles.rowLabel, { color: colors.textMain }]}>Имя</Text>
          <View style={{ width: 160 }}>
            <Input 
               value={user?.name || ''} 
               onChangeText={(text) => setUser({...user, name: text})} 
               onEndEditing={(e) => handleUpdateProfile({ name: e.nativeEvent.text })}
               style={{ height: 40, paddingVertical: 0 }}
            />
          </View>
        </View>

        {/* Дата рождения - СТИЛЬ КАК У INPUT */}
        <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
          <Text style={[styles.rowLabel, { color: colors.textMain }]}>Дата рождения</Text>
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            style={{ 
               width: 160,
               height: 40,
               backgroundColor: colors.surface,
               borderWidth: 1,
               borderColor: colors.border,
               borderRadius: 12, // Такой же радиус как у Input
               justifyContent: 'center',
               paddingHorizontal: 16
            }}
          >
            <Text style={{ color: user?.birthdate ? colors.textMain : colors.textMuted, fontSize: 16 }}>
              {user?.birthdate ? formatDateDisplay(user.birthdate) : 'Выбрать'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Пол */}
        <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
          <Text style={[styles.rowLabel, { color: colors.textMain }]}>Пол</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => handleUpdateProfile({ gender: 'male' })} style={[styles.genderBtn, { marginRight: 8, backgroundColor: user?.gender === 'male' ? colors.accent1 : colors.surface, borderColor: colors.borderSubtle }]}>
              <Text style={{ color: user?.gender === 'male' ? '#FFF' : colors.textMuted, fontWeight: 'bold' }}>М</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleUpdateProfile({ gender: 'female' })} style={[styles.genderBtn, { backgroundColor: user?.gender === 'female' ? colors.accent1 : colors.surface, borderColor: colors.borderSubtle }]}>
              <Text style={{ color: user?.gender === 'female' ? '#FFF' : colors.textMuted, fontWeight: 'bold' }}>Ж</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3. ОФОРМЛЕНИЕ (ВЕРНУЛИ КАРУСЕЛЬ) */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ОФОРМЛЕНИЕ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {themes.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.themeCard, // Используем стиль карточки, а не чипа
                { 
                  backgroundColor: colors.surface, 
                  borderColor: theme === t.key ? colors.accent1 : colors.borderSubtle 
                }
              ]}
              onPress={() => changeTheme(t.key)}
            >
              <Text style={{ fontSize: 24 }}>{t.emoji}</Text>
              <Text style={{ color: colors.textMain, fontSize: 12, marginTop: 4, fontWeight: '600' }}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 4. АККАУНТ */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>БЕЗОПАСНОСТЬ</Text>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]} onPress={() => setShowPasswordModal(true)}>
          <Text style={[styles.actionText, { color: colors.textMain }]}>🔒 Сменить пароль</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { marginTop: 12, borderColor: colors.danger1, borderWidth: 1, backgroundColor: 'rgba(239, 68, 68, 0.05)' }]} onPress={handleLogout}>
          <Text style={[styles.actionText, { color: colors.danger1 }]}>🚪 Выйти</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* --- MODALS --- */}
      <Modal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Смена пароля">
        <Input label="Текущий пароль" secureTextEntry value={passwordData.current} onChangeText={t => setPasswordData({...passwordData, current: t})} />
        <Input label="Новый пароль" secureTextEntry value={passwordData.new} onChangeText={t => setPasswordData({...passwordData, new: t})} style={{ marginTop: 10 }} />
        <Input label="Повторите пароль" secureTextEntry value={passwordData.confirm} onChangeText={t => setPasswordData({...passwordData, confirm: t})} style={{ marginTop: 10 }} />
        <Button title="Сохранить" onPress={handleChangePassword} style={{ marginTop: 20 }} />
      </Modal>

      <DatePickerModal visible={showDatePicker} initialDate={user?.birthdate ? user.birthdate.split('T')[0] : ''} onClose={() => setShowDatePicker(false)} onSelect={(date) => handleUpdateProfile({ birthdate: date })} />
      <AlertModal visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={() => setAlertConfig({ ...alertConfig, visible: false })} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingVertical: 40, borderBottomWidth: 1 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 16, elevation: 5 },
  avatarText: { fontSize: 36, fontWeight: 'bold' },
  userName: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  userEmail: { fontSize: 14, marginBottom: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginTop: 32, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  genderBtn: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  // Вернули стиль ThemeCard
  themeCard: { width: 80, height: 80, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  actionButton: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  actionText: { fontSize: 16, fontWeight: '600' }
});

export default ProfileScreen;
