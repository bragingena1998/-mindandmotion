// ════════════════════════════════════════════════════════════════════════════
// 🔐 ГЛОБАЛЬНАЯ АВТОРИЗАЦИЯ ДЛЯ ВСЕХ СТРАНИЦ (auth.js)
// ════════════════════════════════════════════════════════════════════════════

const API_URL = 'http://mindandmotion.ru:5000';

let authModalElement = null;
let authModal = null;
let isAuthInitialized = false;

// ════════════════════════════════════════════════════════════════════════════
// ✅ ИНИЦИАЛИЗАЦИЯ DOM С ПРОВЕРКОЙ header.html
// ════════════════════════════════════════════════════════════════════════════

async function initAuthDOM() {
  // Проверяем наличие элементов
  const requiredElements = [
    'auth-toggle-btn',
    'auth-modal',
    'auth-form-login',
    'auth-form-register',
    'auth-form-forgot',
    'switch-to-register',
    'switch-to-login',
    'switch-to-forgot',
    'back-to-login',
    'verify-code-form'
  ];

  // Если элементы еще не загружены, ждем
  let retries = 0;
  while (retries < 50) {
    const allFound = requiredElements.every(id => document.getElementById(id));
    if (allFound) break;
    await new Promise(r => setTimeout(r, 100));
    retries++;
  }

  // Проверяем результат
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  if (!authToggleBtn) {
    console.error('❌ Auth modal elements not found. Make sure header.html is loaded.');
    return false;
  }

  authModalElement = document.getElementById('auth-modal');
  authModal = authModalElement;

  if (!authModal) {
    console.error('❌ Auth modal not found in DOM');
    return false;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ОСНОВНЫЕ ФОРМЫ
  // ════════════════════════════════════════════════════════════════════════════

  const loginForm = document.getElementById('auth-form-login');
  const registerForm = document.getElementById('auth-form-register');
  const forgotForm = document.getElementById('auth-form-forgot');
  const verifyForm = document.getElementById('verify-code-form');

  const switchToRegister = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');
  const switchToForgot = document.getElementById('switch-to-forgot');
  const backToLogin = document.getElementById('back-to-login');

  // ════════════════════════════════════════════════════════════════════════════
  // ОБРАБОТЧИК: ВСЕ КНОПКИ ДЛЯ СМЕНЫ ФОРМЫ
  // ════════════════════════════════════════════════════════════════════════════

  if (switchToRegister) {
    switchToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'block';
      if (verifyForm) verifyForm.style.display = 'none';
      if (forgotForm) forgotForm.style.display = 'none';
    });
  }

  if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
      if (verifyForm) verifyForm.style.display = 'none';
      if (forgotForm) forgotForm.style.display = 'none';
    });
  }

  if (switchToForgot) {
    switchToForgot.addEventListener('click', (e) => {
      e.preventDefault();
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'none';
      if (verifyForm) verifyForm.style.display = 'none';
      if (forgotForm) forgotForm.style.display = 'block';
    });
  }

  if (backToLogin) {
    backToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
      if (verifyForm) verifyForm.style.display = 'none';
      if (forgotForm) forgotForm.style.display = 'none';
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ОБРАБОТЧИК: ВХОД
  // ════════════════════════════════════════════════════════════════════════════

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email')?.value.trim();
      const password = document.getElementById('login-password')?.value;

      if (!email || !password) {
        showAuthNotification('Пожалуйста, заполните все поля', 'error');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.token) {
          localStorage.setItem('app-auth-token', data.token);
          localStorage.setItem('app-user-email', email);
          showAuthNotification('✅ Вход выполнен', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          showAuthNotification(data.message || 'Неверные учетные данные', 'error');
        }
      } catch (error) {
        console.error('❌ Login error:', error);
        showAuthNotification('Ошибка сервера', 'error');
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ОБРАБОТЧИК: РЕГИСТРАЦИЯ (шаг 1: получение кода)
  // ════════════════════════════════════════════════════════════════════════════

  if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const signupName = document.getElementById('register-name')?.value.trim();
    const signupEmail = document.getElementById('register-email')?.value.trim();
    const signupBirthdate = document.getElementById('register-birthdate')?.value;
    const signupPassword = document.getElementById('register-password')?.value;
    const signupConfirmPassword = document.getElementById('register-confirm-password')?.value;

    // Дата рождения необязательна, остальные поля обязательны
    if (!signupName || !signupEmail || !signupPassword || !signupConfirmPassword) {
      showAuthNotification('Пожалуйста, заполните все поля', 'error');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      showAuthNotification('Пароли не совпадают', 'error');
      return;
    }

    if (signupPassword.length < 6) {
      showAuthNotification('Пароль должен быть минимум 6 символов', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/send-verification-code`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: signupEmail,
    name: signupName,
    birthdate: signupBirthdate || null,
    password: signupPassword
  })
});


      const data = await response.json();

      if (response.ok) {
        showAuthNotification('✅ Код отправлен на email', 'success');
        window.verificationData = { 
  email: signupEmail, 
  name: signupName, 
  birthdate: signupBirthdate,  // ✅ Маленькая d
  password: signupPassword 
};
        registerForm.style.display = 'none';
        verifyForm.style.display = 'block';
      } else {
        showAuthNotification(data.message || 'Ошибка при отправке кода', 'error');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      showAuthNotification('Ошибка сервера', 'error');
    }
  });
}

  // ════════════════════════════════════════════════════════════════════════════
  // ОБРАБОТЧИК: ПОДТВЕРЖДЕНИЕ КОДА
  // ════════════════════════════════════════════════════════════════════════════

  if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const verificationCode = document.getElementById('verification-code')?.value.trim();

      if (!verificationCode) {
        showAuthNotification('Пожалуйста, введите код', 'error');
        return;
      }

      if (!window.verificationData) {
        showAuthNotification('Ошибка: данные регистрации потеряны', 'error');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
  email: window.verificationData.email,
  code: verificationCode,
  name: window.verificationData.name,
  birthdate: window.verificationData.birthdate,  // ✅ Ключ birthdate (маленькая d)
  password: window.verificationData.password
})

        });

        const data = await response.json();

        if (response.ok && data.token) {
          localStorage.setItem('app-auth-token', data.token);
          localStorage.setItem('app-user-email', window.verificationData.email);
          showAuthNotification('✅ Регистрация завершена!', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          showAuthNotification(data.message || 'Неверный код', 'error');
        }
      } catch (error) {
        console.error('❌ Verification error:', error);
        showAuthNotification('Ошибка сервера', 'error');
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ОБРАБОТЧИК: ВОССТАНОВЛЕНИЕ ПАРОЛЯ (шаг 1)
  // ════════════════════════════════════════════════════════════════════════════

  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('forgot-email')?.value.trim();

      if (!email) {
        showAuthNotification('Пожалуйста, введите email', 'error');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
          showAuthNotification('✅ Код отправлен на email', 'success');
          window.resetData = { email };
          forgotForm.style.display = 'none';
          // Показываем форму для ввода пароля
          const resetPasswordForm = document.getElementById('reset-password-form');
          if (resetPasswordForm) {
            resetPasswordForm.style.display = 'block';
          }
        } else {
          showAuthNotification(data.message || 'Email не найден', 'error');
        }
      } catch (error) {
        console.error('❌ Forgot password error:', error);
        showAuthNotification('Ошибка сервера', 'error');
      }
    });
  }

 // ════════════════════════════════════════════════════════════════════════════
// ОБРАБОТЧИК: СБРОС ПАРОЛЯ (шаг 2)
// ════════════════════════════════════════════════════════════════════════════

const resetPasswordForm = document.getElementById('reset-password-form');
if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const code = document.getElementById('reset-code')?.value.trim();
    const newPassword = document.getElementById('reset-new-password')?.value;
    const confirmPassword = document.getElementById('reset-confirm-password')?.value;

    if (!code || !newPassword || !confirmPassword) {
      showAuthNotification('Пожалуйста, заполните все поля', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAuthNotification('Пароли не совпадают', 'error');
      return;
    }

    if (!window.resetData || !window.resetData.email) {
      showAuthNotification('Ошибка: email потерян', 'error');
      return;
    }

    const requestData = {
      email: window.resetData.email,
      code: code,
      new_password: newPassword  // ✅ ПРАВИЛЬНО
    };

    console.log('📤 ОТПРАВЛЯЕМ:', requestData);

    try {
      const response = await fetch(`${API_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📥 ОТВЕТ СЕРВЕРА:', data);

      if (response.ok) {
        showAuthNotification('✅ Пароль сброшен! Войдите с новым паролем', 'success');
        setTimeout(() => {
          resetPasswordForm.style.display = 'none';
          const loginForm = document.getElementById('auth-form-login');
          if (loginForm) loginForm.style.display = 'block';
        }, 500);
      } else {
        showAuthNotification(data.message || data.error || 'Ошибка сброса пароля', 'error');
      }
    } catch (error) {
      console.error('❌ Reset password error:', error);
      showAuthNotification('Ошибка сервера', 'error');
    }
  });
}



  // ════════════════════════════════════════════════════════════════════════════
  // ОБРАБОТЧИК: НАЖАТИЕ КНОПКИ АВТОРИЗАЦИИ В ШАПКЕ
  // ════════════════════════════════════════════════════════════════════════════

  authToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ОБРАБОТЧИК: ЗАКРЫТИЕ МОДАЛКИ
  // ════════════════════════════════════════════════════════════════════════════

  const authClose = document.getElementById('auth-close-btn');
  if (authClose) {
    authClose.addEventListener('click', closeAuthModal);
  }

  const authLogoutBtn = document.getElementById('auth-logout-btn');
  if (authLogoutBtn) {
    authLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('app-auth-token');
      localStorage.removeItem('app-user-email');
      window.location.reload();
    });
  }

  // Закрытие при клике на фон
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        closeAuthModal();
      }
    });
  }

  isAuthInitialized = true;
  console.log('✅ Auth initialized successfully');
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// 🎯 ОТКРЫТЬ МОДАЛКУ АВТОРИЗАЦИИ
// ════════════════════════════════════════════════════════════════════════════

