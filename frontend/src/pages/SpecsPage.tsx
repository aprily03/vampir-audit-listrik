import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  HardDrive,
  LoaderCircle,
  Monitor,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { useToast } from '../components/ToastProvider'
import {
  Badge,
  EmptyState,
  ErrorState,
  FormField,
  Modal,
  PageHead,
  PageLoader,
  StatCard,
} from '../components/ui'
import { api, firstError } from '../lib/api'
import { number } from '../lib/format'
import type { Spec } from '../types'

type Filter = 'ALL' | 'ACTIVE' | 'INACTIVE'

interface SpecForm {
  ram_gb: string
  storage_gb: string
  storage_type: string
  standby_watt: string
  is_active: boolean
}

const emptyForm: SpecForm = {
  ram_gb: '',
  storage_gb: '',
  storage_type: 'SSD',
  standby_watt: '',
  is_active: true,
}

const storageTypes = ['SSD', 'HDD', 'NVME']

function specLabel(form: SpecForm): string {
  const ram = form.ram_gb || '—'
  const storage = form.storage_gb || '—'
  return `${ram} GB RAM · ${storage} GB ${form.storage_type}`
}

export default function SpecsPage() {
  const toast = useToast()

  const [specs, setSpecs] = useState<Spec[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Spec | null>(null)
  const [form, setForm] = useState<SpecForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const response = await api.get<{ data: Spec[] }>('/specs', { include_inactive: 1 })
      setSpecs(response.data)
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
    const active = specs.filter((spec) => spec.is_active).length
    return { total: specs.length, active, inactive: specs.length - active }
  }, [specs])

  const wattRange = useMemo(() => {
    if (specs.length === 0) return { min: 0, max: 0 }
    const values = specs.map((spec) => spec.standby_watt)
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [specs])

  const filteredSpecs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return specs.filter((spec) => {
      if (filter === 'ACTIVE' && !spec.is_active) return false
      if (filter === 'INACTIVE' && spec.is_active) return false
      if (!query) return true
      return (
        spec.label.toLowerCase().includes(query) ||
        spec.storage_type.toLowerCase().includes(query) ||
        String(spec.ram_gb).includes(query) ||
        String(spec.storage_gb).includes(query)
      )
    })
  }, [specs, filter, search])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(spec: Spec) {
    setEditing(spec)
    setForm({
      ram_gb: String(spec.ram_gb),
      storage_gb: String(spec.storage_gb),
      storage_type: spec.storage_type,
      standby_watt: String(spec.standby_watt),
      is_active: spec.is_active,
    })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        ram_gb: Number(form.ram_gb),
        storage_gb: Number(form.storage_gb),
        storage_type: form.storage_type,
        standby_watt: Number(form.standby_watt),
        is_active: form.is_active,
      }
      if (editing) {
        await api.patch(`/specs/${editing.id}`, payload)
        toast.success('Spesifikasi perangkat diperbarui.')
      } else {
        await api.post('/specs', payload)
        toast.success('Spesifikasi perangkat ditambahkan.')
      }
      setModalOpen(false)
      await load(true)
    } catch (caught) {
      setFormError(firstError(caught))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(spec: Spec) {
    setBusyId(spec.id)
    try {
      await api.patch(`/specs/${spec.id}`, { is_active: !spec.is_active })
      setSpecs((current) =>
        current.map((entry) => (entry.id === spec.id ? { ...entry, is_active: !spec.is_active } : entry)),
      )
      toast.success(`Spesifikasi ${spec.label} ${spec.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`)
    } catch (caught) {
      toast.error(firstError(caught))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(spec: Spec) {
    if (
      !window.confirm(
        `Hapus spesifikasi ${spec.label}? Spesifikasi yang sudah dipakai pada audit tidak dapat dihapus.`,
      )
    ) {
      return
    }
    setBusyId(spec.id)
    try {
      await api.delete(`/specs/${spec.id}`)
      setSpecs((current) => current.filter((entry) => entry.id !== spec.id))
      toast.success('Spesifikasi dihapus.')
    } catch (caught) {
      toast.error(firstError(caught))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <PageLoader label="Memuat master spesifikasi…" />
  if (error) return <ErrorState message={error} onRetry={() => void load()} />

  return (
    <>
      <PageHead
        eyebrow="Administrasi data"
        title="Master perangkat"
        description="Katalog kombinasi RAM dan penyimpanan beserta asumsi watt standby yang dipakai saat audit."
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => void load()} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              Perbarui
            </button>
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              Tambah spesifikasi
            </button>
          </>
        }
      />

      <div className="info-banner">
        <Monitor size={17} />
        <div>
          <strong>Nilai watt standby adalah asumsi per unit.</strong> Setiap audit menyimpan salinan watt saat dicatat,
          sehingga perubahan master tidak mengubah hasil audit historis. Nilai ini bukan daya aktif saat PC digunakan.
        </div>
        <Badge tone="info">Snapshot audit</Badge>
      </div>

      <section className="stats-grid">
        <StatCard
          icon={<Monitor size={19} />}
          label="Total kombinasi"
          value={number(counts.total)}
          meta="Seluruh spesifikasi terdaftar"
          tone="accent"
        />
        <StatCard
          icon={<Power size={19} />}
          label="Spesifikasi aktif"
          value={number(counts.active)}
          meta={`${number(counts.inactive)} nonaktif`}
          tone="blue"
        />
        <StatCard
          icon={<HardDrive size={19} />}
          label="Standby terendah"
          value={
            <>
              {number(wattRange.min, 2)} <span className="stat-value-sub">W</span>
            </>
          }
          meta="Per unit pada katalog"
          tone="amber"
        />
        <StatCard
          icon={<HardDrive size={19} />}
          label="Standby tertinggi"
          value={
            <>
              {number(wattRange.max, 2)} <span className="stat-value-sub">W</span>
            </>
          }
          meta="Per unit pada katalog"
          tone="accent"
        />
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Katalog spesifikasi</h2>
            <p className="card-sub">Hanya spesifikasi aktif yang tersedia pada formulir audit.</p>
          </div>
          <Badge tone="neutral">{filteredSpecs.length} dari {counts.total}</Badge>
        </div>

        <div className="toolbar">
          <div className="input-icon-wrap toolbar-search">
            <Search size={15} />
            <input
              className="input input-sm"
              placeholder="Cari RAM, penyimpanan, atau tipe…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="tab-row compact-tabs" role="tablist" aria-label="Filter status spesifikasi">
            {(
              [
                { value: 'ALL', label: 'Semua' },
                { value: 'ACTIVE', label: 'Aktif' },
                { value: 'INACTIVE', label: 'Nonaktif' },
              ] as { value: Filter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={filter === tab.value}
                className={`tab ${filter === tab.value ? 'active' : ''}`}
                onClick={() => setFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredSpecs.length === 0 ? (
          <EmptyState
            icon={<Monitor size={22} />}
            title={specs.length === 0 ? 'Belum ada spesifikasi' : 'Tidak ada spesifikasi yang cocok'}
            description={
              specs.length === 0
                ? 'Tambahkan kombinasi perangkat agar auditor dapat mencatat standby.'
                : 'Ubah kata kunci atau filter status untuk melihat data lain.'
            }
            action={
              specs.length === 0 ? (
                <button className="btn btn-primary btn-sm" onClick={openCreate}>
                  <Plus size={14} /> Tambah spesifikasi
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Spesifikasi</th>
                  <th>RAM</th>
                  <th>Penyimpanan</th>
                  <th className="right">Standby</th>
                  <th>Status</th>
                  <th aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {filteredSpecs.map((spec) => (
                  <tr key={spec.id} className={spec.is_active ? '' : 'row-inactive'}>
                    <td className="cell-strong">{spec.label}</td>
                    <td>{number(spec.ram_gb)} GB</td>
                    <td>
                      {number(spec.storage_gb)} GB <span className="muted">· {spec.storage_type}</span>
                    </td>
                    <td className="right cell-strong">{number(spec.standby_watt, 2)} W</td>
                    <td>
                      <Badge tone={spec.is_active ? 'success' : 'neutral'} dot>
                        {spec.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn icon-btn-sm"
                          onClick={() => openEdit(spec)}
                          aria-label={`Ubah ${spec.label}`}
                          title="Ubah spesifikasi"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-btn icon-btn-sm"
                          onClick={() => void toggleActive(spec)}
                          disabled={busyId === spec.id}
                          aria-label={`${spec.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${spec.label}`}
                          title={spec.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {busyId === spec.id ? <LoaderCircle size={14} className="spin" /> : <Power size={14} />}
                        </button>
                        <button
                          className="icon-btn icon-btn-sm danger"
                          onClick={() => void handleDelete(spec)}
                          disabled={busyId === spec.id}
                          aria-label={`Hapus ${spec.label}`}
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="data-note">
          Spesifikasi yang telah dipakai pada catatan audit tidak dapat dihapus. Nonaktifkan agar tetap tersimpan sebagai
          riwayat, tetapi tidak muncul pada pilihan audit baru.
        </div>
      </section>

      <Modal
        open={modalOpen}
        title={editing ? 'Ubah spesifikasi' : 'Tambah spesifikasi'}
        subtitle="Watt standby dipakai sebagai snapshot pada setiap audit baru."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" type="submit" form="specForm" disabled={saving}>
              {saving ? <LoaderCircle size={16} className="spin" /> : <Monitor size={16} />}
              {editing ? 'Simpan perubahan' : 'Tambah spesifikasi'}
            </button>
          </>
        }
      >
        <form id="specForm" className="form-stack" onSubmit={handleSubmit}>
          <div className="form-row">
            <FormField label="RAM (GB)" htmlFor="specRam">
              <input
                id="specRam"
                className="input"
                type="number"
                min="1"
                max="1024"
                value={form.ram_gb}
                onChange={(event) => setForm({ ...form, ram_gb: event.target.value })}
                required
              />
            </FormField>
            <FormField label="Penyimpanan (GB)" htmlFor="specStorage">
              <input
                id="specStorage"
                className="input"
                type="number"
                min="1"
                max="100000"
                value={form.storage_gb}
                onChange={(event) => setForm({ ...form, storage_gb: event.target.value })}
                required
              />
            </FormField>
          </div>
          <div className="form-row">
            <FormField label="Tipe penyimpanan" htmlFor="specType">
              <select
                id="specType"
                className="input"
                value={form.storage_type}
                onChange={(event) => setForm({ ...form, storage_type: event.target.value })}
                required
              >
                {storageTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Daya standby (W)" htmlFor="specWatt" hint="Asumsi per unit, misalnya 5 W.">
              <input
                id="specWatt"
                className="input"
                type="number"
                min="0.01"
                max="10000"
                step="0.01"
                value={form.standby_watt}
                onChange={(event) => setForm({ ...form, standby_watt: event.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="calc-preview">
            Label katalog: <strong>{specLabel(form)}</strong>. Watt standby yang dipakai:{' '}
            <strong>{form.standby_watt ? `${number(Number(form.standby_watt), 2)} W` : '—'}</strong>.
          </div>

          <label className={`toggle-row ${form.is_active ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
            <span className="toggle-box" />
            <span>
              <strong>Spesifikasi aktif</strong>
              <small>Aktif berarti dapat dipilih pada formulir audit baru.</small>
            </span>
          </label>

          {formError && <div className="inline-error">{formError}</div>}
        </form>
      </Modal>
    </>
  )
}
