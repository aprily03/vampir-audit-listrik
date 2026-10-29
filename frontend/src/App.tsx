import { type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { AuthProvider, roleHome, useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import { ToastProvider } from './components/ToastProvider'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AuditPage from './pages/AuditPage'
import PanelsPage from './pages/PanelsPage'
import ExecutivePage from './pages/ExecutivePage'
import SpecsPage from './pages/SpecsPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import type { Role } from './types'

function Splash() {
  return (
    <div className="splash">
      <div className="splash-mark">
        <LoaderCircle className="spin" size={26} />
      </div>
      <span>Menyiapkan ruang kerja Vampir…</span>
    </div>
  )
}

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return <Layout />
}

function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return null
  if (!roles.includes(user.role)) return <Navigate to={roleHome[user.role]} replace />
  return <>{children}</>
}

function LoginRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (user) return <Navigate to={roleHome[user.role]} replace />
  return <LoginPage />
}

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={roleHome[user.role]} replace />
}

function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found-code">404</div>
      <h1>Halaman tidak ditemukan</h1>
      <p>Tautan yang Anda buka tidak tersedia pada sistem ini.</p>
      <a className="btn btn-primary" href="/">
        Kembali ke beranda
      </a>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<ProtectedLayout />}>
              <Route index element={<HomeRedirect />} />
              <Route
                path="dashboard"
                element={
                  <RoleGate roles={['ADMIN']}>
                    <DashboardPage />
                  </RoleGate>
                }
              />
              <Route
                path="audit"
                element={
                  <RoleGate roles={['ADMIN', 'AUDITOR']}>
                    <AuditPage />
                  </RoleGate>
                }
              />
              <Route
                path="panels"
                element={
                  <RoleGate roles={['ADMIN', 'MAINTENANCE']}>
                    <PanelsPage />
                  </RoleGate>
                }
              />
              <Route
                path="executive"
                element={
                  <RoleGate roles={['ADMIN', 'PIMPINAN']}>
                    <ExecutivePage />
                  </RoleGate>
                }
              />
              <Route
                path="specs"
                element={
                  <RoleGate roles={['ADMIN']}>
                    <SpecsPage />
                  </RoleGate>
                }
              />
              <Route
                path="users"
                element={
                  <RoleGate roles={['ADMIN']}>
                    <UsersPage />
                  </RoleGate>
                }
              />
              <Route
                path="settings"
                element={
                  <RoleGate roles={['ADMIN']}>
                    <SettingsPage />
                  </RoleGate>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
