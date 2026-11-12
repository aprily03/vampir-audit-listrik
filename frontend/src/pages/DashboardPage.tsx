import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Clock,
  Gauge,
  Leaf,
  LoaderCircle,
  Monitor,
  PlusCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  Wallet,
  Zap,
} from 'lucide-react'
import { api, firstError } from '../lib/api'
import { compactRupiah, dateTime, incidentStatusTone, number, panelStatusTone, relativeTime, rupiah } from '../lib/format'
import type { AdminDashboard } from '../types'
import {
  Badge,
  ErrorState,
  FormField,
  Modal,
  PageHead,
  PageLoader,
  ProgressBar,
  StatCard,
} from '../components/ui'
import { useToast } from '../components/ToastProvider'

export default function DashboardPage() {
  const toast = useToast()
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Incident reporting modal state (UC-05)
  const [incidentModalOpen, setIncidentModalOpen] = useState(false)
  const [incidentLabId, setIncidentLabId] = useState<string>('')
  const [incidentDesc, setIncidentDesc] = useState<string>('')
  const [incidentSubmitting, setIncidentSubmitting] = useState(false)
  const [incidentError, setIncidentError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const response = await api.get<AdminDashboard>('/dashboard')
      setData(response)
      setError('')
    } catch (caught) {
      setError(firstError(caught))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(true), 30000)
    return () => window.clearInterval(timer)
  }, [load])

  async function handleReportIncident(event: FormEvent) {
    event.preventDefault()
    if (!incidentLabId) {
      setIncidentError('Pilih laboratorium yang mengalami gangguan.')
      return
    }
    if (!incidentDesc.trim()) {
      setIncidentError('Isi deskripsi gangguan tegangan atau peralatan listrik.')
      return
    }

    setIncidentSubmitting(true)
    setIncidentError('')
    try {
      await api.post('/incidents', {
        lab_room_id: Number(incidentLabId),
        description: incidentDesc.trim(),
      })
      toast.success('Laporan insiden berhasil dikirim ke Facility Maintenance (< 3s NFR-03).')
      setIncidentModalOpen(false)
      setIncidentDesc('')
      setIncidentLabId('')
      await load(true)
    } catch (caught) {
      setIncidentError(firstError(caught))
    } finally {
      setIncidentSubmitting(false)
    }
  }

  if (!data && !error) return <PageLoader label="Memuat ringkasan enam laboratorium…" />
  if (!data) return <ErrorState message={error} onRetry={() => void load()} />

  const { totals, parameters } = data
  const attention = totals.panel_warnings + totals.pending_incidents

  return (
    <>
      <PageHead
        eyebrow="Dosen Admin Dashboard & Incident Report (UC-04, UC-05)"
        title="Ringkasan Enam Laboratorium"
        description="Pantau audit daya standby 210–240 PC, beban panel listrik MCB, serta kirim laporan gangguan tegangan langsung ke Maintenance."
        actions={
          <div className="head-actions-row">
            <button className="btn btn-secondary" onClick={() => void load()} disabled={refreshing}>
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
              Segarkan
            </button>
            <button className="btn btn-danger" onClick={() => setIncidentModalOpen(true)}>
              <ShieldAlert size={16} />
              Laporkan Gangguan (UC-05)
            </button>
            <Link className="btn btn-primary" to="/audit">
              <ClipboardList size={16} />
              Mulai Audit PC
            </Link>
          </div>
        }
      />

      {/* Quick Action Navigation Strip */}
      <section className="quick-actions" aria-label="Aksi cepat">
        <Link className="quick-action" to="/audit">
          <span className="quick-action-icon">
            <ClipboardList size={20} />
          </span>
          <span className="quick-action-copy">
            <strong>Audit Perangkat</strong>
            <small>Input PC cepat &amp; tandai unit rusak</small>
          </span>
          <ArrowRight size={17} className="quick-action-arrow" />
        </Link>
        <Link className="quick-action" to="/panels">
          <span className="quick-action-icon">
            <Gauge size={20} />
          </span>
          <span className="quick-action-copy">
            <strong>Beban Panel MCB</strong>
            <small>Stopkontak 10 A &amp; AC 40 A</small>
          </span>
          <ArrowRight size={17} className="quick-action-arrow" />
        </Link>
        <button type="button" className="quick-action incident-action" onClick={() => setIncidentModalOpen(true)}>
          <span className="quick-action-icon text-danger">
            <ShieldAlert size={20} />
          </span>
          <span className="quick-action-copy">
            <strong>Lapor Gangguan</strong>
            <small>Kirim insiden instan ke teknisi</small>
          </span>
          <PlusCircle size={17} className="quick-action-arrow" />
        </button>
      </section>

      {/* Estimations Context Banner */}
      <div className="info-banner">
        <Zap size={18} className="text-accent" />
        <div>
          <strong>Dasar Perhitungan Energi Standby Vampir:</strong> Dihitung dari akumulasi watt standby unit diaudit ×{' '}
          {number(parameters.standby_hours_per_day, 0)} jam/hari × {number(parameters.standby_days_per_month, 0)}{' '}
          hari/bulan dengan tarif PLN Rp {number(parameters.tariff_per_kwh, 2)}/kWh. Sinkronisasi data:{' '}
          {dateTime(data.generated_at)}.
        </div>
        <Badge tone="info">Metrik Terpusat</Badge>
      </div>

      {/* Key Metric Highlights */}
      <section className="stats-grid">
        <StatCard
          icon={<Monitor size={20} />}
          label="Total PC Diaudit"
          value={
            <>
              {number(totals.audited)} <span className="stat-value-sub">/ {number(totals.pc_target)} PC</span>
            </>
          }
          meta={`${number(totals.progress_percent, 1)}% selesai · 6 laboratorium aktif`}
          tone="accent"
        />
        <StatCard
          icon={<Zap size={20} />}
          label="Estimasi Energi Terbuang"
          value={
            <>
              {number(totals.kwh_per_month, 2)} <span className="stat-value-sub">kWh/bln</span>
            </>
          }
          meta={`${number(totals.kwh_per_month, 2)} kWh · ${number(totals.emission_kg_per_month, 2)} kg CO₂e`}
          tone="blue"
        />
        <StatCard
          icon={<Wallet size={20} />}
          label="Potensi Kerugian Biaya"
          value={rupiah(totals.cost_per_month)}
          meta={`Estimasi pemborosan daya vampir per bulan`}
          tone="amber"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Perlu Perhatian Tim"
          value={number(attention)}
          meta={`${totals.panel_warnings} panel batas kritis · ${totals.pending_incidents} insiden terbuka`}
          tone={attention > 0 ? 'red' : 'accent'}
        />
      </section>

      <div className="dashboard-layout">
        {/* Main Section: 6 Lab Room Cards & Recent Audits */}
        <div className="dashboard-main">
          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Status Enam Laboratorium Komputer UNKLAB</h2>
                <p className="card-sub">Klik lab untuk melakukan audit atau meninjau unit PC secara spesifik.</p>
              </div>
              <Link className="text-link" to="/audit">
                Buka Konsol Audit <ArrowRight size={14} />
              </Link>
            </div>

            <div className="labs-grid">
              {data.labs.map((lab) => {
                const isComplete = lab.audited_count >= lab.capacity && lab.capacity > 0
                return (
                  <Link className="lab-card" to={`/audit?lab=${lab.id}`} key={lab.id}>
                    <div className="lab-card-head">
                      <div>
                        <div className="lab-name">{lab.name}</div>
                        <div className="lab-location">{lab.location || 'Gedung Laboratorium Komputer'}</div>
                      </div>
                      <Badge tone={lab.not_audited ? 'neutral' : isComplete ? 'success' : 'accent'} dot>
                        {lab.not_audited ? 'Belum Ada Data' : `${number(lab.progress_percent, 1)}%`}
                      </Badge>
                    </div>

                    <ProgressBar
                      value={lab.progress_percent}
                      tone={lab.not_audited ? 'warning' : isComplete ? 'success' : 'accent'}
                    />

                    <div className="lab-metrics">
                      <div>
                        <span>PC Terdata</span>
                        <strong>
                          {lab.audited_count}/{lab.capacity}
                        </strong>
                      </div>
                      <div>
                        <span>Energi Vampir</span>
                        <strong>{number(lab.energy.kwh_per_month, 2)} kWh</strong>
                      </div>
                      <div>
                        <span>Biaya / Bulan</span>
                        <strong>{compactRupiah(lab.energy.cost_per_month)}</strong>
                      </div>
                    </div>

                    <div className="lab-card-foot">
                      <span>
                        {lab.not_audited ? 'Audit belum dimulai' : `Audit terakhir ${relativeTime(lab.latest_audit_at)}`}
                      </span>
                      {lab.faulty_count > 0 && (
                        <Badge tone="danger">{lab.faulty_count} unit rusak/gangguan</Badge>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Recent Audit Stream */}
          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Catatan Audit PC Terkini</h2>
                <p className="card-sub">Entri data audit terbaru yang masuk dari auditor lapangan.</p>
              </div>
              <Link className="text-link" to="/audit">
                Lihat Seluruh Log <ArrowRight size={14} />
              </Link>
            </div>

            {data.recent_audits.length === 0 ? (
              <div className="empty-inline">Belum ada aktivitas audit PC yang tercatat di database.</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nomor PC</th>
                      <th>Laboratorium</th>
                      <th>Spesifikasi RAM &amp; SSD</th>
                      <th>Daya Standby</th>
                      <th>Auditor</th>
                      <th>Waktu Simpan</th>
                      <th>Kondisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_audits.map((audit) => (
                      <tr key={audit.id}>
                        <td className="cell-strong">{audit.pc_number}</td>
                        <td>{audit.lab_name}</td>
                        <td className="cell-muted">{audit.spec.label}</td>
                        <td>
                          <strong>{number(audit.spec.standby_watt, 2)} W</strong>
                        </td>
                        <td>{audit.auditor?.name ?? '—'}</td>
                        <td className="cell-muted">{dateTime(audit.audited_at)}</td>
                        <td>
                          {audit.is_faulty ? (
                            <Badge tone="danger">Rusak / Gangguan</Badge>
                          ) : (
                            <Badge tone="success" dot>
                              Normal
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: Incident Feed & Warnings */}
        <aside className="dashboard-side">
          {/* Incidents Live Feed */}
          <section className="card">
            <div className="card-head">
              <div className="flex-center-gap">
                <ShieldAlert size={18} className="text-danger" />
                <div>
                  <h2 className="card-title">Live Incident Feed</h2>
                  <p className="card-sub">Laporan gangguan tegangan ke Maintenance</p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIncidentModalOpen(true)}
              >
                + Lapor
              </button>
            </div>

            {data.incidents.length === 0 ? (
              <div className="empty-inline">Tidak ada insiden tegangan terbuka saat ini.</div>
            ) : (
              <div className="incident-mini-list">
                {data.incidents.slice(0, 5).map((incident) => (
                  <div className="incident-mini" key={incident.id}>
                    <div className="incident-mini-top">
                      <span className="incident-mini-lab">{incident.lab_name}</span>
                      <Badge tone={incidentStatusTone(incident.status)}>{incident.status_label}</Badge>
                    </div>
                    <p className="incident-mini-desc">{incident.description}</p>
                    <div className="incident-mini-foot">
                      <span>Oleh: {incident.reporter?.name ?? 'Admin'}</span>
                      <span>{relativeTime(incident.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="card-foot-link">
              <Link to="/panels" className="text-link">
                Lihat Manajemen Insiden &amp; Panel <ArrowRight size={14} />
              </Link>
            </div>
          </section>

          {/* Panel Warnings */}
          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Peringatan Beban Panel</h2>
                <p className="card-sub">Beban MCB 10 A (2.200 W) &amp; 40 A (8.800 W)</p>
              </div>
              <Badge tone={data.panels.summary.warnings > 0 ? 'warning' : 'success'}>
                {data.panels.summary.warnings} peringatan
              </Badge>
            </div>

            {data.panels.warnings.length === 0 ? (
              <div className="empty-inline">Semua panel listrik berada dalam batas aman.</div>
            ) : (
              <div className="warning-list">
                {data.panels.warnings.map((warning) => (
                  <Link
                    to="/panels"
                    className="warning-item"
                    key={`${warning.lab_room_id}-${warning.group_type}`}
                  >
                    <div className={`warning-icon warning-${panelStatusTone(warning.status)}`}>
                      <Gauge size={16} />
                    </div>
                    <div className="warning-copy">
                      <strong>
                        {warning.lab_name} · {warning.group_label}
                      </strong>
                      <span>
                        {warning.load_watt !== null ? `${number(warning.load_watt)} W` : 'Belum ada pembacaan'} ·{' '}
                        {warning.percent !== null ? `${number(warning.percent, 1)}%` : '—'} dari batas{' '}
                        {number(warning.limit_watt)} W
                      </span>
                    </div>
                    <Badge tone={panelStatusTone(warning.status)}>{warning.status_label}</Badge>
                  </Link>
                ))}
              </div>
            )}
            <div className="data-note">{data.panels.data_note}</div>
          </section>

          {/* Calculation Parameters Card */}
          <section className="card param-card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Parameter Perhitungan</h2>
                <p className="card-sub">Konfigurasi formula estimasi energi</p>
              </div>
              <Clock size={16} className="card-head-icon" />
            </div>
            <dl className="param-list">
              <div>
                <dt>
                  <Zap size={14} /> Durasi Standby
                </dt>
                <dd>{number(parameters.standby_hours_per_day, 0)} jam/hari</dd>
              </div>
              <div>
                <dt>
                  <Clock size={14} /> Siklus Bulanan
                </dt>
                <dd>{number(parameters.standby_days_per_month, 0)} hari/bulan</dd>
              </div>
              <div>
                <dt>
                  <Wallet size={14} /> Tarif PLN Kampus
                </dt>
                <dd>Rp {number(parameters.tariff_per_kwh, 2)}/kWh</dd>
              </div>
              <div>
                <dt>
                  <Leaf size={14} /> Faktor Emisi CO₂
                </dt>
                <dd>{number(parameters.emission_factor_kg_per_kwh, 2)} kg/kWh</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      {/* Modal: Laporkan Gangguan Tegangan (UC-05) */}
      <Modal
        open={incidentModalOpen}
        onClose={() => setIncidentModalOpen(false)}
        title="Laporkan Gangguan Tegangan (UC-05)"
      >
        <form onSubmit={handleReportIncident} className="modal-form">
          <p className="modal-intro">
            Laporan ini akan diteruskan secara instan ke <strong>Facility Maintenance Live Feed</strong> (&lt; 3
            detik) untuk penanganan segera demi mencegah MCB trip atau kerusakan perangkat.
          </p>

          <FormField label="Pilih Laboratorium Komputer" htmlFor="incidentLabId">
            <select
              id="incidentLabId"
              className="input"
              value={incidentLabId}
              onChange={(e) => setIncidentLabId(e.target.value)}
              required
            >
              <option value="">Pilih laboratorium…</option>
              {data.labs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name} ({lab.location || 'Lab Komputer'})
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Deskripsi Masalah / Gangguan Tegangan"
            htmlFor="incidentDesc"
            hint="Contoh: Tegangan drop ke 190V, stopkontak meja 4 bergetar/korslet, MCB AC trip tiba-tiba saat kelas."
          >
            <textarea
              id="incidentDesc"
              className="input textarea"
              rows={4}
              placeholder="Jelaskan indikasi gangguan atau gejala anomali listrik..."
              value={incidentDesc}
              onChange={(e) => setIncidentDesc(e.target.value)}
              required
            />
          </FormField>

          {incidentError && (
            <div className="login-error" role="alert">
              <AlertCircle size={16} />
              <span>{incidentError}</span>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIncidentModalOpen(false)}
              disabled={incidentSubmitting}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-danger" disabled={incidentSubmitting}>
              {incidentSubmitting ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
              <span>{incidentSubmitting ? 'Mengirim Laporan…' : 'Kirim ke Maintenance Sekarang'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
