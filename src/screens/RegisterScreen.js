import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Background from '../components/Background';
import Card from '../components/Card';
import api from '../services/api';
import { saveToken, saveUserEmail } from '../services/storage';
import AlertModal from '../components/AlertModal';
import DatePickerModal from '../components/DatePickerModal';

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
};

const RegisterScreen = ({ onNavigate, onLoginSuccess }) => {
  const { colors } = useTheme();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', birthdate: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'success' });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const showAlert = (title, message, type = 'success') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const handleSendCode = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.birthdate) {
      showAlert('Ошибка', 'Заполните все поля, включая дату рождения', 'error'); return;
    }
    setLoading(true);
    try {
      await api.post('/send-verification-code', formData);
      setStep(2);
      showAlert('Успешно', `Код подтверждения отправлен на ${formData.email}`);
    } catch (err) { showAlert('Ошибка', err.response?.data?.error || 'Не удалось отправить код', 'error'); } 
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await api.post('/verify-code', formData);
      await saveToken(res.data.token, res.data.userId);
      await saveUserEmail(res.data.email);
      onLoginSuccess();
    } catch (err) { showAlert('Ошибка', err.response?.data?.error || 'Неверный код', 'error'); } 
    finally { setLoading(false); }
  };

  return (
    <Background>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textMain }]}>{step === 1 ? 'СОЗДАНИЕ АККАУНТА' : 'ПОДТВЕРЖДЕНИЕ'}</Text>

        <Card style={styles.card}>
          {step === 1 ? (
            <>
              <Input label="Имя" value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />
              <Input label="Email" value={formData.email} onChangeText={t => setFormData({...formData, email: t})} keyboardType="email-address" autoCapitalize="none" />
              
              {/* ПОЛЕ ДАТЫ - ТЕПЕРЬ 1-в-1 КАК INPUT */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600', 
                    color: colors.textMuted, 
                    marginBottom: 8, 
                    textTransform: 'uppercase', 
                    letterSpacing: 0.5 
                }}>
                  Дата рождения
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 16,
                    height: 54, // Подгоняем высоту под Input (обычно около 50-60px)
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{ 
                    color: formData.birthdate ? colors.textMain : colors.textMuted, 
                    fontSize: 16 
                  }}>
                    {formData.birthdate ? formatDateDisplay(formData.birthdate) : 'ДД.ММ.ГГГГ'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Input label="Пароль" secureTextEntry value={formData.password} onChangeText={t => setFormData({...formData, password: t})} />
              <Button title="Получить код" onPress={handleSendCode} loading={loading} style={{ marginTop: 24 }} />
            </>
          ) : (
            <>
              <Text style={{ color: colors.textMuted, marginBottom: 16, textAlign: 'center' }}>Мы отправили код на {formData.email}</Text>
              <Input label="Код из письма" value={formData.code} onChangeText={t => setFormData({...formData, code: t})} keyboardType="numeric" />
              <Button title="Подтвердить и войти" onPress={handleVerify} loading={loading} style={{ marginTop: 24 }} />
              <TouchableOpacity onPress={() => setStep(1)} style={{ marginTop: 16 }}>
                <Text style={{ color: colors.accent1, textAlign: 'center' }}>Назад к данным</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => onNavigate('login')} style={{ marginTop: 24, alignSelf: 'center' }}>
            <Text style={{ color: colors.textMuted }}>Уже есть аккаунт? <Text style={{ color: colors.accent1, fontWeight: 'bold' }}>Войти</Text></Text>
          </TouchableOpacity>
        </Card>

        <AlertModal visible={alertVisible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={() => setAlertVisible(false)} />
        <DatePickerModal visible={showDatePicker} initialDate={formData.birthdate} onClose={() => setShowDatePicker(false)} onSelect={(date) => setFormData({...formData, birthdate: date})} />
      </ScrollView>
    </Background>
  );
};

const styles = StyleSheet.create({
  content: { padding: 24, justifyContent: 'center', minHeight: '100%' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 32, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  card: { padding: 24 }
});

export default RegisterScreen;
