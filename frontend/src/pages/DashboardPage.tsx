import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Clock,
  Gauge,
  Leaf,
  Monitor,
  RefreshCw,
  Wallet,
  Zap,
} from 'lucide-react'
import { api, firstError } from '../lib/api'
import { compactRupiah, dateTime, number, panelStatusTone, relativeTime, rupiah } from '../lib/format'
import type { AdminDashboard } from '../types'
import { Badge, ErrorState, PageHead, PageLoader, ProgressBar, StatCard } from '../components/ui'

export default function DashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

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

  if (!data && !error) return <PageLoader label="Memuat ringkasan laboratorium…" />
  if (!data) return <ErrorState message={error} onRetry={() => void load()} />

  const { totals, parameters } = data
  const attention = totals.panel_warnings + totals.pending_incidents

  return (
    <>
      <PageHead
        eyebrow="Pemantauan energi"
        title="Ringkasan enam laboratorium"
        description="Status audit, estimasi energi standby, dan peringatan operasional dalam satu tampilan."
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => void load()} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              Perbarui
            </button>
            <Link className="btn btn-primary" to="/audit">
              <ClipboardList size={16} />
              Audit PC
            </Link>
          </>
        }
      />

      <div className="info-banner">
        <Zap size={17} />
        <div>
          <strong>Angka energi dan biaya adalah estimasi.</strong> Dihitung dari watt standby hasil audit ×{' '}
          {number(parameters.standby_hours_per_day, 0)} jam × {number(parameters.standby_days_per_month, 0)} hari,
          bukan pembacaan meter PLN. Diperbarui {dateTime(totals ? data.generated_at : null)}.
        </div>
        <Badge tone="info">Estimasi</Badge>
      </div>

      <section className="stats-grid">
        <StatCard
          icon={<Monitor size={19} />}
          label="PC diaudit"
          value={
            <>
              {number(totals.audited)} <span className="stat-value-sub">/ {number(totals.pc_target)}</span>
            </>
          }
          meta={`${number(totals.progress_percent, 1)}% dari target · ${totals.labs} lab`}
          tone="accent"
        />
        <StatCard
          icon={<Zap size={19} />}
          label="Energi standby"
          value={
            <>
              {number(totals.kwh_per_month, 2)} <span className="stat-value-sub">kWh</span>
            </>
          }
          meta={`${number(totals.emission_kg_per_month, 2)} kg CO₂e / bulan`}
          tone="blue"
        />
        <StatCard
          icon={<Wallet size={19} />}
          label="Estimasi biaya standby"
          value={rupiah(totals.cost_per_month)}
          meta={`Tarif Rp ${number(parameters.tariff_per_kwh, 2)} / kWh`}
          tone="amber"
        />
        <StatCard
          icon={<AlertTriangle size={19} />}
          label="Perlu perhatian"
          value={number(attention)}
          meta={`${totals.panel_warnings} panel · ${totals.pending_incidents} insiden terbuka`}
          tone={attention > 0 ? 'red' : 'accent'}
        />
      </section>

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Status laboratorium</h2>
                <p className="card-sub">Progres audit PC dan estimasi energi standby per lab.</p>
              </div>
              <Link className="text-link" to="/audit">
                Kelola audit <ArrowRight size={14} />
              </Link>
            </div>

            <div className="labs-grid">
              {data.labs.map((lab) => (
                <Link className="lab-card" to={`/audit?lab=${lab.id}`} key={lab.id}>
                  <div className="lab-card-head">
                    <div>
                      <div className="lab-name">{lab.name}</div>
                      <div className="lab-location">{lab.location || 'Lokasi belum diisi'}</div>
                    </div>
                    <Badge tone={lab.not_audited ? 'neutral' : 'success'} dot>
                      {lab.not_audited ? 'Belum diaudit' : `${number(lab.progress_percent, 1)}%`}
                    </Badge>
                  </div>

                  <ProgressBar
                    value={lab.progress_percent}
                    tone={lab.not_audited ? 'warning' : lab.progress_percent >= 80 ? 'success' : 'accent'}
                  />

                  <div className="lab-metrics">
                    <div>
                      <span>Audit</span>
                      <strong>
                        {lab.audited_count}/{lab.capacity}
                      </strong>
                    </div>
                    <div>
                      <span>Energi</span>
                      <strong>{number(lab.energy.kwh_per_month, 2)} kWh</strong>
                    </div>
                    <div>
                      <span>Biaya</span>
                      <strong>{compactRupiah(lab.energy.cost_per_month)}</strong>
                    </div>
                  </div>

                  <div className="lab-card-foot">
                    <span>{lab.not_audited ? 'Belum ada catatan audit' : `Terakhir ${relativeTime(lab.latest_audit_at)}`}</span>
                    {lab.faulty_count > 0 && <Badge tone="danger">{lab.faulty_count} unit bermasalah</Badge>}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Audit terbaru</h2>
                <p className="card-sub">Delapan catatan terakhir dari seluruh laboratorium.</p>
              </div>
              <Link className="text-link" to="/audit">
                Lihat semua <ArrowRight size={14} />
              </Link>
            </div>

            {data.recent_audits.length === 0 ? (
              <div className="empty-inline">Belum ada audit PC yang tercatat.</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PC</th>
                      <th>Lab</th>
                      <th>Spesifikasi</th>
                      <th>Auditor</th>
                      <th>Waktu</th>
                      <th>Kondisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_audits.map((audit) => (
                      <tr key={audit.id}>
                        <td className="cell-strong">{audit.pc_number}</td>
                        <td>{audit.lab_name}</td>
                        <td className="cell-muted">{audit.spec.label}</td>
                        <td>{audit.auditor?.name ?? '—'}</td>
                        <td className="cell-muted">{dateTime(audit.audited_at)}</td>
                        <td>
                          {audit.is_faulty ? <Badge tone="danger">Bermasalah</Badge> : <Badge tone="success" dot>Normal</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="dashboard-side">
          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Peringatan panel</h2>
                <p className="card-sub">Beban manual/estimasi terhadap batas.</p>
              </div>
              <Badge tone={data.panels.summary.warnings > 0 ? 'warning' : 'success'}>
                {data.panels.summary.warnings}
              </Badge>
            </div>

            {data.panels.warnings.length === 0 ? (
              <div className="empty-inline">Tidak ada peringatan panel saat ini.</div>
            ) : (
              <div className="warning-list">
                {data.panels.warnings.map((warning) => (
                  <Link to="/panels" className="warning-item" key={`${warning.lab_room_id}-${warning.group_type}`}>
                    <div className={`warning-icon warning-${panelStatusTone(warning.status)}`}>
                      <Gauge size={16} />
                    </div>
                    <div className="warning-copy">
                      <strong>
                        {warning.lab_name} · {warning.group_label}
                      </strong>
                      <span>
                        {warning.load_watt !== null ? `${number(warning.load_watt)} W` : 'Belum ada data'} ·{' '}
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

          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Insiden terbaru</h2>
                <p className="card-sub">Laporan fasilitas yang perlu ditangani.</p>
              </div>
              <Link className="text-link" to="/panels">
                Feed <ArrowRight size={14} />
              </Link>
            </div>

            {data.incidents.length === 0 ? (
              <div className="empty-inline">Belum ada laporan insiden.</div>
            ) : (
              <div className="incident-mini-list">
                {data.incidents.slice(0, 5).map((incident) => (
                  <div className="incident-mini" key={incident.id}>
                    <div className="incident-mini-top">
                      <Badge
                        tone={
                          incident.status === 'BARU'
                            ? 'info'
                            : incident.status === 'DITINJAU'
                              ? 'warning'
                              : incident.status === 'DALAM_PENANGANAN'
                                ? 'accent'
                                : 'success'
                        }
                      >
                        {incident.status_label}
                      </Badge>
                      <span>{relativeTime(incident.created_at)}</span>
                    </div>
                    <strong>{incident.lab_name}</strong>
                    <p>{incident.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card param-card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Parameter kalkulasi</h2>
                <p className="card-sub">Berlaku untuk estimasi yang ditampilkan.</p>
              </div>
              <Clock size={16} className="card-head-icon" />
            </div>
            <dl className="param-list">
              <div>
                <dt><Zap size={14} /> Jam standby</dt>
                <dd>{number(parameters.standby_hours_per_day, 0)} jam/hari</dd>
              </div>
              <div>
                <dt><Clock size={14} /> Hari per bulan</dt>
                <dd>{number(parameters.standby_days_per_month, 0)} hari</dd>
              </div>
              <div>
                <dt><Wallet size={14} /> Tarif listrik</dt>
                <dd>Rp {number(parameters.tariff_per_kwh, 2)}/kWh</dd>
              </div>
              <div>
                <dt><Leaf size={14} /> Faktor emisi</dt>
                <dd>{number(parameters.emission_factor_kg_per_kwh, 2)} kg/kWh</dd>
              </div>
            </dl>
            <div className="data-note">Dihitung pada {dateTime(data.generated_at)}.</div>
          </section>
        </aside>
      </div>
    </>
  )
}