function openAuthModal() {
  if (!isAuthInitialized) {
    console.error('❌ Auth modal not initialized');
    return;
  }

  const modal = document.getElementById('auth-modal');
  if (!modal) {
    console.error('❌ Auth modal not found');
    return;
  }

  modal.classList.add('active');

  const loginForm        = document.getElementById('auth-form-login');
  const registerForm     = document.getElementById('auth-form-register');
  const forgotForm       = document.getElementById('auth-form-forgot');
  const verifyForm       = document.getElementById('verify-code-form');
  const resetPasswordForm= document.getElementById('reset-password-form');
  const logoutPanel      = document.getElementById('auth-logout-panel');
  const userEmailDisplay = document.getElementById('user-email-display');

  const allBlocks = [
    loginForm,
    registerForm,
    forgotForm,
    verifyForm,
    resetPasswordForm,
    logoutPanel
  ];

  // Скрываем всё
  allBlocks.forEach(f => {
    if (!f) return;
    f.classList.remove('active');
    f.style.display = 'none';
  });

  const token = localStorage.getItem('app-auth-token');
  const email = localStorage.getItem('app-user-email');

  if (token && email && logoutPanel && userEmailDisplay) {
    // Уже авторизован → показываем панель аккаунта
    userEmailDisplay.textContent = email;
    logoutPanel.classList.add('active');
    logoutPanel.style.display = 'block';
  } else {
    // Не авторизован → показываем форму входа
    if (loginForm) {
      loginForm.classList.add('active');
      loginForm.style.display = 'block';
    }
  }
}



