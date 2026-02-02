// ========================================
// ЗАГРУЗКА ШАПКИ header.html
// ========================================

document.addEventListener('DOMContentLoaded', async function() {
  try {
    // 1. Загружаем header.html
    const response = await fetch('header.html');
    if (!response.ok) throw new Error('Не удалось загрузить header.html');
    
    const headerHTML = await response.text();
    const placeholder = document.getElementById('header-placeholder');
    
    if (placeholder) {
      placeholder.innerHTML = headerHTML;
      
      // 2. ПОСЛЕ загрузки инициализируем кнопки
      initThemeToggle();
      initAuthButton();
      initDisabledLinks();
      highlightActivePage();
    }
  } catch (error) {
    console.error('Ошибка загрузки шапки:', error);
  }
});


// ========================================
// ИНИЦИАЛИЗАЦИЯ КНОПКИ СМЕНЫ ТЕМЫ
// ========================================

const THEMES_LIST = [
  'theme-storm',   // T1: Acid Storm
  'theme-ice',     // T2: Night Subway
  'theme-blood',   // T3: Riot Sunset
  'theme-toxic',   // T4: Toxic Terminal
  'theme-glitch'   // T5: Glitch Violet
];

let currentThemeIndex = 0;

function initThemeToggle() {
  // Загружаем сохраненную тему
  loadTheme();
  
  const themeBtn = document.getElementById('theme-toggle-btn');
  
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      const body = document.body;
      
      // Убираем старую тему
      THEMES_LIST.forEach(theme => body.classList.remove(theme));
      
      // Переключаем на следующую
      currentThemeIndex = (currentThemeIndex + 1) % THEMES_LIST.length;
      body.classList.add(THEMES_LIST[currentThemeIndex]);
      
      // Сохраняем
      try {
        localStorage.setItem('app-theme-index', currentThemeIndex);
      } catch (e) {
        console.error('Не удалось сохранить тему:', e);
      }
    });
  }
}

function loadTheme() {
  try {
    const savedIndex = localStorage.getItem('app-theme-index');
    if (savedIndex !== null) {
      currentThemeIndex = parseInt(savedIndex, 10);
      if (currentThemeIndex < 0 || currentThemeIndex >= THEMES_LIST.length) {
        currentThemeIndex = 0;
      }
      const body = document.body;
      THEMES_LIST.forEach(theme => body.classList.remove(theme));
      body.classList.add(THEMES_LIST[currentThemeIndex]);
    }
  } catch (e) {
    console.error('Ошибка загрузки темы:', e);
  }
}


// ========================================
// ИНИЦИАЛИЗАЦИЯ КНОПКИ АВТОРИЗАЦИИ
// ========================================

function initAuthButton() {
  const authBtn = document.getElementById('auth-toggle-btn');
  
  if (authBtn) {
    authBtn.addEventListener('click', function() {
      // Проверяем, существует ли функция openAuthModal в глобальной области
      if (typeof openAuthModal === 'function') {
        openAuthModal();
      } else {
        console.error('Функция openAuthModal не найдена!');
      }
    });
  }
}


// ========================================
// ИНИЦИАЛИЗАЦИЯ ЗАГЛУШЕК (КАЛЕНДАРЬ, ЗАМЕТКИ)
// ========================================

function initDisabledLinks() {
  const calendarLink = document.getElementById('menu-calendar');
  const notesLink = document.getElementById('menu-notes');
  
  if (calendarLink) {
    calendarLink.addEventListener('click', function(e) {
      e.preventDefault();
      showNotificationBanner('Раздел "Календарь" находится в разработке 🚧');
    });
  }
  
  if (notesLink) {
    notesLink.addEventListener('click', function(e) {
      e.preventDefault();
      showNotificationBanner('Раздел "Заметки" находится в разработке 🚧');
    });
  }
}

// Функция уведомлений (всплывающий баннер)
function showNotificationBanner(message) {
  // Удаляем старое уведомление, если есть
  const oldNotif = document.querySelector('.dev-notification');
  if (oldNotif) oldNotif.remove();
  
  const notification = document.createElement('div');
  notification.className = 'dev-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 10000;
    font-size: 15px;
    font-weight: 600;
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}


// ========================================
// ПОДСВЕТКА АКТИВНОЙ СТРАНИЦЫ
// ========================================

function highlightActivePage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Убираем активность со всех
  document.querySelectorAll('.top-menu__item').forEach(item => {
    item.classList.remove('top-menu__item--active');
  });
  
  // Подсвечиваем текущую
  if (currentPage.includes('index.html') || currentPage === '' || currentPage === '/') {
    document.getElementById('menu-habits')?.classList.add('top-menu__item--active');
  } else if (currentPage.includes('Zadachi.html')) {
    document.getElementById('menu-tasks')?.classList.add('top-menu__item--active');
  }
}

