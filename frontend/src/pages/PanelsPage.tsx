import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Gauge,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Zap,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../components/ToastProvider'
import { LoadBar } from '../components/Charts'
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
import {
  dateTime,
  incidentStatusTone,
  nextIncidentStatus,
  number,
  panelStatusTone,
  relativeTime,
} from '../lib/format'
import type { Incident, IncidentStatus, PanelOverview, PanelStatus } from '../types'

type Filter = 'ALL' | IncidentStatus

const statusTabs: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'BARU', label: 'Baru' },
  { value: 'DITINJAU', label: 'Ditinjau' },
  { value: 'DALAM_PENANGANAN', label: 'Dalam Penanganan' },
  { value: 'SELESAI', label: 'Selesai' },
]

interface ReadingForm {
  load_watt: string
  source: string
  notes: string
}

interface LimitForm {
  limit_ampere: string
  voltage: string
  warning_percent: string
}

export default function PanelsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const toast = useToast()

  const [overview, setOverview] = useState<PanelOverview | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [pollSeconds, setPollSeconds] = useState(3)
  const [lastPoll, setLastPoll] = useState<string | null>(null)
  const lastSync = useRef<string | null>(null)

  const [readingTarget, setReadingTarget] = useState<PanelStatus | null>(null)
  const [readingForm, setReadingForm] = useState<ReadingForm>({ load_watt: '', source: 'MANUAL_ESTIMATE', notes: '' })
  const [readingError, setReadingError] = useState('')
  const [savingReading, setSavingReading] = useState(false)

  const [limitTarget, setLimitTarget] = useState<PanelStatus | null>(null)
  const [limitForm, setLimitForm] = useState<LimitForm>({ limit_ampere: '', voltage: '220', warning_percent: '80' })
  const [limitError, setLimitError] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ lab_room_id: '', description: '' })
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const [statusTarget, setStatusTarget] = useState<Incident | null>(null)
  const [statusNote, setStatusNote] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const response = await api.get<PanelOverview & { parameters: { incident_poll_seconds: number } }>('/panel-limits')
      setOverview(response)
      setPollSeconds(Math.max(3, response.parameters?.incident_poll_seconds ?? 3))
      setError('')
    } catch (caught) {
      setError(firstError(caught))
    } finally {
      setRefreshing(false)
    }
  }, [])

  const loadIncidents = useCallback(async (since?: string) => {
    const response = await api.get<{ data: Incident[]; server_time: string }>('/incidents', {
      per_page: 100,
      updated_after: since,
    })
    if (since) {
      setIncidents((current) => {
        const map = new Map(current.map((incident) => [incident.id, incident]))
        for (const incident of response.data) map.set(incident.id, incident)
        return [...map.values()].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      })
    } else {
      setIncidents(response.data)
    }
    lastSync.current = response.server_time
    setLastPoll(response.server_time)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([loadOverview(), loadIncidents()])
      .catch((caught) => {
        if (active) setError(firstError(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadOverview, loadIncidents])

  useEffect(() => {
    if (!overview) return
    const interval = Math.max(3, pollSeconds) * 1000
    const timer = window.setInterval(() => {
      void loadIncidents(lastSync.current ?? undefined).catch(() => undefined)
    }, interval)
    return () => window.clearInterval(timer)
  }, [overview, pollSeconds, loadIncidents])

  const counts = useMemo(() => {
    const result: Record<IncidentStatus, number> = { BARU: 0, DITINJAU: 0, DALAM_PENANGANAN: 0, SELESAI: 0 }
    for (const incident of incidents) result[incident.status] += 1
    return result
  }, [incidents])

  const filteredIncidents = useMemo(
    () => (filter === 'ALL' ? incidents : incidents.filter((incident) => incident.status === filter)),
    [incidents, filter],
  )

  function openReading(panel: PanelStatus) {
    setReadingTarget(panel)
    setReadingForm({
      load_watt: panel.load_watt !== null ? String(panel.load_watt) : '',
      source: 'MANUAL_ESTIMATE',
      notes: '',
    })
    setReadingError('')
  }

  async function handleReadingSubmit(event: FormEvent) {
    event.preventDefault()
    if (!readingTarget) return
    setSavingReading(true)
    setReadingError('')
    try {
      await api.post('/panel-readings', {
        lab_room_id: readingTarget.lab_room_id,
        group_type: readingTarget.group_type,
        load_watt: Number(readingForm.load_watt),
        source: readingForm.source,
        notes: readingForm.notes.trim() || null,
      })
      toast.success('Beban panel diperbarui. Nilai ditandai sebagai estimasi/pengukuran manual.')
      setReadingTarget(null)
      await loadOverview(true)
    } catch (caught) {
      setReadingError(firstError(caught))
    } finally {
      setSavingReading(false)
    }
  }

  function openLimit(panel: PanelStatus) {
    setLimitTarget(panel)
    setLimitForm({
      limit_ampere: String(panel.limit_ampere),
      voltage: String(panel.voltage),
      warning_percent: String(panel.warning_percent),
    })
    setLimitError('')
  }

  async function handleLimitSubmit(event: FormEvent) {
    event.preventDefault()
    if (!limitTarget) return
    setSavingLimit(true)
    setLimitError('')
    try {
      await api.patch(`/panel-limits/${limitTarget.panel_limit_id}`, {
        limit_ampere: Number(limitForm.limit_ampere),
        voltage: Number(limitForm.voltage),
        warning_percent: Number(limitForm.warning_percent),
      })
      toast.success('Batas panel diperbarui.')
      setLimitTarget(null)
      await loadOverview(true)
    } catch (caught) {
      setLimitError(firstError(caught))
    } finally {
      setSavingLimit(false)
    }
  }

  async function handleCreateIncident(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const response = await api.post<{ data: Incident }>('/incidents', {
        lab_room_id: Number(createForm.lab_room_id),
        description: createForm.description.trim(),
      })
      setIncidents((current) => [response.data, ...current])
      setCreateOpen(false)
      setCreateForm({ lab_room_id: '', description: '' })
      toast.success('Laporan insiden dikirim ke feed Maintenance.')
    } catch (caught) {
      setCreateError(firstError(caught))
    } finally {
      setCreating(false)
    }
  }

  function openStatus(incident: Incident) {
    setStatusTarget(incident)
    setStatusNote('')
    setStatusError('')
  }

  async function handleStatusSubmit(event: FormEvent) {
    event.preventDefault()
    if (!statusTarget) return
    const next = nextIncidentStatus[statusTarget.status]
    if (!next) return
    setSavingStatus(true)
    setStatusError('')
    try {
      const response = await api.patch<{ data: Incident }>(`/incidents/${statusTarget.id}/status`, {
        status: next.value,
        note: statusNote.trim() || null,
      })
      setIncidents((current) => current.map((incident) => (incident.id === response.data.id ? response.data : incident)))
      setStatusTarget(null)
      toast.success(`Insiden diperbarui menjadi ${next.label}.`)
    } catch (caught) {
      setStatusError(firstError(caught))
    } finally {
      setSavingStatus(false)
    }
  }

  if (loading) return <PageLoader label="Memuat panel dan feed insiden…" />
  if (error || !overview) return <ErrorState message={error || 'Data panel tidak tersedia.'} onRetry={() => void loadOverview()} />

  const nextForTarget = statusTarget ? nextIncidentStatus[statusTarget.status] : null

  return (
    <>
      <PageHead
        eyebrow="Operasional fasilitas"
        title="Panel listrik & insiden"
        description="Pantau beban grup stopkontak dan AC, lalu tindak lanjuti laporan insiden laboratorium."
        actions={
          <>
            <span className="live-pill">
              <span className="live-dot" /> Feed tiap {pollSeconds} detik
            </span>
            <button className="btn btn-secondary" onClick={() => void loadOverview()} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              Perbarui
            </button>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Buat laporan
              </button>
            )}
          </>
        }
      />

      <div className="info-banner amber">
        <AlertTriangle size={17} />
        <div>
          <strong>Beban panel adalah data manual/estimasi.</strong> Sistem tidak memiliki sensor arus real-time; setiap
          nilai menampilkan sumber dan waktu pencatatan. Ambang peringatan dapat diatur per panel.
        </div>
        <Badge tone="warning">Bukan real-time</Badge>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Kondisi panel per laboratorium</h2>
            <p className="card-sub">
              Batas stopkontak 10 A (2.200 W) dan AC 40 A (8.800 W) pada 220 V menjadi acuan awal; nilai aktual dapat
              diatur Admin.
            </p>
          </div>
          <div className="card-head-badges">
            <Badge tone={overview.summary.warnings > 0 ? 'warning' : 'success'}>
              {overview.summary.warnings} peringatan
            </Badge>
            <Badge tone="neutral">{overview.summary.unavailable} belum ada data</Badge>
          </div>
        </div>

        <div className="panel-lab-grid">
          {overview.labs.map((lab) => (
            <div className="panel-lab" key={lab.id}>
              <div className="panel-lab-head">
                <div>
                  <strong>{lab.name}</strong>
                  <span>{lab.location || 'Lokasi belum diisi'}</span>
                </div>
                <Gauge size={17} />
              </div>

              {lab.panels.map((panel) => {
                const tone = panelStatusTone(panel.status)
                const loadTone =
                  panel.status === 'OVER' ? 'over' : panel.status === 'WARNING' ? 'warning' : panel.status === 'UNAVAILABLE' ? 'empty' : 'normal'

                return (
                  <div className={`panel-group panel-group-${tone}`} key={panel.panel_limit_id}>
                    <div className="panel-group-head">
                      <div>
                        <span className="panel-group-name">{panel.group_label}</span>
                        <span className="panel-group-limit">
                          Batas {number(panel.limit_ampere, 0)} A · {number(panel.limit_watt)} W
                        </span>
                      </div>
                      <Badge tone={tone}>{panel.status_label}</Badge>
                    </div>

                    <div className="panel-load">
                      <LoadBar percent={panel.percent ?? 0} tone={loadTone} />
                      <div className="panel-load-meta">
                        <span>
                          {panel.load_watt !== null ? `${number(panel.load_watt)} W` : 'Belum ada data beban'}
                        </span>
                        <strong>{panel.percent !== null ? `${number(panel.percent, 1)}%` : '—'}</strong>
                      </div>
                    </div>

                    <div className="panel-source">
                      {panel.recorded_at ? (
                        <span>
                          {panel.source_label ?? 'Estimasi manual'} · {dateTime(panel.recorded_at)}
                        </span>
                      ) : (
                        <span>Input manual diperlukan untuk menghitung persentase.</span>
                      )}
                    </div>

                    <div className="panel-actions">
                      <button className="btn btn-ghost btn-xs" onClick={() => openReading(panel)}>
                        <Pencil size={13} />
                        Input beban
                      </button>
                      {isAdmin && (
                        <button className="btn btn-ghost btn-xs" onClick={() => openLimit(panel)}>
                          <Gauge size={13} />
                          Atur batas
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="data-note">{overview.data_note}</div>
      </section>

      <section className="card incident-card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Feed insiden</h2>
            <p className="card-sub">
              Laporan Admin muncul otomatis pada feed Maintenance. Pembaruan terakhir {relativeTime(lastPoll)}.
            </p>
          </div>
          <Badge tone="info">{incidents.filter((incident) => incident.status !== 'SELESAI').length} terbuka</Badge>
        </div>

        <div className="tab-row" role="tablist" aria-label="Filter status insiden">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={filter === tab.value}
              className={`tab ${filter === tab.value ? 'active' : ''}`}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
              {tab.value !== 'ALL' && <span className="tab-count">{counts[tab.value]}</span>}
            </button>
          ))}
        </div>

        {filteredIncidents.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={22} />}
            title={filter === 'ALL' ? 'Belum ada insiden' : 'Tidak ada insiden pada status ini'}
            description={filter === 'ALL' ? 'Laporan baru dari Admin akan muncul di sini secara otomatis.' : 'Pilih status lain untuk melihat laporan.'}
          />
        ) : (
          <div className="incident-feed">
            {filteredIncidents.map((incident) => {
              const next = nextIncidentStatus[incident.status]
              return (
                <article className={`incident-item incident-${incidentStatusTone(incident.status)}`} key={incident.id}>
                  <div className="incident-status-rail" />
                  <div className="incident-main">
                    <div className="incident-top">
                      <div className="incident-title">
                        <strong>{incident.lab_name}</strong>
                        <Badge tone={incidentStatusTone(incident.status)} dot>
                          {incident.status_label}
                        </Badge>
                      </div>
                      <span className="incident-time">
                        <Clock size={13} /> {relativeTime(incident.created_at)}
                      </span>
                    </div>
                    <p className="incident-desc">{incident.description}</p>
                    {incident.status_note && <div className="incident-note">Catatan: {incident.status_note}</div>}
                    <div className="incident-foot">
                      <span>
                        Dilaporkan {incident.reporter?.name ?? 'Admin'} · {dateTime(incident.created_at)}
                      </span>
                      <div className="incident-actions">
                        {incident.status_updated_by && (
                          <span className="muted">Ditangani {incident.status_updated_by.name}</span>
                        )}
                        {next && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openStatus(incident)}>
                            {next.action}
                            <ArrowRight size={14} />
                          </button>
                        )}
                        {incident.status === 'SELESAI' && (
                          <span className="resolved-label">
                            <CheckCircle2 size={14} /> Selesai {relativeTime(incident.resolved_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <Modal
        open={readingTarget !== null}
        title={`Input beban · ${readingTarget?.lab_name ?? ''}`}
        subtitle={`${readingTarget?.group_label ?? ''} · batas ${number(readingTarget?.limit_watt ?? 0)} W`}
        onClose={() => setReadingTarget(null)}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setReadingTarget(null)}>
              Batal
            </button>
            <button className="btn btn-primary" type="submit" form="readingForm" disabled={savingReading}>
              {savingReading ? <LoaderCircle size={16} className="spin" /> : <Zap size={16} />}
              Simpan beban
            </button>
          </>
        }
      >
        <form id="readingForm" className="form-stack" onSubmit={handleReadingSubmit}>
          <FormField label="Beban (watt)" htmlFor="loadWatt" hint="Gunakan hasil pengukuran manual atau estimasi yang dapat dijelaskan.">
            <input
              id="loadWatt"
              className="input"
              type="number"
              min="0"
              step="1"
              value={readingForm.load_watt}
              onChange={(event) => setReadingForm({ ...readingForm, load_watt: event.target.value })}
              required
            />
          </FormField>
          <FormField label="Sumber data" htmlFor="loadSource">
            <select
              id="loadSource"
              className="input"
              value={readingForm.source}
              onChange={(event) => setReadingForm({ ...readingForm, source: event.target.value })}
            >
              <option value="MANUAL_ESTIMATE">Estimasi manual</option>
              <option value="MANUAL_MEASUREMENT">Pengukuran manual (mis. tang ampere)</option>
            </select>
          </FormField>
          <FormField label="Catatan" htmlFor="loadNotes" hint="Opsional: kondisi pemakaian, waktu, atau metode estimasi.">
            <textarea
              id="loadNotes"
              className="input textarea"
              rows={3}
              value={readingForm.notes}
              onChange={(event) => setReadingForm({ ...readingForm, notes: event.target.value })}
            />
          </FormField>
          {readingError && <div className="inline-error">{readingError}</div>}
        </form>
      </Modal>

      <Modal
        open={limitTarget !== null}
        title={`Atur batas · ${limitTarget?.lab_name ?? ''}`}
        subtitle={limitTarget?.group_label}
        onClose={() => setLimitTarget(null)}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setLimitTarget(null)}>
              Batal
            </button>
            <button className="btn btn-primary" type="submit" form="limitForm" disabled={savingLimit}>
              {savingLimit ? <LoaderCircle size={16} className="spin" /> : <Gauge size={16} />}
              Simpan batas
            </button>
          </>
        }
      >
        <form id="limitForm" className="form-stack" onSubmit={handleLimitSubmit}>
          <div className="form-row">
            <FormField label="Batas arus (A)" htmlFor="limitAmpere">
              <input
                id="limitAmpere"
                className="input"
                type="number"
                min="0.1"
                step="0.1"
                value={limitForm.limit_ampere}
                onChange={(event) => setLimitForm({ ...limitForm, limit_ampere: event.target.value })}
                required
              />
            </FormField>
            <FormField label="Tegangan (V)" htmlFor="limitVoltage">
              <input
                id="limitVoltage"
                className="input"
                type="number"
                min="100"
                max="400"
                step="1"
                value={limitForm.voltage}
                onChange={(event) => setLimitForm({ ...limitForm, voltage: event.target.value })}
                required
              />
            </FormField>
          </div>
          <FormField label="Ambang peringatan (%)" htmlFor="limitWarning" hint="Nilai default awal 80%; dapat diubah Admin.">
            <input
              id="limitWarning"
              className="input"
              type="number"
              min="1"
              max="100"
              value={limitForm.warning_percent}
              onChange={(event) => setLimitForm({ ...limitForm, warning_percent: event.target.value })}
              required
            />
          </FormField>
          <div className="calc-preview">
            Batas daya = {number(Number(limitForm.limit_ampere || 0) * Number(limitForm.voltage || 0))} W.
            Peringatan muncul pada {number(Number(limitForm.warning_percent || 0))}% dari batas.
          </div>
          {limitError && <div className="inline-error">{limitError}</div>}
        </form>
      </Modal>

      <Modal
        open={createOpen}
        title="Buat laporan insiden"
        subtitle="Laporan akan muncul pada feed Maintenance melalui polling otomatis."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setCreateOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" type="submit" form="createIncidentForm" disabled={creating}>
              {creating ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}
              Kirim laporan
            </button>
          </>
        }
      >
        <form id="createIncidentForm" className="form-stack" onSubmit={handleCreateIncident}>
          <FormField label="Laboratorium" htmlFor="incidentLab">
            <select
              id="incidentLab"
              className="input"
              value={createForm.lab_room_id}
              onChange={(event) => setCreateForm({ ...createForm, lab_room_id: event.target.value })}
              required
            >
              <option value="">Pilih lab…</option>
              {overview.labs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name} · {lab.location}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Deskripsi gangguan" htmlFor="incidentDescription" hint="Jelaskan gejala, waktu, dan lokasi bila diketahui.">
            <textarea
              id="incidentDescription"
              className="input textarea"
              rows={4}
              value={createForm.description}
              onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })}
              required
            />
          </FormField>
          {createError && <div className="inline-error">{createError}</div>}
        </form>
      </Modal>

      <Modal
        open={statusTarget !== null}
        title={`Ubah status insiden · ${statusTarget?.lab_name ?? ''}`}
        subtitle={nextForTarget ? `${statusTarget?.status_label} → ${nextForTarget.label}` : undefined}
        onClose={() => setStatusTarget(null)}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setStatusTarget(null)}>
              Batal
            </button>
            <button className="btn btn-primary" type="submit" form="statusForm" disabled={savingStatus}>
              {savingStatus ? <LoaderCircle size={16} className="spin" /> : <CheckCircle2 size={16} />}
              Simpan status
            </button>
          </>
        }
      >
        <form id="statusForm" className="form-stack" onSubmit={handleStatusSubmit}>
          <div className="status-flow">
            {statusTabs.slice(1).map((tab) => (
              <span
                key={tab.value}
                className={
                  tab.value === statusTarget?.status
                    ? 'current'
                    : tab.value === nextForTarget?.value
                      ? 'next'
                      : ''
                }
              >
                {tab.label}
              </span>
            ))}
          </div>
          <FormField label="Catatan penanganan" htmlFor="statusNote" hint="Opsional; akan tampil pada feed insiden.">
            <textarea
              id="statusNote"
              className="input textarea"
              rows={3}
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
              placeholder="Tindakan yang sudah dilakukan…"
            />
          </FormField>
          {statusError && <div className="inline-error">{statusError}</div>}
        </form>
      </Modal>
    </>
  )
}
