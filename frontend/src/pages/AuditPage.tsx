import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  Monitor,
  Pencil,
  Save,
  Search,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { api, firstError } from '../lib/api'
import { dateTime, number, relativeTime } from '../lib/format'
import type { AuditLog, ProgressLab, Spec } from '../types'
import {
  Badge,
  EmptyState,
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

  return next <= capacity ? `PC-${String(next).padStart(2, '0')}` : ''
}

export default function AuditPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const toast = useToast()
  const [searchParams] = useSearchParams()
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

  const loadBootstrap = useCallback(async (preferredLabId?: number | null) => {
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

    setSelectedLabId((current) => current ?? candidate)
  }, [searchParams])

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
    setForm((current) => ({ ...current, pc_number: '' }))
    void loadAudits(selectedLabId).catch((caught) => setError(firstError(caught)))
  }, [selectedLabId, loadAudits])

  useEffect(() => {
    if (!online) setFormError('Koneksi internet terputus. Data audit hanya dapat disimpan saat online.')
  }, [online])

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
    setForm((current) => ({ ...current, pc_number: next, is_faulty: false, fault_note: '' }))
    window.setTimeout(() => pcInputRef.current?.focus(), 50)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!selectedLabId) {
      setFormError('Pilih laboratorium terlebih dahulu.')
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
      toast.success(`${payload.pc_number} tersimpan pada ${selectedLab?.name ?? 'lab'}.`)
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
      toast.success('Catatan audit diperbarui.')
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
      toast.success('Catatan audit dihapus.')
      if (selectedLabId) await loadAudits(selectedLabId, true)
      await loadBootstrap(selectedLabId)
    } catch (caught) {
      toast.error(firstError(caught))
    }
  }

  if (loading) return <PageLoader label="Memuat data audit…" />
  if (error) return <ErrorState message={error} onRetry={() => void loadBootstrap()} />

  const selectedSpec = specs.find((spec) => String(spec.id) === form.master_pc_spec_id)
  const suggested = selectedLab ? suggestNextPc('', audits, selectedLab.capacity) : ''

  return (
    <>
      <PageHead
        eyebrow="Inventaris & standby"
        title="Audit PC cepat"
        description="Pilih lab, masukkan nomor PC, lalu simpan dan lanjut ke unit berikutnya tanpa mengulang pemilihan lab."
        actions={
          <span className={`connection-pill ${online ? 'online' : 'offline'}`}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {online ? 'Online — siap menyimpan' : 'Offline — simpan dinonaktifkan'}
          </span>
        }
      />

      <section className="lab-picker card">
        <div className="card-head compact">
          <div>
            <h2 className="card-title">Pilih laboratorium</h2>
            <p className="card-sub">Progres dihitung terhadap kapasitas PC target dari Admin.</p>
          </div>
          <Badge tone="info">{labs.length} lab aktif</Badge>
        </div>
        <div className="lab-picker-grid">
          {labs.map((lab) => (
            <button
              key={lab.id}
              type="button"
              className={`lab-pick ${lab.id === selectedLabId ? 'active' : ''}`}
              onClick={() => setSelectedLabId(lab.id)}
            >
              <div className="lab-pick-top">
                <span>{lab.name}</span>
                <strong>{number(lab.progress_percent, 0)}%</strong>
              </div>
              <ProgressBar value={lab.progress_percent} height={5} tone={lab.not_audited ? 'warning' : 'accent'} />
              <div className="lab-pick-foot">
                <span>
                  {lab.audited_count}/{lab.capacity} PC
                </span>
                {lab.not_audited ? <Badge tone="neutral">Belum diaudit</Badge> : lab.faulty_count > 0 ? <Badge tone="danger">{lab.faulty_count} rusak</Badge> : <span className="muted">Terdata</span>}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="audit-layout">
        <section className="card audit-form-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Input unit · {selectedLab?.name ?? 'Pilih lab'}</h2>
              <p className="card-sub">
                {selectedLab
                  ? `${selectedLab.audited_count} dari ${selectedLab.capacity} PC sudah diaudit · ${remaining} tersisa`
                  : 'Belum ada laboratorium yang dipilih.'}
              </p>
            </div>
            <div className="progress-ring-small" aria-label={`Progres ${number(progress, 1)} persen`}>
              <svg viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#edf1ee" strokeWidth="4" />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="#3f725c"
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
              <WifiOff size={15} /> Koneksi terputus. Audit baru tidak dapat disimpan sampai koneksi kembali.
            </div>
          )}

          <form onSubmit={handleSubmit} className="audit-form">
            <FormField label="Nomor PC" htmlFor="pcNumber" hint={suggested ? `Saran berikutnya: ${suggested}` : undefined}>
              <div className="input-icon-wrap">
                <Monitor size={16} />
                <input
                  id="pcNumber"
                  ref={pcInputRef}
                  className="input"
                  value={form.pc_number}
                  onChange={(event) => setForm({ ...form, pc_number: event.target.value })}
                  placeholder={suggested || 'Contoh: PC-19'}
                  autoComplete="off"
                  required
                />
              </div>
            </FormField>

            <FormField
              label="Spesifikasi perangkat"
              htmlFor="pcSpec"
              hint={selectedSpec ? `Watt standby: ${number(selectedSpec.standby_watt, 2)} W` : 'Pilih kombinasi RAM dan penyimpanan.'}
            >
              <select
                id="pcSpec"
                className="input"
                value={form.master_pc_spec_id}
                onChange={(event) => setForm({ ...form, master_pc_spec_id: event.target.value })}
                required
              >
                <option value="">Pilih spesifikasi…</option>
                {specs.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.label} · {number(spec.standby_watt, 2)} W standby
                  </option>
                ))}
              </select>
            </FormField>

            <label className={`fault-toggle ${form.is_faulty ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={form.is_faulty}
                onChange={(event) => setForm({ ...form, is_faulty: event.target.checked })}
              />
              <span className="fault-toggle-box">{form.is_faulty && <CheckCircle2 size={14} />}</span>
              <span>
                <strong>Tandai unit bermasalah</strong>
                <small>Audit tetap dapat dilanjutkan ke unit berikutnya.</small>
              </span>
              <AlertTriangle size={17} className="fault-toggle-icon" />
            </label>

            {form.is_faulty && (
              <FormField label="Catatan gangguan" htmlFor="faultNote" hint="Opsional, misalnya tidak menyala stabil atau layar bermasalah.">
                <textarea
                  id="faultNote"
                  className="input textarea"
                  rows={3}
                  value={form.fault_note}
                  onChange={(event) => setForm({ ...form, fault_note: event.target.value })}
                  placeholder="Deskripsi singkat kondisi unit…"
                />
              </FormField>
            )}

            {formError && (
              <div className="inline-error" role="alert">
                {formError}
              </div>
            )}

            <button className="btn btn-primary btn-block" type="submit" disabled={saving || !online || !selectedLab}>
              {saving ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />}
              {saving ? 'Menyimpan…' : 'Simpan & Lanjut PC Berikutnya'}
            </button>

            <p className="form-footnote">
              Data langsung disimpan ke server kampus. Pemilihan lab tetap aktif setelah penyimpanan.
            </p>
          </form>
        </section>

        <section className="card audit-list-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Catatan audit · {selectedLab?.name ?? '—'}</h2>
              <p className="card-sub">Audit terbaru pada lab ini. Admin dapat mengoreksi entri.</p>
            </div>
            <Badge tone="neutral">{number(audits.length)} entri</Badge>
          </div>

          <div className="toolbar">
            <div className="input-icon-wrap toolbar-search">
              <Search size={15} />
              <input
                className="input input-sm"
                placeholder="Cari nomor PC, spesifikasi, atau auditor…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {isAdmin && <span className="toolbar-note">Mode admin: koreksi & hapus tersedia.</span>}
          </div>

          {loadingAudits ? (
            <PageLoader label="Memuat catatan audit…" />
          ) : filteredAudits.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={22} />}
              title={audits.length === 0 ? 'Belum ada audit di lab ini' : 'Tidak ada hasil pencarian'}
              description={
                audits.length === 0
                  ? 'Mulai dari form di samping. Entri pertama akan muncul di sini.'
                  : 'Coba kata kunci lain atau kosongkan pencarian.'
              }
            />
          ) : (
            <div className="table-wrap audit-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PC</th>
                    <th>Spesifikasi</th>
                    <th>Auditor</th>
                    <th>Waktu</th>
                    <th>Kondisi</th>
                    {isAdmin && <th aria-label="Aksi" />}
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.map((audit) => (
                    <tr key={audit.id}>
                      <td className="cell-strong">{audit.pc_number}</td>
                      <td>
                        <div>{audit.spec.label}</div>
                        <div className="cell-muted">{number(audit.spec.standby_watt, 2)} W standby</div>
                      </td>
                      <td>{audit.auditor?.name ?? '—'}</td>
                      <td>
                        <div>{dateTime(audit.audited_at)}</div>
                        <div className="cell-muted">{relativeTime(audit.audited_at)}</div>
                      </td>
                      <td>
                        {audit.is_faulty ? <Badge tone="danger">Bermasalah</Badge> : <Badge tone="success" dot>Normal</Badge>}
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn icon-btn-sm" onClick={() => openEdit(audit)} aria-label={`Koreksi ${audit.pc_number}`}>
                              <Pencil size={14} />
                            </button>
                            <button className="icon-btn icon-btn-sm danger" onClick={() => void handleDelete(audit)} aria-label={`Hapus ${audit.pc_number}`}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Modal
        open={editing !== null}
        title={`Koreksi ${editing?.pc_number ?? ''}`}
        subtitle="Perubahan dicatat sebagai koreksi Admin pada entri audit yang sudah tersimpan."
        onClose={() => setEditing(null)}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>
              Batal
            </button>
            <button className="btn btn-primary" type="submit" form="editAuditForm" disabled={savingEdit}>
              {savingEdit ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}
              Simpan koreksi
            </button>
          </>
        }
      >
        <form id="editAuditForm" className="form-stack" onSubmit={handleEditSubmit}>
          <FormField label="Nomor PC" htmlFor="editPcNumber">
            <input
              id="editPcNumber"
              className="input"
              value={editForm.pc_number}
              onChange={(event) => setEditForm({ ...editForm, pc_number: event.target.value })}
              required
            />
          </FormField>
          <FormField label="Spesifikasi" htmlFor="editPcSpec">
            <select
              id="editPcSpec"
              className="input"
              value={editForm.master_pc_spec_id}
              onChange={(event) => setEditForm({ ...editForm, master_pc_spec_id: event.target.value })}
              required
            >
              {specs.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.label} · {number(spec.standby_watt, 2)} W
                </option>
              ))}
            </select>
          </FormField>
          <label className={`fault-toggle ${editForm.is_faulty ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={editForm.is_faulty}
              onChange={(event) => setEditForm({ ...editForm, is_faulty: event.target.checked })}
            />
            <span className="fault-toggle-box">{editForm.is_faulty && <CheckCircle2 size={14} />}</span>
            <span>
              <strong>Unit bermasalah</strong>
              <small>Status kondisi unit pada catatan ini.</small>
            </span>
          </label>
          {editForm.is_faulty && (
            <FormField label="Catatan gangguan" htmlFor="editFaultNote">
              <textarea
                id="editFaultNote"
                className="input textarea"
                rows={3}
                value={editForm.fault_note}
                onChange={(event) => setEditForm({ ...editForm, fault_note: event.target.value })}
              />
            </FormField>
          )}
          {editError && <div className="inline-error">{editError}</div>}
        </form>
      </Modal>
    </>
  )
}
