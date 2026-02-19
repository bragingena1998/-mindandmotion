import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Modal as RNModal, ScrollView, Alert, AppState } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RANKS = [
  "Семечка Сомнения", "1й градус ростка подозрения", "2й градус первого салата", 
  "3й градус огуречной расфокусировки", "4й градус свекольного созерцания", 
  "5й градус картофельного тихого влияния", "6й градус лукового забвения", 
  "7й градус чесночного проникновения", "8й градус медленного глубокого внедрения"
];

const SecretChatScreen = ({ onExit }) => {
  const { colors } = useTheme();
  
  // Auth & Settings
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [settings, setSettings] = useState({ login_title: 'Загрузка...', sacred_text: '' });
  
  // Chat Data
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // UI States
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showPunishModal, setShowPunishModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [isAuthorMode, setIsAuthorMode] = useState(false);
  const [usersList, setUsersList] = useState([]);
  
  // Admin Inputs
  const [newSettingValue, setNewSettingValue] = useState('');
  
  // Auto-Logout Logic
  const lastActiveTime = useRef(Date.now());
  const flatListRef = useRef();

  // 1. ПРОВЕРКА АВТОРИЗАЦИИ И АВТО-ВЫХОД
  useEffect(() => {
    checkLoginStatus();

    const checkInterval = setInterval(() => {
      const diff = Date.now() - lastActiveTime.current;
      if (isAuthenticated && diff > 20 * 60 * 1000) { // 20 минут
        handleLogout("Вы слишком долго спали на грядке. Вход закрыт.");
      }
    }, 60000);

    return () => clearInterval(checkInterval);
  }, [isAuthenticated]);

  const updateActivity = () => { lastActiveTime.current = Date.now(); };

  const checkLoginStatus = async () => {
    try {
      const res = await api.get('/user/profile');
      setCurrentUserId(res.data.id);
      if (res.data.id === 4) setIsAdmin(true);

      // Проверяем, сохранен ли пароль
      const savedPassword = await AsyncStorage.getItem('secret_chat_password');
      if (savedPassword) {
         setIsAuthenticated(true);
         loadMessages(savedPassword); // Грузим и проверяем валидность
      } else {
         // Грузим настройки для заголовка
         loadMessages(null); 
      }
    } catch (e) { console.error(e); }
  };

  const handleLogout = async (reason) => {
    await AsyncStorage.removeItem('secret_chat_password');
    setIsAuthenticated(false);
    if (reason) Alert.alert("Изгнание", reason);
  };

  // 2. ЗАГРУЗКА И ПРОВЕРКА ВАЛИДНОСТИ ПАРОЛЯ
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => loadMessages(), 3000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const loadMessages = async (forcePasswordCheck = null) => {
    try {
      const res = await api.get('/secret-chat'); 
      const serverSettings = res.data.settings || {};
      const serverPassword = serverSettings.chat_password || 'семечка сомнения';

      // Если мы авторизованы, проверяем: не сменился ли пароль?
      if (isAuthenticated || forcePasswordCheck) {
        const myPassword = forcePasswordCheck || await AsyncStorage.getItem('secret_chat_password');
        
        // ЕСЛИ ПАРОЛИ НЕ СОВПАДАЮТ - ВЫКИДЫВАЕМ
        if (myPassword && myPassword.toLowerCase().trim() !== serverPassword.toLowerCase().trim()) {
           handleLogout("Пароль чата был изменен. Введите новый.");
           return;
        }
      }

      if (res.data.messages) {
        setMessages(res.data.messages);
        setSettings(serverSettings);
      }
    } catch (err) { console.error(err); }
  };

  const handleLogin = async () => {
    try {
      // Сначала проверяем через сервер
      await api.post('/secret-chat/login', { userId: currentUserId, password: passwordInput });
      
      // Если ок - сохраняем САМ ПАРОЛЬ
      setIsAuthenticated(true);
      AsyncStorage.setItem('secret_chat_password', passwordInput);
      updateActivity();
    } catch (err) { Alert.alert('Ошибка', 'Пароль не тот. Овощи недовольны.'); }
  };

  const sendMessage = async () => {
    updateActivity();
    if (!text.trim()) return;
    try {
      await api.post('/secret-chat', { text, isAuthorMode, userId: currentUserId });
      setText('');
      loadMessages();
      if (isAuthorMode) setIsAuthorMode(false);
    } catch (err) { Alert.alert('Ошибка', err.response?.data?.error || 'Сбой отправки'); }
  };

  // --- ПОМИДОРЫ ---
  const handleDoubleTap = async (messageId) => {
    updateActivity();
    try {
      await api.post('/secret-chat/tomato', { messageId, userId: currentUserId });
      loadMessages(); 
    } catch (e) {}
  };

  // --- НАКАЗАНИЯ ---
  const onMessageLongPress = (item) => {
    updateActivity();
    if (!isAdmin) return;
    if (item.userId === 4 || item.userId === 999) return;
    setTargetUser({ id: item.userId, name: item.userName });
    setShowPunishModal(true);
  };

  const punishUser = async (type, payload = {}) => {
    try {
      await api.post('/secret-chat/punish', {
        targetId: targetUser.id,
        targetName: targetUser.name,
        type,
        ...payload
      });
      setShowPunishModal(false);
      setTargetUser(null);
      loadMessages();
    } catch (e) { Alert.alert('Ошибка'); }
  };

  // --- АДМИНКА ---
  const saveSetting = async (key, value) => {
    if (!value || !value.trim()) return;
    try {
      await api.put('/secret-chat/settings', { key, value: value });
      Alert.alert('Успех', 'Настройка обновлена');
      setNewSettingValue('');
      loadMessages();
    } catch (e) { Alert.alert('Ошибка'); }
  };

  const loadUsers = async () => {
    try { const res = await api.get('/secret-chat/users'); setUsersList(res.data); } catch (e) {}
  };

  const changeRank = async (userId, newRank) => {
    try { await api.put('/secret-chat/rank', { userId, newRank }); loadUsers(); } catch (e) {}
  };

  const clearChat = async () => {
    try { await api.post('/secret-chat/clear'); loadMessages(); setShowAdminPanel(false); } catch (e) {}
  };

  // --- РЕНДЕР ---
  const renderMessage = ({ item }) => {
    const isRotten = item.tomatoCount >= 5;
    
    if (isRotten) {
      return (
        <View style={{ alignSelf: 'center', marginVertical: 4, opacity: 0.5 }}>
          <Text style={{ fontSize: 10, color: '#555' }}>💩 Сообщение сгнило в компосте ({item.tomatoCount} 🍅)</Text>
        </View>
      );
    }

    if (item.isAuthor || item.userId === 999) {
      return (
        <View style={{ alignItems: 'center', marginVertical: 12, paddingHorizontal: 20 }}>
          <Text style={{ color: colors.accent1, fontStyle: 'italic', fontSize: 16, textAlign: 'center', fontWeight: 'bold' }}>
            {item.text}
          </Text>
        </View>
      );
    }

    const isMe = item.userId === currentUserId;
    let lastTap = 0;
    const handlePress = () => {
       const now = Date.now();
       if (now - lastTap < 300) {
          handleDoubleTap(item.id);
       }
       lastTap = now;
    };

    return (
      <TouchableOpacity 
        onLongPress={() => onMessageLongPress(item)}
        onPress={handlePress}
        activeOpacity={0.9}
        style={{ width: '100%' }}
      >
        <View style={{ 
          alignSelf: isMe ? 'flex-end' : 'flex-start',
          backgroundColor: isMe ? '#222' : '#111', 
          borderRadius: 8,
          padding: 10,
          marginBottom: 8,
          maxWidth: '85%',
          borderWidth: 1,
          borderColor: isMe ? colors.accent1 : '#333',
          position: 'relative'
        }}>
          {!isMe && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <Text style={{ color: colors.accent1, fontWeight: 'bold', fontSize: 12 }}>{item.userName}</Text>
              <Text style={{ color: '#666', fontSize: 10, marginLeft: 6, fontStyle: 'italic' }}>[{item.userRank}]</Text>
            </View>
          )}

          <Text style={{ color: '#fff', fontSize: 14 }}>{item.text}</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
            {item.tomatoCount > 0 && (
              <Text style={{ fontSize: 10, marginRight: 6 }}>🍅 {item.tomatoCount}</Text>
            )}
            <Text style={{ color: '#444', fontSize: 9 }}>
              {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ЭКРАН ВХОДА
  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 }} onTouchStart={updateActivity}>
        <TouchableOpacity onPress={onExit} style={{ position: 'absolute', top: 50, left: 20 }}><Text style={{ color: '#666' }}>← Назад</Text></TouchableOpacity>
        <Text style={{ color: colors.accent1, fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>ТАЙНЫЙ ЧАТ</Text>
        <Text style={{ color: '#fff', marginBottom: 20, textAlign: 'center', paddingHorizontal: 20, fontStyle: 'italic' }}>
           {settings.login_title && settings.login_title !== 'Загрузка...' ? settings.login_title : "Первая ступень развития..."}
        </Text>
        
        <TextInput
          style={{ width: '100%', backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 20, textAlign: 'center' }}
          placeholder="Пароль..." placeholderTextColor="#666" value={passwordInput} onChangeText={setPasswordInput} autoCapitalize="none" secureTextEntry
        />
        <TouchableOpacity onPress={handleLogin} style={{ backgroundColor: colors.accent1, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 25 }}>
          <Text style={{ fontWeight: 'bold' }}>ВОЙТИ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ЧАТ
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : undefined} 
      style={{ flex: 1, backgroundColor: '#000' }} 
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      onTouchStart={updateActivity}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#333' }}>
        <TouchableOpacity onPress={onExit}><Text style={{ color: '#666' }}>← Выход</Text></TouchableOpacity>
        <Text style={{ color: colors.accent1, fontWeight: 'bold' }}>КУЛЬТ ОВОЩЕЙ</Text>
        {isAdmin ? (
          <TouchableOpacity onPress={() => { setShowAdminPanel(true); loadUsers(); }}><Text style={{ fontSize: 20 }}>⚙️</Text></TouchableOpacity>
        ) : <View style={{width: 20}} />}
      </View>

      {settings.sacred_text ? (
        <View style={{ backgroundColor: '#110505', padding: 8 }}>
          <Text style={{ color: 'red', textAlign: 'center', fontStyle: 'italic', fontSize: 12 }}>
            📢 {settings.sacred_text}
          </Text>
        </View>
      ) : null}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={{ padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12, borderTopWidth: 1, borderColor: '#333', backgroundColor: '#050505' }}>
        {isAdmin && (
          <TouchableOpacity onPress={() => setIsAuthorMode(!isAuthorMode)} style={{ marginBottom: 8 }}>
            <Text style={{ color: isAuthorMode ? colors.accent1 : '#444', fontSize: 12 }}>
              {isAuthorMode ? '◉ РЕЖИМ АВТОРА' : '○ Включить режим Автора'}
            </Text>
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={{ flex: 1, color: '#fff', backgroundColor: '#222', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, height: 44 }}
            placeholder={isAuthorMode ? "Вещай..." : "Сообщение (/roll для рулетки)..."}
            placeholderTextColor="#666"
            value={text}
            onChangeText={setText}
            multiline={false}
          />
          <TouchableOpacity onPress={sendMessage} style={{ marginLeft: 10, backgroundColor: colors.accent1, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
             <Feather name="send" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <RNModal visible={showAdminPanel} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingTop: 50 }}>
          <View style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontSize: 20 }}>АДМИНКА</Text>
            <TouchableOpacity onPress={() => setShowAdminPanel(false)}><Text style={{ color: 'red', fontSize: 20 }}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            {/* 1. ЗАГОЛОВОК ВХОДА */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#aaa', marginBottom: 5 }}>Заголовок входа:</Text>
              <View style={{flexDirection: 'row'}}>
                 <TextInput style={{ flex:1, backgroundColor: '#222', color: '#fff', padding: 8 }} placeholder={settings.login_title} onChangeText={setNewSettingValue} />
                 <TouchableOpacity onPress={() => saveSetting('login_title', newSettingValue)} style={{ backgroundColor: colors.accent1, padding: 8, alignItems: 'center', justifyContent:'center' }}><Text>OK</Text></TouchableOpacity>
              </View>
            </View>

            {/* 2. ПИСАНИЕ */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#aaa', marginBottom: 5 }}>Священное писание:</Text>
              <View style={{flexDirection: 'row'}}>
                 <TextInput style={{ flex:1, backgroundColor: '#222', color: '#fff', padding: 8 }} placeholder={settings.sacred_text} onChangeText={setNewSettingValue} />
                 <TouchableOpacity onPress={() => saveSetting('sacred_text', newSettingValue)} style={{ backgroundColor: colors.accent1, padding: 8, alignItems: 'center', justifyContent:'center' }}><Text>OK</Text></TouchableOpacity>
              </View>
            </View>

            {/* 3. ПАРОЛЬ */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#aaa', marginBottom: 5 }}>Пароль чата:</Text>
              <View style={{flexDirection: 'row'}}>
                 <TextInput style={{ flex:1, backgroundColor: '#222', color: '#fff', padding: 8 }} placeholder="Новый пароль" onChangeText={setNewSettingValue} />
                 <TouchableOpacity onPress={() => saveSetting('chat_password', newSettingValue)} style={{ backgroundColor: colors.accent1, padding: 8, alignItems: 'center', justifyContent:'center' }}><Text>OK</Text></TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={clearChat} style={{ backgroundColor: 'red', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>🗑 ОЧИСТИТЬ ЧАТ</Text>
            </TouchableOpacity>

            <Text style={{ color: colors.accent1, fontSize: 18, marginBottom: 10 }}>Участники:</Text>
            {usersList.map(user => (
              <View key={user.id} style={{ marginBottom: 20, borderBottomWidth: 1, borderColor: '#333', paddingBottom: 10 }}>
                <Text style={{ color: '#fff', fontSize: 16 }}>
                   {user.name} {user.gmo_infected ? '🦠(ГМО)' : ''} 
                   <Text style={{ fontSize: 10, color: '#666' }}>({user.rank})</Text>
                </Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 5 }}>
                  {RANKS.map(rank => (
                    <TouchableOpacity key={rank} onPress={() => changeRank(user.id, rank)} style={{ backgroundColor: '#222', padding: 6, borderRadius: 4, marginRight: 6 }}>
                      <Text style={{ color: '#888', fontSize: 10 }}>{rank}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        </View>
      </RNModal>

      <RNModal visible={showPunishModal} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '80%', backgroundColor: '#111', padding: 20, borderRadius: 10, borderWidth: 1, borderColor: 'red' }}>
            <Text style={{ color: '#fff', fontSize: 18, marginBottom: 10, textAlign: 'center' }}>
              НАКАЗАТЬ: {targetUser?.name}
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => punishUser('gmo')} style={{ flex: 1, backgroundColor: 'purple', padding: 10, marginRight: 5, alignItems: 'center' }}>
                <Text style={{ color: '#fff' }}>🦠 ЗАРАЗИТЬ ГМО</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => punishUser('cure')} style={{ flex: 1, backgroundColor: 'green', padding: 10, marginLeft: 5, alignItems: 'center' }}>
                <Text style={{ color: '#fff' }}>💊 ВЫЛЕЧИТЬ</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#666', marginBottom: 5 }}>Молчанка (минут):</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
               {[1, 5, 15, 60].map(m => (
                 <TouchableOpacity key={m} onPress={() => punishUser('mute', { duration: m })} style={{ backgroundColor: '#333', padding: 10, borderRadius: 5 }}>
                   <Text style={{ color: '#fff' }}>{m}м</Text>
                 </TouchableOpacity>
               ))}
            </View>

            <Text style={{ color: '#666', marginBottom: 5 }}>Шутки:</Text>
            <ScrollView style={{ maxHeight: 150 }}>
            {["5 шлепков по попе", "Лишение майонеза", "Удар лопатой", "Ссылка в Сибирь", "Заставить есть сырой лук"].map(p => (
              <TouchableOpacity key={p} onPress={() => punishUser('shame', { reason: p })} style={{ padding: 10, borderBottomWidth: 1, borderColor: '#333' }}>
                <Text style={{ color: 'red' }}>🍆 {p}</Text>
              </TouchableOpacity>
            ))}
            </ScrollView>
            
            <TouchableOpacity onPress={() => setShowPunishModal(false)} style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ color: '#666' }}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RNModal>
    </KeyboardAvoidingView>
  );
};

export default SecretChatScreen;