// ════════════════════════════════════════════════════════════════════════════
// 🎯 ЗАКРЫТЬ МОДАЛКУ АВТОРИЗАЦИИ
// ════════════════════════════════════════════════════════════════════════════

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 📢 УВЕДОМЛЕНИЕ
// ════════════════════════════════════════════════════════════════════════════

function showAuthNotification(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${type === 'success' ? '#4caf50' : '#f44336'};
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
    font-weight: 600;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ════════════════════════════════════════════════════════════════════════════
// 🚀 ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ════════════════════════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthDOM);
} else {
  initAuthDOM();
}

// Сделать функцию доступной глобально
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;

// ════════════════════════════════════════════════════════════════════════════
// 🌐 ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ СОВМЕСТИМОСТИ СО СТАРЫМ КОДОМ
// ════════════════════════════════════════════════════════════════════════════

// Глобальная функция проверки авторизации
window.isLoggedIn = function() {
  return !!localStorage.getItem('app-auth-token');
};

// Глобальный объект currentUser
Object.defineProperty(window, 'currentUser', {
  get: function() {
    const token = localStorage.getItem('app-auth-token');
    const email = localStorage.getItem('app-user-email');
    if (!token) return null;
    return {
      token: token,
      email: email
    };
  }
});

// API_URL уже объявлен выше, но сделаем его глобальным
window.API_URL = API_URL;

console.log('✅ Global auth functions initialized');

async function changePassword() {
  const currentPasswordInput = document.getElementById('currentPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const changePasswordBtn = document.getElementById('changePasswordBtn');

  // ✅ ВАЛИДАЦИЯ
  const currentPassword = currentPasswordInput?.value.trim() || '';
  const newPassword = newPasswordInput?.value.trim() || '';
  const confirmPassword = confirmPasswordInput?.value.trim() || '';

  if (!currentPassword) {
    alert('❌ Введите текущий пароль');
    return;
  }
  
  if (!newPassword) {
    alert('❌ Введите новый пароль');
    return;
  }
  
  if (!confirmPassword) {
    alert('❌ Подтвердите новый пароль');
    return;
  }

  if (newPassword.length < 6) {
    alert('❌ Пароль должен быть минимум 6 символов');
    return;
  }

  if (newPassword !== confirmPassword) {
    alert('❌ Пароли не совпадают');
    return;
  }

  if (currentPassword === newPassword) {
    alert('❌ Новый пароль должен отличаться от текущего');
    return;
  }

  const token = localStorage.getItem('app-auth-token');
  if (!token) {
    alert('Ошибка: нет токена авторизации');
    return;
  }

  // ✅ Loading состояние
  if (changePasswordBtn) {
    changePasswordBtn.disabled = true;
    changePasswordBtn.textContent = 'Загрузка...';
  }

  try {
    const response = await fetch('http://mindandmotion.ru:5000/api/user/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });

    if (response.ok) {
      alert('✅ Пароль успешно изменён');
      if (currentPasswordInput) currentPasswordInput.value = '';
      if (newPasswordInput) newPasswordInput.value = '';
      if (confirmPasswordInput) confirmPasswordInput.value = '';
    } else {
      const error = await response.json();
      alert(`❌ ${error.error || 'Ошибка сервера'}`);
    }
  } catch (err) {
    console.error('Ошибка при смене пароля:', err);
    alert('❌ Ошибка сети');
  } finally {
    if (changePasswordBtn) {
      changePasswordBtn.disabled = false;
      changePasswordBtn.textContent = 'Сменить пароль';
    }
  }
}

