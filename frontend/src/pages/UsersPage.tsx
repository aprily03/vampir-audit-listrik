import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react'
import { roleLabels, useAuth } from '../auth/AuthContext'
import { useToast } from '../components/ToastProvider'
import {
  Badge,
  EmptyState,
  ErrorState,
  FormField,
  Modal,
  PageHead,
  PageLoader,
} from '../components/ui'
import { api, firstError } from '../lib/api'
import { dateOnly, initials } from '../lib/format'
import type { AppUser, Paginated, Role } from '../types'

type RoleFilter = 'ALL' | Role
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

interface UserForm {
  name: string
  email: string
  password: string
  role: Role
  is_active: boolean
}

const emptyForm: UserForm = {
  name: '',
  email: '',
  password: '',
  role: 'AUDITOR',
  is_active: true,
}

const roleOrder: Role[] = ['ADMIN', 'AUDITOR', 'MAINTENANCE', 'PIMPINAN']

const roleMeta: Record<Role, { tone: 'accent' | 'info' | 'warning' | 'success'; description: string }> = {
  ADMIN: { tone: 'accent', description: 'Administrasi data, pengguna, dan laporan' },
  AUDITOR: { tone: 'info', description: 'Audit PC dan pencatatan standby' },
  MAINTENANCE: { tone: 'warning', description: 'Panel listrik dan tindak lanjut insiden' },
  PIMPINAN: { tone: 'success', description: 'Ringkasan eksekutif dan unduhan PDF' },
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const toast = useToast()

  const [users, setUsers] = useState<AppUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const response = await api.get<Paginated<AppUser>>('/users')
      setUsers(response.data)
      setTotal(response.meta?.total ?? response.total ?? response.data.length)
      setError('')
    } catch (caught) {
      setError(firstError(caught))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const counts = useMemo(() => {
    const result: Record<Role, number> = { ADMIN: 0, AUDITOR: 0, MAINTENANCE: 0, PIMPINAN: 0 }
    for (const user of users) {
      if (user.is_active) result[user.role] += 1
    }
    return result
  }, [users])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false
      if (statusFilter === 'ACTIVE' && !user.is_active) return false
      if (statusFilter === 'INACTIVE' && user.is_active) return false
      if (!query) return true
      return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    })
  }, [users, search, roleFilter, statusFilter])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(user: AppUser) {
    setEditing(user)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      is_active: user.is_active,
    })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          is_active: form.is_active,
        }
        if (form.password.trim()) payload.password = form.password
        await api.patch(`/users/${editing.id}`, payload)
        toast.success('Akun pengguna diperbarui.')
      } else {
        await api.post('/users', {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          is_active: form.is_active,
        })
        toast.success('Akun pengguna ditambahkan.')
      }
      setModalOpen(false)
      await load(true)
    } catch (caught) {
      setFormError(firstError(caught))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(user: AppUser) {
    if (user.is_active && !window.confirm(`Nonaktifkan akun ${user.name}? Pengguna akan keluar dari sesi aktif.`)) {
      return
    }
    setBusyId(user.id)
    try {
      if (user.is_active) {
        await api.delete(`/users/${user.id}`)
        toast.success(`Akun ${user.name} dinonaktifkan.`)
      } else {
        await api.patch(`/users/${user.id}`, { is_active: true })
        toast.success(`Akun ${user.name} diaktifkan kembali.`)
      }
      await load(true)
    } catch (caught) {
      toast.error(firstError(caught))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <PageLoader label="Memuat pengguna dan peran…" />
  if (error) return <ErrorState message={error} onRetry={() => void load()} />

  return (
    <>
      <PageHead
        eyebrow="Administrasi akses"
        title="Pengguna & peran"
        description="Kelola akun staf, tentukan peran akses, dan nonaktifkan akun yang tidak lagi bertugas."
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => void load()} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              Perbarui
            </button>
            <button className="btn btn-primary" onClick={openCreate}>
              <UserPlus size={16} />
              Tambah pengguna
            </button>
          </>
        }
      />

      <div className="info-banner">
        <ShieldCheck size={17} />
        <div>
          <strong>Peran menentukan hak akses di server, bukan hanya tampilan.</strong> Tidak ada registrasi mandiri. Admin
          tidak dapat menonaktifkan akunnya sendiri atau menghapus Admin aktif terakhir.
        </div>
        <Badge tone="info">RBAC</Badge>
      </div>

      <section className="role-summary">
        {roleOrder.map((role) => {
          const meta = roleMeta[role]
          return (
            <article className={`role-card role-card-${meta.tone}`} key={role}>
              <div className="role-card-top">
                <span className="role-card-icon">
                  {role === 'ADMIN' && <ShieldCheck size={17} />}
                  {role === 'AUDITOR' && <Users size={17} />}
                  {role === 'MAINTENANCE' && <KeyRound size={17} />}
                  {role === 'PIMPINAN' && <CheckCircle2 size={17} />}
                </span>
                <strong>{counts[role]}</strong>
              </div>
              <div className="role-card-label">{roleLabels[role]}</div>
              <div className="role-card-meta">{meta.description}</div>
            </article>
          )
        })}
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Daftar akun</h2>
            <p className="card-sub">Akun nonaktif tidak dapat masuk, tetapi riwayat audit dan insidennya tetap tersimpan.</p>
          </div>
          <Badge tone="neutral">
            {filteredUsers.length} dari {total} akun
          </Badge>
        </div>

        <div className="toolbar toolbar-wrap">
          <div className="input-icon-wrap toolbar-search">
            <Search size={15} />
            <input
              className="input input-sm"
              placeholder="Cari nama atau email…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="toolbar-filters">
            <select
              className="input input-sm"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
              aria-label="Filter peran"
            >
              <option value="ALL">Semua peran</option>
              {roleOrder.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
            <select
              className="input input-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              aria-label="Filter status"
            >
              <option value="ALL">Semua status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title={users.length === 0 ? 'Belum ada pengguna' : 'Tidak ada akun yang cocok'}
            description={
              users.length === 0
                ? 'Tambahkan akun pertama untuk mulai menggunakan sistem.'
                : 'Ubah kata kunci atau filter untuk melihat akun lain.'
            }
            action={
              users.length === 0 ? (
                <button className="btn btn-primary btn-sm" onClick={openCreate}>
                  <Plus size={14} /> Tambah pengguna
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table users-table">
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Peran</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isSelf = currentUser?.id === user.id
                  return (
                    <tr key={user.id} className={user.is_active ? '' : 'row-inactive'}>
                      <td>
                        <div className="user-cell">
                          <span className={`avatar avatar-sm ${user.is_active ? '' : 'avatar-muted'}`}>
                            {initials(user.name)}
                          </span>
                          <div>
                            <div className="cell-strong">
                              {user.name} {isSelf && <span className="self-tag">Anda</span>}
                            </div>
                            <div className="cell-muted user-email">
                              <Mail size={12} /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone={roleMeta[user.role].tone}>{roleLabels[user.role]}</Badge>
                      </td>
                      <td>
                        <Badge tone={user.is_active ? 'success' : 'neutral'} dot>
                          {user.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="cell-muted">{dateOnly(user.created_at)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn icon-btn-sm"
                            onClick={() => openEdit(user)}
                            aria-label={`Ubah ${user.name}`}
                            title="Ubah akun"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className={`icon-btn icon-btn-sm ${user.is_active ? 'danger' : ''}`}
                            onClick={() => void toggleActive(user)}
                            disabled={busyId === user.id || (isSelf && user.is_active)}
                            aria-label={`${user.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${user.name}`}
                            title={
                              isSelf && user.is_active
                                ? 'Tidak dapat menonaktifkan akun sendiri'
                                : user.is_active
                                  ? 'Nonaktifkan akun'
                                  : 'Aktifkan akun'
                            }
                          >
                            {busyId === user.id ? (
                              <LoaderCircle size={14} className="spin" />
                            ) : user.is_active ? (
                              <UserX size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="data-note">
          Penonaktifan akun mencabut seluruh token akses aktif. Riwayat audit dan insiden tetap merujuk pada nama
          pengguna tersebut.
        </div>
      </section>

      <Modal
        open={modalOpen}
        title={editing ? `Ubah akun ${editing.name}` : 'Tambah pengguna'}
        subtitle={editing ? 'Kosongkan kata sandi bila tidak ingin menggantinya.' : 'Kata sandi minimal 8 karakter.'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" type="submit" form="userForm" disabled={saving}>
              {saving ? <LoaderCircle size={16} className="spin" /> : <UserPlus size={16} />}
              {editing ? 'Simpan perubahan' : 'Tambah pengguna'}
            </button>
          </>
        }
      >
        <form id="userForm" className="form-stack" onSubmit={handleSubmit}>
          <FormField label="Nama lengkap" htmlFor="userName">
            <input
              id="userName"
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              maxLength={120}
              required
            />
          </FormField>
          <FormField label="Email" htmlFor="userEmail" hint="Gunakan email institusi yang aktif.">
            <input
              id="userEmail"
              className="input"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              maxLength={150}
              required
            />
          </FormField>
          <FormField
            label={editing ? 'Kata sandi baru (opsional)' : 'Kata sandi'}
            htmlFor="userPassword"
            hint={editing ? 'Biarkan kosong untuk mempertahankan kata sandi saat ini.' : 'Minimal 8 karakter.'}
          >
            <input
              id="userPassword"
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder={editing ? 'Tidak diubah' : 'Minimal 8 karakter'}
              required={!editing}
            />
          </FormField>
          <FormField
            label="Peran akses"
            htmlFor="userRole"
            hint={roleMeta[form.role].description}
          >
            <select
              id="userRole"
              className="input"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
              required
            >
              {roleOrder.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]} ({role})
                </option>
              ))}
            </select>
          </FormField>

          <label className={`toggle-row ${form.is_active ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
            <span className="toggle-box" />
            <span>
              <strong>Akun aktif</strong>
              <small>Akun nonaktif tidak dapat masuk ke sistem.</small>
            </span>
          </label>

          {formError && <div className="inline-error">{formError}</div>}
        </form>
      </Modal>
    </>
  )
}
