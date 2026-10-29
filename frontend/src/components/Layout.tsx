import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Settings,
  ShieldCheck,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { roleLabels, useAuth } from '../auth/AuthContext'
import { initials } from '../lib/format'
import type { Role } from '../types'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
}

const mainNav: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: '/dashboard', label: 'Ringkasan lab', icon: LayoutDashboard },
    { to: '/audit', label: 'Audit perangkat', icon: ClipboardList },
    { to: '/panels', label: 'Panel & insiden', icon: Gauge },
    { to: '/executive', label: 'Ringkasan eksekutif', icon: BarChart3 },
  ],
  AUDITOR: [{ to: '/audit', label: 'Audit perangkat', icon: ClipboardList }],
  MAINTENANCE: [{ to: '/panels', label: 'Panel & insiden', icon: Gauge }],
  PIMPINAN: [{ to: '/executive', label: 'Ringkasan eksekutif', icon: BarChart3 }],
}

const adminNav: NavItem[] = [
  { to: '/specs', label: 'Master perangkat', icon: Monitor },
  { to: '/users', label: 'Pengguna & peran', icon: Users },
  { to: '/settings', label: 'Pengaturan', icon: Settings },
]

const pageTitles: Record<string, { title: string; eyebrow: string }> = {
  '/dashboard': { title: 'Ringkasan lab', eyebrow: 'Pemantauan energi' },
  '/audit': { title: 'Audit perangkat', eyebrow: 'Inventaris & standby' },
  '/panels': { title: 'Panel & insiden', eyebrow: 'Operasional fasilitas' },
  '/executive': { title: 'Ringkasan eksekutif', eyebrow: 'Laporan pimpinan' },
  '/specs': { title: 'Master perangkat', eyebrow: 'Administrasi data' },
  '/users': { title: 'Pengguna & peran', eyebrow: 'Administrasi akses' },
  '/settings': { title: 'Pengaturan', eyebrow: 'Parameter sistem' },
}

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  if (!user) return null

  const nav = mainNav[user.role]
  const extraNav = user.role === 'ADMIN' ? adminNav : []
  const meta = pageTitles[location.pathname] ?? pageTitles['/dashboard']
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const navLink = (item: NavItem) => {
    const Icon = item.icon
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        onClick={() => setMenuOpen(false)}
      >
        <Icon size={18} strokeWidth={1.8} />
        <span>{item.label}</span>
      </NavLink>
    )
  }

  return (
    <div className="app-shell">
      <div className={`sidebar-scrim ${menuOpen ? 'visible' : ''}`} onClick={() => setMenuOpen(false)} />

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Zap size={21} fill="currentColor" strokeWidth={0} />
          </div>
          <div>
            <div className="brand-name">vampir</div>
            <div className="brand-sub">monitor energi lab</div>
          </div>
          <button className="icon-btn sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Tutup navigasi">
            <X size={18} />
          </button>
        </div>

        <div className="nav-group-label">Menu utama</div>
        <nav className="nav-list">{nav.map(navLink)}</nav>

        {extraNav.length > 0 && (
          <>
            <div className="nav-separator" />
            <div className="nav-group-label">Pengaturan</div>
            <nav className="nav-list">{extraNav.map(navLink)}</nav>
          </>
        )}

        <div className="sidebar-foot">
          <div className="campus-card">
            <div className="campus-card-label">Lingkup pemantauan</div>
            <div className="campus-card-name">Universitas Klabat</div>
            <div className="campus-card-meta">
              <span className="dot" />6 laboratorium komputer
            </div>
          </div>

          <div className="profile-card">
            <div className="avatar">{initials(user.name)}</div>
            <div className="profile-copy">
              <div className="profile-name">{user.name}</div>
              <div className="profile-role">{roleLabels[user.role]}</div>
            </div>
            <button className="icon-btn profile-logout" onClick={() => void logout()} aria-label="Keluar dari sistem">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Buka navigasi">
              <Menu size={19} />
            </button>
            <div className="breadcrumb">
              <span className="breadcrumb-muted">{meta.eyebrow}</span>
              <span className="breadcrumb-sep">/</span>
              <strong>{meta.title}</strong>
            </div>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{today}</span>
            <span className="role-pill">
              <ShieldCheck size={13} />
              {roleLabels[user.role]}
            </span>
          </div>
        </header>

        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
