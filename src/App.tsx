import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

// Layout with navigation
import Layout from './components/Layout'
import { BannerProvider } from './context/BannerContext'

// Pages
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Habits from './pages/Habits'
import Login from './pages/Login'

// Page placeholders (will be implemented in next days)
const Calendar = () => <div className="page-placeholder"><h1>Calendar (coming soon)</h1></div>
const Profile = () => <div className="page-placeholder"><h1>Profile (coming soon)</h1></div>
const SecretChat = () => <div className="page-placeholder"><h1>Secret Chat (coming soon)</h1></div>

// Auth pages
const Register = () => <div className="page-placeholder"><h1>Register (coming soon)</h1></div>

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Check token on mount
    const token = localStorage.getItem('app-auth-token')
    setIsAuthenticated(!!token)
  }, [])

  if (isAuthenticated === null) {
    return <div className="loading-screen">Loading...</div>
  }

  return (
    <BannerProvider>
      <Routes>
        {/* Public routes - accessible without auth */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/tasks" replace /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/tasks" replace /> : <Register />} 
        />

        {/* Protected routes with Layout */}
        <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/secret-chat" element={<SecretChat />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </BannerProvider>
  )
}

export default App
