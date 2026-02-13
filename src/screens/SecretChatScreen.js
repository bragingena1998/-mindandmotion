import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import Button from '../components/Button';

const SecretChatScreen = ({ onExit }) => {
  const { colors } = useTheme();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  
  const flatListRef = useRef(null);

  // Поллинг чата каждые 3 секунды
  useEffect(() => {
    let interval;
    if (isUnlocked) {
      loadMessages();
      interval = setInterval(loadMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [isUnlocked]);

  const loadMessages = async () => {
    try {
      const res = await api.get('/secret-chat');
      setMessages(res.data);
    } catch (err) {
      console.error('Ошибка загрузки чата:', err);
    }
  };

  const checkPassword = () => {
    if (password.toLowerCase().trim() === 'семечка сомнения') {
      setIsUnlocked(true);
      loadMessages();
    } else {
      alert('Неверный код доступа');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    try {
      await api.post('/secret-chat', { content: text });
      loadMessages();
    } catch (err) {
      console.error(err);
      setInputText(text);
    }
  };

  // ЭКРАН ВХОДА (ЗАГАДКА)
  if (!isUnlocked) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={onExit} style={styles.closeBtn}>
          <Text style={{color: colors.textMuted, fontSize: 24}}>✕</Text>
        </TouchableOpacity>
        
        <Text style={[styles.riddleTitle, { color: colors.accent1 }]}>
          ПЕРВАЯ СТУПЕНЬ{'\n'}РАЗВИТИЯ КАКНОТИ
        </Text>
        
        <TextInput
          style={[styles.secretInput, { 
            color: colors.textMain, 
            borderColor: colors.accent1,
            backgroundColor: colors.surface 
          }]}
          placeholder="Введите ключ..."
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />
        
        <Button title="ДАЛЕЕ" onPress={checkPassword} style={{ width: 200, marginTop: 20 }} />
      </View>
    );
  }

  // ЭКРАН ЧАТА
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { 
        borderBottomColor: colors.borderSubtle,
        backgroundColor: colors.surface 
      }]}>
        <Text style={[styles.headerTitle, { color: colors.accent1 }]}>DEV SECRET CHAT</Text>
        <TouchableOpacity onPress={onExit}>
          <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>ВЫХОД</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        style={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={styles.messageRow}>
            <Text style={[styles.msgAuthor, { color: colors.textMuted }]}>
              {item.user_name} <Text style={{fontSize: 10}}>{new Date(item.created_at).toLocaleTimeString().slice(0,5)}</Text>
            </Text>
            <View style={[styles.msgBubble, { 
              backgroundColor: colors.surface, 
              borderColor: colors.borderSubtle 
            }]}>
              <Text style={{ color: colors.textMain }}>{item.content}</Text>
            </View>
          </View>
        )}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.inputContainer, { 
          borderTopColor: colors.borderSubtle, 
          backgroundColor: colors.background 
        }]}>
          <TextInput
            style={[styles.chatInput, { 
              color: colors.textMain, 
              backgroundColor: colors.surface,
              borderColor: colors.border 
            }]}
            placeholder="Сообщение..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, { backgroundColor: colors.accent1 }]}>
            <Text style={{ fontWeight: 'bold', fontSize: 20, color: colors.accentText }}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  riddleTitle: { 
    fontSize: 18, 
    fontWeight: '900', 
    textAlign: 'center', 
    marginBottom: 30, 
    letterSpacing: 2, 
    textTransform: 'uppercase',
    lineHeight: 28 
  },
  secretInput: { 
    width: '100%', 
    maxWidth: 400,
    height: 50, 
    borderWidth: 2, 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    fontSize: 16, 
    textAlign: 'center' 
  },
  closeBtn: { position: 'absolute', top: 50, right: 20, padding: 10 },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 50, 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1 
  },
  headerTitle: { fontWeight: 'bold', letterSpacing: 1, fontSize: 16 },
  list: { flex: 1, padding: 15 },
  messageRow: { marginBottom: 15 },
  msgAuthor: { 
    fontSize: 10, 
    marginBottom: 4, 
    marginLeft: 4, 
    textTransform: 'uppercase',
    fontWeight: 'bold' 
  },
  msgBubble: { 
    padding: 12, 
    borderRadius: 12, 
    borderWidth: 1, 
    alignSelf: 'flex-start', 
    maxWidth: '85%' 
  },
  
  inputContainer: { 
    flexDirection: 'row', 
    padding: 10, 
    borderTopWidth: 1 
  },
  chatInput: { 
    flex: 1, 
    height: 44, 
    borderRadius: 22, 
    paddingHorizontal: 15,
    borderWidth: 1 
  },
  sendBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 10 
  },
});

export default SecretChatScreen;
