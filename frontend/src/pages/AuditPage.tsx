import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Monitor,
  Pencil,
  Save,
  Search,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api, firstError } from '../lib/api'
import { number } from '../lib/format'
import type { AuditLog, ProgressLab, Spec } from '../types'
import {
  Badge,
  ErrorState,
  FormField,
  Modal,
  PageHead,
  PageLoader,
  ProgressBar,
} from '../components/ui'
import { useToast } from '../components/ToastProvider'

interface AuditForm {
  pc_number: string
  master_pc_spec_id: string
  is_faulty: boolean
  fault_note: string
}

const emptyForm: AuditForm = {
  pc_number: '',
  master_pc_spec_id: '',
  is_faulty: false,
  fault_note: '',
}

function suggestNextPc(current: string, audits: AuditLog[], capacity: number): string {
  const currentNumber = Number(current.replace(/\D/g, ''))
  const used = new Set(audits.map((audit) => audit.pc_number.toUpperCase()))
  let next = Number.isFinite(currentNumber) && currentNumber > 0 ? currentNumber + 1 : 1

  while (next <= capacity && used.has(`PC-${String(next).padStart(2, '0')}`)) {
    next += 1
  }

  return next <= capacity ? `PC-${String(next).padStart(2, '0')}` : `PC-${String(capacity)}`
}

