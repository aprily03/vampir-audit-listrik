import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardList,
  Eye,
  EyeOff,
  Gauge,
  GraduationCap,
  Leaf,
  LoaderCircle,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Wrench,
  Zap,
} from 'lucide-react'
import { roleHome, useAuth } from '../auth/AuthContext'
import { firstError } from '../lib/api'

interface DemoUser {
  role: string
  name: string
  email: string
  badgeTone: string
  icon: typeof GraduationCap
  desc: string
}

const demoAccounts: DemoUser[] = [
  {
    role: 'ADMIN',
    name: 'Dosen Admin',
    email: 'admin@unklab.ac.id',
    badgeTone: 'accent',
    icon: GraduationCap,
    desc: 'Kelola master data, pantau 6 lab, laporkan insiden',
  },
  {
    role: 'AUDITOR',
    name: 'Auditor Lapangan',
    email: 'auditor@unklab.ac.id',
    badgeTone: 'blue',
    icon: ClipboardList,
    desc: 'Audit cepat PC 1-6 lab dengan smartphone/tablet',
  },
  {
    role: 'MAINTENANCE',
    name: 'Facility Maintenance',
    email: 'maintenance@unklab.ac.id',
    badgeTone: 'amber',
    icon: Wrench,
    desc: 'Pantau beban MCB 10A/40A & live feed insiden',
  },
  {
    role: 'PIMPINAN',
    name: 'Pimpinan Kampus',
    email: 'pimpinan@unklab.ac.id',
    badgeTone: 'purple',
    icon: UserCheck,
    desc: 'Executive summary, tren biaya PLN & cetak PDF',
  },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(email, password)
      navigate(roleHome[user.role], { replace: true })
    } catch (caught) {
      setError(firstError(caught))
    } finally {
      setSubmitting(false)
    }
  }

  function handleDemoSelect(account: DemoUser) {
    setEmail(account.email)
    setPassword('Vampir#2026')
    setError('')
  }

  return (
    <div className="login-screen">
      <div className="login-layout">
        {/* Left Branding Panel */}
        <aside className="login-intro">
          <div className="login-brand">
            <div className="brand-mark">
              <Zap size={24} fill="currentColor" strokeWidth={0} />
            </div>
            <div>
              <strong>VAMPIR MONITOR</strong>
              <span>Audit Daya Standby · 6 Lab Komputer</span>
            </div>
          </div>

          <div className="login-copy">
            <div className="eyebrow">Universitas Klabat (UNKLAB)</div>
            <h1>Deteksi & Kendalikan Kebocoran Energi Lab.</h1>
            <p>
              Platform terpusat untuk audit daya standby 210–240 PC, pengawasan beban MCB panel 10 A &amp; 40 A,
              serta evaluasi efisiensi biaya menuju Green Campus.
            </p>

            <div className="login-features">
              <div className="login-feature-item">
                <span className="login-feature-icon">
                  <ShieldCheck size={16} />
                </span>
                <span>
                  <strong>Cakupan 6 Laboratorium</strong>
                  <small>Lab Komputer 1 sampai Lab Komputer 6 terpantau terpusat</small>
                </span>
              </div>
              <div className="login-feature-item">
                <span className="login-feature-icon">
                  <ClipboardList size={16} />
                </span>
                <span>
                  <strong>Audit Cepat ≤ 1,5 Detik</strong>
                  <small>Fast-input dropdown, nomor PC otomatis, penanda unit rusak</small>
                </span>
              </div>
              <div className="login-feature-item">
                <span className="login-feature-icon">
                  <Gauge size={16} />
                </span>
                <span>
                  <strong>Peringatan Beban Panel MCB</strong>
                  <small>Grup Stopkontak 10 A (2.200 W) &amp; AC 40 A (8.800 W)</small>
                </span>
              </div>
              <div className="login-feature-item">
                <span className="login-feature-icon">
                  <Leaf size={16} />
                </span>
                <span>
                  <strong>Metrik Green Campus &amp; PDF</strong>
                  <small>Estimasi pemborosan Rp &amp; emisi kgCO₂e dengan laporan resmi</small>
                </span>
              </div>
            </div>
          </div>

          <div className="login-campus">
            Fakultas Ilmu Komputer · Universitas Klabat, Airmadidi, Manado
          </div>
        </aside>

        {/* Right Form Panel */}
        <section className="login-panel">
          <div className="login-panel-head">
            <span className="login-pill">Sistem Masuk Aman (RBAC)</span>
            <h2>Masuk ke Akun Anda</h2>
            <p>Silakan masukkan kredensial akun kampus yang telah terdaftar.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="field">
              <label htmlFor="loginEmail">Email Pengguna</label>
              <div className="input-icon-wrap">
                <Mail size={16} />
                <input
                  id="loginEmail"
                  className="input"
                  type="email"
                  autoComplete="username"
                  placeholder="contoh: admin@unklab.ac.id"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <div className="field-label-row">
                <label htmlFor="loginPassword">Kata Sandi</label>
                <span className="field-hint-text">Standar demo: Vampir#2026</span>
              </div>
              <div className="input-icon-wrap">
                <Lock size={16} />
                <input
                  id="loginPassword"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button className="btn btn-primary login-submit" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
              <span>{submitting ? 'Memverifikasi identitas…' : 'Masuk ke Sistem'}</span>
            </button>
          </form>

          {/* Quick Demo Access Grid */}
          <div className="demo-section">
            <div className="demo-header">
              <span>Pilih Cepat Akun Demo (1-Klik):</span>
            </div>
            <div className="demo-cards-grid">
              {demoAccounts.map((account) => {
                const Icon = account.icon
                const isSelected = email === account.email
                return (
                  <button
                    key={account.email}
                    type="button"
                    className={`demo-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleDemoSelect(account)}
                  >
                    <div className="demo-card-top">
                      <div className={`demo-avatar tone-${account.badgeTone}`}>
                        <Icon size={16} />
                      </div>
                      <span className="demo-role-badge">{account.role}</span>
                    </div>
                    <div className="demo-card-body">
                      <strong>{account.name}</strong>
                      <small>{account.desc}</small>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="login-footnote">
            <strong>Proteksi Akses Berlapis:</strong> Akun dinonaktifkan (<code>is_active = false</code>) akan
            ditolak sistem secara otomatis. Hak akses menu diatur sepenuhnya melalui RBAC server-side.
          </div>
        </section>
      </div>
    </div>
  )
}
