import React, { useState } from 'react';
import { Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Background from '../components/Background';
import Card from '../components/Card'; // <-- ИМПОРТИРУЕМ КАРТОЧКУ
import api from '../services/api';
import AlertModal from '../components/AlertModal';

const ForgotPasswordScreen = ({ onNavigate }) => {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'success' });

  const showAlert = (title, message, type = 'success') => { setAlertConfig({ visible: true, title, message, type }); };

  const handleRequestCode = async () => {
    if (!email) return showAlert('Ошибка', 'Введите Email', 'error');
    setLoading(true);
    try {
      await api.post('/forgot-password', { email });
      setStep(2);
      showAlert('Успешно', 'Код сброса отправлен на Email');
    } catch (err) { showAlert('Ошибка', err.response?.data?.error || 'Не удалось отправить код', 'error'); } 
    finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!code || !newPassword) return showAlert('Ошибка', 'Заполните все поля', 'error');
    setLoading(true);
    try {
      await api.post('/reset-password', { email, code, new_password: newPassword });
      showAlert('Успешно', 'Пароль успешно изменен!');
    } catch (err) { showAlert('Ошибка', err.response?.data?.error || 'Ошибка сброса пароля', 'error'); } 
    finally { setLoading(false); }
  };

  return (
    <Background>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textMain }]}>ВОССТАНОВЛЕНИЕ</Text>

        <Card style={styles.card}>
          {step === 1 ? (
            <>
              <Input label="Ваш Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
              <Button title="Отправить код" onPress={handleRequestCode} loading={loading} style={{ marginTop: 24 }} />
            </>
          ) : (
            <>
              <Input label="Код из письма" value={code} onChangeText={setCode} keyboardType="numeric" />
              <Input label="Новый пароль" value={newPassword} onChangeText={setNewPassword} secureTextEntry style={{ marginTop: 16 }} />
              <Button title="Сменить пароль" onPress={handleReset} loading={loading} style={{ marginTop: 24 }} />
            </>
          )}

          <TouchableOpacity onPress={() => onNavigate('login')} style={{ marginTop: 24, alignSelf: 'center' }}>
            <Text style={{ color: colors.accent1 }}>Вернуться ко входу</Text>
          </TouchableOpacity>
        </Card>

        <AlertModal visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={() => { setAlertConfig({ ...alertConfig, visible: false }); if (alertConfig.message.includes('успешно изменен')) onNavigate('login'); }} />
      </ScrollView>
    </Background>
  );
};

const styles = StyleSheet.create({
  content: { padding: 24, justifyContent: 'center', minHeight: '100%' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 32, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  card: { padding: 24 }
});

export default ForgotPasswordScreen;
