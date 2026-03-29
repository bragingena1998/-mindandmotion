import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Modal from './Modal';
import Button from './Button';
import api from '../services/api';

const CustomCheckbox = ({ checked, onToggle, children, style }) => {
  const { colors } = useTheme();
  
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, marginBottom: 8 }, style]}
      activeOpacity={0.8}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: checked ? colors.accent1 : colors.borderSubtle,
          backgroundColor: checked ? colors.accent1 : 'transparent',
          marginRight: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        {checked && (
          <Text style={{ color: '#020617', fontSize: 12, fontWeight: '700' }}>✓</Text>
        )}
      </View>
      <Text style={{ color: colors.textMain, fontSize: 14, lineHeight: 20, flex: 1 }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const PoliciesModal = ({ visible, onClose, onAccept, user }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [emailMarketingAccepted, setEmailMarketingAccepted] = useState(false);

  const isAcceptButtonDisabled = !privacyAccepted || !termsAccepted;

  const handleAccept = async () => {
    if (isAcceptButtonDisabled) return;
    
    setLoading(true);
    try {
      await api.post('/policies/accept', {
        privacy: privacyAccepted,
        terms: termsAccepted,
        emailMarketing: emailMarketingAccepted
      });
      
      // Обновляем user объект
      onAccept({
        ...user,
        privacy_accepted: 1,
        terms_accepted: 1,
        email_marketing_accepted: emailMarketingAccepted ? 1 : 0,
        policies_accepted_at: new Date().toISOString()
      });
      
      onClose();
    } catch (error) {
      console.error('Error accepting policies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      visible={visible} 
      onClose={() => {}} // Не закрывать по нажатию вне модалки
      title="Подтверждение политик"
    >
      <View style={{ padding: 20 }}>
        <Text style={{ color: colors.textMain, fontSize: 16, marginBottom: 20, textAlign: 'center' }}>
          Для продолжения работы с приложением необходимо принять наши политики
        </Text>

        <CustomCheckbox
          checked={privacyAccepted}
          onToggle={() => setPrivacyAccepted(!privacyAccepted)}
        >
          Я принимаю{' '}
          <Text 
            style={{ color: colors.accent1, textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL('https://mindandmotion.ru/privacy.html')}
          >
            Политику конфиденциальности
          </Text>
        </CustomCheckbox>

        <CustomCheckbox
          checked={termsAccepted}
          onToggle={() => setTermsAccepted(!termsAccepted)}
        >
          Я принимаю{' '}
          <Text 
            style={{ color: colors.accent1, textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL('https://mindandmotion.ru/terms.html')}
          >
            Пользовательское соглашение
          </Text>
        </CustomCheckbox>

        <CustomCheckbox
          checked={emailMarketingAccepted}
          onToggle={() => setEmailMarketingAccepted(!emailMarketingAccepted)}
        >
          Я согласен на получение новостей и обновлений на email
        </CustomCheckbox>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
          <Button
            title="Принять"
            onPress={handleAccept}
            loading={loading}
            style={{ flex: 1 }}
            disabled={isAcceptButtonDisabled}
            textStyle={{ opacity: isAcceptButtonDisabled ? 0.5 : 1 }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Стили если понадобятся
});

export default PoliciesModal;
