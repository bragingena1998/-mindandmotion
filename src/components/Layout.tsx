import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  CheckSquare, 
  Zap, 
  Calendar, 
  User, 
  LogOut,
  Menu,
  X
} from 'lucide-react'

export default function Layout() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Дашборд' },
    { path: '/tasks', icon: CheckSquare, label: 'Задачи' },
    { path: '/habits', icon: Zap, label: 'Привычки' },
    { path: '/calendar', icon: Calendar, label: 'Календарь' },
    { path: '/profile', icon: User, label: 'Профиль' },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const handleLogout = () => {
    localStorage.removeItem('app-auth-token')
    window.location.href = '/login'
  }

  return (
    <div className="app-root">
      <div className="app-shell">
        {/* Desktop Sidebar / Mobile Header */}
        {isMobile ? (
          // Mobile: Top header with hamburger
          <header className="mobile-header">
            <div className="mobile-header__top">
              <h1 className="mobile-header__logo">Mind&Motion</h1>
              <button 
                className="mobile-header__menu-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
            
            {/* Mobile menu overlay */}
            {isMobileMenuOpen && (
              <nav className="mobile-nav">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`mobile-nav__item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                ))}
                <button className="mobile-nav__logout" onClick={handleLogout}>
                  <LogOut size={20} />
                  <span>Выйти</span>
                </button>
              </nav>
            )}
          </header>
        ) : (
          // Desktop: Sidebar
          <aside className="desktop-sidebar">
            <div className="desktop-sidebar__logo">Mind&Motion</div>
            <nav className="desktop-sidebar__nav">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`desktop-sidebar__item ${isActive(item.path) ? 'active' : ''}`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <button className="desktop-sidebar__logout" onClick={handleLogout}>
              <LogOut size={20} />
              <span>Выйти</span>
            </button>
          </aside>
        )}

        {/* Main content */}
        <main className={`main-content ${isMobile ? 'main-content--mobile' : ''}`}>
          <Outlet />
        </main>

        {/* Mobile bottom nav (alternative to hamburger) */}
        {isMobile && !isMobileMenuOpen && (
          <nav className="mobile-bottom-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-bottom-nav__item ${isActive(item.path) ? 'active' : ''}`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
