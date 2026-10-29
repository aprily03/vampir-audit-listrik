import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  Gauge,
  Leaf,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { roleHome, useAuth } from '../auth/AuthContext'
import { firstError } from '../lib/api'

const demoAccounts = [
  { label: 'Admin', email: 'admin@unklab.ac.id' },
  { label: 'Auditor', email: 'auditor@unklab.ac.id' },
  { label: 'Maintenance', email: 'maintenance@unklab.ac.id' },
  { label: 'Pimpinan', email: 'pimpinan@unklab.ac.id' },
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

  function fillDemo(accountEmail: string) {
    setEmail(accountEmail)
    setPassword('Vampir#2026')
    setError('')
  }

  return (
    <section className="login-screen">
      <div className="login-layout">
        <aside className="login-intro">
          <div className="login-brand">
            <div className="brand-mark">
              <Zap size={22} fill="currentColor" strokeWidth={0} />
            </div>
            <div>
              <strong>vampir</strong>
              <span>monitor energi laboratorium</span>
            </div>
          </div>

          <div className="login-copy">
            <div className="eyebrow">Universitas Klabat</div>
            <h1>Pantau energi. Kelola lebih baik.</h1>
            <p>
              Satu ruang kerja untuk audit perangkat, kondisi panel listrik, dan efisiensi energi di enam
              laboratorium komputer.
            </p>

            <div className="login-features">
              <div>
                <span className="login-feature-icon"><ShieldCheck size={16} /></span>
                6 laboratorium terpantau
              </div>
              <div>
                <span className="login-feature-icon"><ClipboardCheck size={16} /></span>
                Audit perangkat lebih cepat
              </div>
              <div>
                <span className="login-feature-icon"><Gauge size={16} /></span>
                Peringatan beban panel
              </div>
              <div>
                <span className="login-feature-icon"><Leaf size={16} /></span>
                Estimasi dampak lingkungan
              </div>
            </div>
          </div>

          <div className="login-campus">
            Sistem Audit Listrik Vampir · Fakultas Ilmu Komputer
          </div>
        </aside>

        <section className="login-panel">
          <div className="login-panel-head">
            <h2>Masuk ke sistem</h2>
            <p>Gunakan akun yang telah diberikan administrator.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="field">
              <label htmlFor="loginEmail">Email</label>
              <div className="input-icon-wrap">
                <Mail size={16} />
                <input
                  id="loginEmail"
                  className="input"
                  type="email"
                  autoComplete="username"
                  placeholder="nama@unklab.ac.id"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="loginPassword">Kata sandi</label>
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
                {error}
              </div>
            )}

            <button className="btn btn-primary login-submit" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}
              {submitting ? 'Memeriksa akun…' : 'Masuk ke sistem'}
            </button>
          </form>

          <div className="demo-accounts">
            <div className="demo-title">Akun demo · kata sandi <code>Vampir#2026</code></div>
            <div className="demo-chips">
              {demoAccounts.map((account) => (
                <button key={account.email} type="button" onClick={() => fillDemo(account.email)}>
                  {account.label}
                </button>
              ))}
            </div>
          </div>

          <div className="login-footnote">
            <strong>Tidak ada registrasi mandiri.</strong> Akun diberikan oleh administrator. Peran dan hak
            akses ditentukan oleh server, bukan dipilih pada formulir ini.
          </div>
        </section>
      </div>
    </section>
  )
}