export default function AuditPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const pcInputRef = useRef<HTMLInputElement>(null)

  const [labs, setLabs] = useState<ProgressLab[]>([])
  const [specs, setSpecs] = useState<Spec[]>([])
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null)
  const [audits, setAudits] = useState<AuditLog[]>([])
  const [form, setForm] = useState<AuditForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingAudits, setLoadingAudits] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [online, setOnline] = useState(navigator.onLine)

  // Edit modal
  const [editing, setEditing] = useState<AuditLog | null>(null)
  const [editForm, setEditForm] = useState<AuditForm>(emptyForm)
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const selectedLab = labs.find((lab) => lab.id === selectedLabId) ?? null

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadBootstrap = useCallback(
    async (preferredLabId?: number | null) => {
      const [progressResponse, specsResponse] = await Promise.all([
        api.get<{ data: ProgressLab[] }>('/audits/progress'),
        api.get<{ data: Spec[] }>('/specs'),
      ])

      setLabs(progressResponse.data)
      setSpecs(specsResponse.data)

      const queryLab = Number(searchParams.get('lab'))
      const candidate =
        preferredLabId ??
        (Number.isFinite(queryLab) && progressResponse.data.some((lab) => lab.id === queryLab) ? queryLab : null) ??
        progressResponse.data.find((lab) => lab.not_audited)?.id ??
        progressResponse.data[0]?.id ??
        null

      setSelectedLabId(candidate)
      // Set default spec if available
      if (specsResponse.data.length > 0 && !form.master_pc_spec_id) {
        setForm((prev) => ({ ...prev, master_pc_spec_id: String(specsResponse.data[0].id) }))
      }
    },
    [searchParams, form.master_pc_spec_id],
  )

  const loadAudits = useCallback(async (labId: number, silent = false) => {
    if (!silent) setLoadingAudits(true)
    try {
      const response = await api.get<{ data: AuditLog[] }>('/audits', {
        lab_room_id: labId,
        per_page: 100,
      })
      setAudits(response.data)
    } finally {
      setLoadingAudits(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    loadBootstrap()
      .catch((caught) => {
        if (active) setError(firstError(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadBootstrap])

  useEffect(() => {
    if (!selectedLabId) return
    const next = suggestNextPc('', audits, selectedLab?.capacity ?? 40)
    setForm((current) => ({
      ...current,
      pc_number: current.pc_number || next,
    }))
    void loadAudits(selectedLabId).catch((caught) => setError(firstError(caught)))
  }, [selectedLabId, loadAudits, audits, selectedLab?.capacity])

  const filteredAudits = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return audits
    return audits.filter(
      (audit) =>
        audit.pc_number.toLowerCase().includes(query) ||
        audit.auditor?.name.toLowerCase().includes(query) ||
        audit.spec.label.toLowerCase().includes(query),
    )
  }, [audits, search])

  const progress = selectedLab?.progress_percent ?? 0
  const remaining = selectedLab ? Math.max(selectedLab.capacity - selectedLab.audited_count, 0) : 0

  async function refreshAfterSave(savedPc: string) {
    if (!selectedLabId) return
    await loadAudits(selectedLabId, true)
    await loadBootstrap(selectedLabId)
    const next = suggestNextPc(savedPc, audits, selectedLab?.capacity ?? 40)
    setForm((current) => ({
      ...current,
      pc_number: next,
      is_faulty: false,
      fault_note: '',
    }))
    window.setTimeout(() => pcInputRef.current?.focus(), 50)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!selectedLabId) {
      setFormError('Pilih laboratorium terlebih dahulu.')
      return
    }
    if (!form.master_pc_spec_id) {
      setFormError('Pilih kombinasi spesifikasi RAM dan SSD.')
      return
    }
    if (!online) {
      setFormError('Koneksi internet terputus. Data audit hanya dapat disimpan saat online.')
      return
    }

    setFormError('')
    setSaving(true)
    try {
      const payload = {
        lab_room_id: selectedLabId,
        pc_number: form.pc_number.trim(),
        master_pc_spec_id: Number(form.master_pc_spec_id),
        is_faulty: form.is_faulty,
        fault_note: form.is_faulty ? form.fault_note.trim() || null : null,
      }
      await api.post('/audits', payload)
      toast.success(`${payload.pc_number} berhasil disimpan di ${selectedLab?.name ?? 'lab'} (≤ 1.5s NFR-01).`)
      await refreshAfterSave(payload.pc_number)
    } catch (caught) {
      setFormError(firstError(caught))
    } finally {
      setSaving(false)
    }
  }

  function openEdit(audit: AuditLog) {
    setEditing(audit)
    setEditError('')
    setEditForm({
      pc_number: audit.pc_number,
      master_pc_spec_id: String(audit.master_pc_spec_id),
      is_faulty: audit.is_faulty,
      fault_note: audit.fault_note ?? '',
    })
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    setSavingEdit(true)
    setEditError('')
    try {
      await api.patch(`/audits/${editing.id}`, {
        pc_number: editForm.pc_number.trim(),
        master_pc_spec_id: Number(editForm.master_pc_spec_id),
        is_faulty: editForm.is_faulty,
        fault_note: editForm.is_faulty ? editForm.fault_note.trim() || null : null,
      })
      toast.success('Catatan audit unit diperbarui.')
      setEditing(null)
      if (selectedLabId) await loadAudits(selectedLabId, true)
      await loadBootstrap(selectedLabId)
    } catch (caught) {
      setEditError(firstError(caught))
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(audit: AuditLog) {
    if (!window.confirm(`Hapus catatan audit ${audit.pc_number}? Tindakan ini tidak dapat dibatalkan.`)) return
    try {
      await api.delete(`/audits/${audit.id}`)
      toast.success(`Catatan ${audit.pc_number} dihapus.`)
      if (selectedLabId) await loadAudits(selectedLabId, true)
      await loadBootstrap(selectedLabId)
    } catch (caught) {
      toast.error(firstError(caught))
    }
  }

  function handleSelectLab(id: number) {
    setSelectedLabId(id)
    setSearchParams({ lab: String(id) })
  }

  if (loading) return <PageLoader label="Memuat konsol audit lapangan…" />
  if (error) return <ErrorState message={error} onRetry={() => void loadBootstrap()} />

  const selectedSpec = specs.find((spec) => String(spec.id) === form.master_pc_spec_id)
  const suggested = selectedLab ? suggestNextPc(form.pc_number, audits, selectedLab.capacity) : ''

  return (
    <>
      <PageHead
        eyebrow="Web Screen 4: Auditor Fast-Input Console (UC-08, UC-09)"
        title="Konsol Audit Cepat Lapangan"
        description="Dirancang untuk kecepatan di smartphone & desktop (NFR-01: simpan ≤ 1,5 detik per PC). Pilih lab, pilih spesifikasi, simpan, dan langsung lanjut."
        actions={
          <div className="head-actions-row">
            <span className={`connection-pill ${online ? 'online' : 'offline'}`}>
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              {online ? 'Online (Auto-Sync)' : 'Offline (Simpan Nonaktif)'}
            </span>
          </div>
        }
      />

      {/* Lab Selector Horizontal Carousel */}
      <section className="lab-picker card">
        <div className="card-head compact">
          <div>
            <h2 className="card-title">Pilih Laboratorium Komputer</h2>
            <p className="card-sub">Cakupan 6 laboratorium UNKLAB (total target 210–240 PC)</p>
          </div>
          <Badge tone="info">6 Lab Komputer</Badge>
        </div>

        <div className="lab-picker-grid">
          {labs.map((lab) => {
            const isSelected = lab.id === selectedLabId
            const isFinished = lab.audited_count >= lab.capacity && lab.capacity > 0
            return (
              <button
                key={lab.id}
                type="button"
                className={`lab-pick ${isSelected ? 'active' : ''}`}
                onClick={() => handleSelectLab(lab.id)}
              >
                <div className="lab-pick-top">
                  <span className="lab-pick-name">{lab.name}</span>
                  <strong>{number(lab.progress_percent, 0)}%</strong>
                </div>

                <ProgressBar
                  value={lab.progress_percent}
                  height={6}
                  tone={lab.not_audited ? 'warning' : isFinished ? 'success' : 'accent'}
                />

                <div className="lab-pick-foot">
                  <span>
                    {lab.audited_count} / {lab.capacity} PC
                  </span>
                  {lab.not_audited ? (
                    <Badge tone="neutral">Belum Diaudit</Badge>
                  ) : lab.faulty_count > 0 ? (
                    <Badge tone="danger">{lab.faulty_count} Rusak</Badge>
                  ) : isFinished ? (
                    <Badge tone="success">Lengkap</Badge>
                  ) : (
                    <span className="muted">Sedang Audit</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Main Fast-Input & List Layout */}
      <div className="audit-layout">
        {/* Fast-Input Card */}
        <section className="card audit-form-card">
          <div className="card-head">
            <div>
              <div className="flex-center-gap">
                <Badge tone="accent">Input Cepat</Badge>
                <h2 className="card-title">{selectedLab?.name ?? 'Pilih Lab'}</h2>
              </div>
              <p className="card-sub">
                {selectedLab
                  ? `${selectedLab.audited_count} dari ${selectedLab.capacity} PC terdata · ${remaining} unit tersisa`
                  : 'Pilih lab di atas untuk memulai.'}
              </p>
            </div>

            <div className="progress-ring-small" aria-label={`Progres ${number(progress, 0)}%`}>
              <svg viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="#2d6a4f"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(Math.min(progress, 100) / 100) * 113.1} 113.1`}
                  transform="rotate(-90 22 22)"
                />
              </svg>
              <span>{number(progress, 0)}%</span>
            </div>
          </div>

          {!online && (
            <div className="inline-warning">
              <WifiOff size={15} /> Koneksi internet terputus. Data audit hanya dapat disimpan saat tersambung.
            </div>
          )}

          <form onSubmit={handleSubmit} className="audit-form">
            {/* PC Number Input */}
            <FormField
              label="Nomor Unit PC (Auto-Increment)"
              htmlFor="pcNumber"
              hint={suggested ? `Saran urutan berikutnya: ${suggested}` : 'Masukkan nomor unit PC'}
            >
              <div className="input-icon-wrap">
                <Monitor size={18} className="text-muted" />
                <input
                  id="pcNumber"
                  ref={pcInputRef}
                  className="input input-lg"
                  value={form.pc_number}
                  onChange={(event) => setForm({ ...form, pc_number: event.target.value })}
                  placeholder={suggested || 'Contoh: PC-01'}
                  autoComplete="off"
                  required
                />
                {suggested && form.pc_number !== suggested && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setForm({ ...form, pc_number: suggested })}
                  >
                    Gunakan {suggested}
                  </button>
                )}
              </div>
            </FormField>

            {/* Quick Spec Presets */}
            <div className="field">
              <label className="field-label">Pilih Spesifikasi Master (RAM &amp; SSD)</label>
              <div className="spec-chips-row">
                {specs.map((spec) => {
                  const isSelected = String(spec.id) === form.master_pc_spec_id
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      className={`spec-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, master_pc_spec_id: String(spec.id) })}
                    >
                      <div className="spec-chip-title">{spec.label}</div>
                      <div className="spec-chip-watt">
                        <Zap size={12} /> {number(spec.standby_watt, 2)} W Standby
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Standard Dropdown alternative */}
              <div className="spec-select-fallback">
                <select
                  id="pcSpec"
                  className="input"
                  value={form.master_pc_spec_id}
                  onChange={(event) => setForm({ ...form, master_pc_spec_id: event.target.value })}
                  required
                >
                  <option value="">Atau pilih spesifikasi dari dropdown lengkap…</option>
                  {specs.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.label} · Daya Standby: {number(spec.standby_watt, 2)} W
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Standby Watt Preview Badge */}
            {selectedSpec && (
              <div className="spec-preview-banner">
                <Zap size={16} className="text-accent" />
                <span>
                  Standby Snapshot: <strong>{number(selectedSpec.standby_watt, 2)} Watt</strong> (Estimasi beban vampir terbuang saat shutdown)
                </span>
              </div>
            )}

            {/* Faulty Unit Toggle (UC-09) */}
            <label className={`fault-toggle ${form.is_faulty ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={form.is_faulty}
                onChange={(event) => setForm({ ...form, is_faulty: event.target.checked })}
              />
              <span className="fault-toggle-box">
                {form.is_faulty && <CheckCircle2 size={16} />}
              </span>
              <span className="fault-toggle-copy">
                <strong>Unit Mengalami Gangguan / Rusak (UC-09)</strong>
                <small>Centang jika PC tidak mau menyala, blue screen, atau komponen rusak.</small>
              </span>
              <AlertTriangle size={20} className="fault-toggle-icon" />
            </label>

            {form.is_faulty && (
              <FormField
                label="Catatan Gangguan Unit PC"
                htmlFor="faultNote"
                hint="Jelaskan kondisi kerusakan unit (misal: power supply mati total, RAM error, layar tidak tampil)."
              >
                <div className="quick-tags-row">
                  {['Mati total (tidak ada daya)', 'RAM / Blue screen', 'SSD error / Corrupt', 'Kabel power longgar'].map(
                    (tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="quick-tag-chip"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            fault_note: prev.fault_note ? `${prev.fault_note}, ${tag}` : tag,
                          }))
                        }
                      >
                        + {tag}
                      </button>
                    ),
                  )}
                </div>
                <textarea
                  id="faultNote"
                  className="input textarea"
                  rows={2}
                  placeholder="Ketik catatan kerusakan tambahan di sini..."
                  value={form.fault_note}
                  onChange={(event) => setForm({ ...form, fault_note: event.target.value })}
                />
              </FormField>
            )}

            {formError && (
              <div className="login-error" role="alert">
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              className="btn btn-primary btn-save-fast"
              type="submit"
              disabled={saving || !online}
            >
              {saving ? <LoaderCircle className="spin" size={19} /> : <Save size={19} />}
              <span>{saving ? 'Menyimpan dalam ≤ 1,5 detik…' : 'Simpan & Lanjut PC Berikutnya (Enter)'}</span>
            </button>
          </form>
        </section>

        {/* Audit Log Table Section */}
        <section className="card audit-list-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Daftar Unit PC Terdata ({audits.length})</h2>
              <p className="card-sub">{selectedLab?.name ?? 'Laboratorium'}</p>
            </div>

            <div className="search-wrap">
              <Search size={15} />
              <input
                className="input input-sm"
                placeholder="Cari nomor PC atau spek..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loadingAudits ? (
            <div className="empty-inline">
              <LoaderCircle size={18} className="spin" /> Memuat data unit...
            </div>
          ) : filteredAudits.length === 0 ? (
            <div className="empty-inline">
              {audits.length === 0
                ? 'Belum ada PC yang diaudit di lab ini. Gunakan formulir di samping untuk memulai.'
                : 'Tidak ada unit PC yang cocok dengan pencarian.'}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PC</th>
                    <th>Spesifikasi</th>
                    <th>Standby</th>
                    <th>Auditor</th>
                    <th>Kondisi</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.map((audit) => (
                    <tr key={audit.id}>
                      <td className="cell-strong">{audit.pc_number}</td>
                      <td>
                        <div className="table-spec-label">{audit.spec.label}</div>
                      </td>
                      <td>
                        <span className="watt-pill">{number(audit.spec.standby_watt, 2)} W</span>
                      </td>
                      <td className="cell-muted">{audit.auditor?.name ?? 'Auditor'}</td>
                      <td>
                        {audit.is_faulty ? (
                          <div className="fault-indicator">
                            <Badge tone="danger">Rusak</Badge>
                            {audit.fault_note && <small title={audit.fault_note}>{audit.fault_note}</small>}
                          </div>
                        ) : (
                          <Badge tone="success" dot>
                            Normal
                          </Badge>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="action-buttons-row">
                          <button
                            type="button"
                            className="btn-icon-subtle"
                            onClick={() => openEdit(audit)}
                            title="Edit data PC"
                          >
                            <Pencil size={15} />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn-icon-subtle text-danger"
                              onClick={() => void handleDelete(audit)}
                              title="Hapus unit"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Edit PC Modal */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`Koreksi Data ${editing?.pc_number ?? 'PC'}`}>
        <form onSubmit={handleEditSubmit} className="modal-form">
          <FormField label="Nomor PC" htmlFor="editPcNumber">
            <input
              id="editPcNumber"
              className="input"
              value={editForm.pc_number}
              onChange={(e) => setEditForm({ ...editForm, pc_number: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Spesifikasi Master" htmlFor="editPcSpec">
            <select
              id="editPcSpec"
              className="input"
              value={editForm.master_pc_spec_id}
              onChange={(e) => setEditForm({ ...editForm, master_pc_spec_id: e.target.value })}
              required
            >
              {specs.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.label} · {number(spec.standby_watt, 2)} W Standby
                </option>
              ))}
            </select>
          </FormField>

          <label className={`fault-toggle ${editForm.is_faulty ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={editForm.is_faulty}
              onChange={(e) => setEditForm({ ...editForm, is_faulty: e.target.checked })}
            />
            <span className="fault-toggle-box">{editForm.is_faulty && <CheckCircle2 size={16} />}</span>
            <span>
              <strong>Unit Mengalami Gangguan / Rusak</strong>
            </span>
          </label>

          {editForm.is_faulty && (
            <FormField label="Catatan Gangguan" htmlFor="editFaultNote">
              <textarea
                id="editFaultNote"
                className="input textarea"
                rows={3}
                value={editForm.fault_note}
                onChange={(e) => setEditForm({ ...editForm, fault_note: e.target.value })}
              />
            </FormField>
          )}

          {editError && (
            <div className="login-error" role="alert">
              <span>{editError}</span>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditing(null)}
              disabled={savingEdit}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingEdit}>
              {savingEdit ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
              <span>{savingEdit ? 'Menyimpan…' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
