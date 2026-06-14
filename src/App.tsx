import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { Login } from '@/components/Login'
import { Home } from '@/pages/Home'
import { NotebookView } from '@/pages/NotebookView'
import './ui.css'

function AuthedRoutes() {
  const { auth } = useAuth()
  if (!auth) return <Login />
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/notebook/:id" element={<NotebookView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AuthedRoutes />
      </HashRouter>
    </AuthProvider>
  )
}
