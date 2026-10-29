import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  Download,
  FileText,
  Leaf,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../components/ToastProvider'
import { TrendChart } from '../components/Charts'
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
import { api, downloadFile, firstError } from '../lib/api'
import { compactRupiah, dateTime, monthName, number, rupiah } from '../lib/format'
import type { Bill, ExecutiveSummary } from '../types'

interface BillForm {
  period_year: string
  period_month: string
  total_amount: string
  carbon_emission_kg: string
  notes: string
}

const emptyBillForm: BillForm = {
  period_year: String(new Date().getFullYear()),
  period_month: String(new Date().getMonth() + 1),
  total_amount: '',
  carbon_emission_kg: '',
  notes: '',
}

export default function ExecutivePage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const toast = useToast()

  const [data, setData] = useState<ExecutiveSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const [billModalOpen, setBillModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [billForm, setBillForm] = useState<BillForm>(emptyBillForm)
  const [billError, setBillError] = useState('')
  const [savingBill, setSavingBill] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const response = await api.get<ExecutiveSummary>('/reports/executive/summary')
      setData(response)
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

  const chartPoints = useMemo(
    () => (data?.bills ?? []).map((bill) => ({ label: bill.period_label, value: bill.total_amount })),
    [data],
  )

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadFile('/reports/executive/pdf', `laporan-eksekutif-vampir-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Laporan PDF berhasil diunduh.')
    } catch (caught) {
      toast.error(firstError(caught))
    } finally {
      setDownloading(false)
    }
  }

  function openCreateBill() {
    setEditingBill(null)
    setBillForm(emptyBillForm)
    setBillError('')
    setBillModalOpen(true)
  }

  function openEditBill(bill: Bill) {
    setEditingBill(bill)
    setBillForm({
      period_year: String(bill.period_year),
      period_month: String(bill.period_month),
      total_amount: String(bill.total_amount),
      carbon_emission_kg: bill.carbon_emission_kg !== null ? String(bill.carbon_emission_kg) : '',
      notes: bill.notes ?? '',
    })
    setBillError('')
    setBillModalOpen(true)
  }

  async function handleBillSubmit(event: FormEvent) {
    event.preventDefault()
    setSavingBill(true)
    setBillError('')
    try {
      if (editingBill) {
        await api.patch(`/bills/${editingBill.id}`, {
          total_amount: Number(billForm.total_amount),
          carbon_emission_kg: billForm.carbon_emission_kg ? Number(billForm.carbon_emission_kg) : null,
          notes: billForm.notes.trim() || null,
        })
        toast.success('Tagihan bulanan diperbarui.')
      } else {
        await api.post('/bills', {
          period_year: Number(billForm.period_year),
          period_month: Number(billForm.period_month),
          total_amount: Number(billForm.total_amount),
          carbon_emission_kg: billForm.carbon_emission_kg ? Number(billForm.carbon_emission_kg) : null,
          notes: billForm.notes.trim() || null,
        })
        toast.success('Tagihan bulanan ditambahkan.')
      }
      setBillModalOpen(false)
      await load(true)
    } catch (caught) {
      setBillError(firstError(caught))
    } finally {
      setSavingBill(false)
    }
  }

  async function handleDeleteBill(bill: Bill) {
    if (!window.confirm(`Hapus tagihan periode ${bill.period_label}?`)) return
    try {
      await api.delete(`/bills/${bill.id}`)
      toast.success('Tagihan dihapus.')
      await load(true)
    } catch (caught) {
      toast.error(firstError(caught))
    }
  }

  if (loading) return <PageLoader label="Menyusun ringkasan eksekutif…" />
  if (error || !data) return <ErrorState message={error || 'Ringkasan tidak tersedia.'} onRetry={() => void load()} />

  return (
    <>
      <PageHead
        eyebrow="Laporan pimpinan"
        title="Ringkasan eksekutif"
        description="Tren tagihan listrik kampus, estimasi energi standby laboratorium, dan indikator emisi."
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => void load()} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              Perbarui
            </button>
            <button className="btn btn-primary" onClick={() => void handleDownload()} disabled={downloading}>
              {downloading ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />}
              Unduh PDF
            </button>
          </>
        }
      />

      <div className="info-banner">
        <FileText size={17} />
        <div>
          <strong>Periode laporan {data.period.from ?? '—'} sampai {data.period.to ?? '—'}.</strong> Tagihan adalah data
          manual tingkat kampus. Nilai energi, biaya, dan emisi standby adalah estimasi dari data audit, bukan tagihan
          PLN. Dibuat {dateTime(data.generated_at)}.
        </div>
        <Badge tone="info">Estimasi</Badge>
      </div>

      <section className="stats-grid">
        <StatCard
          icon={<Wallet size={19} />}
          label="Tagihan terbaru"
          value={data.bill_summary.latest_amount !== null ? rupiah(data.bill_summary.latest_amount) : '—'}
          meta={`Periode ${data.bill_summary.latest_period ?? 'belum ada'}`}
          tone="accent"
        />
        <StatCard
          icon={<TrendingUp size={19} />}
          label="Rata-rata tagihan"
          value={rupiah(data.bill_summary.average_amount)}
          meta={`${data.bill_summary.count} periode tercatat`}
          tone="blue"
        />
        <StatCard
          icon={<Zap size={19} />}
          label="Estimasi biaya standby"
          value={rupiah(data.totals.cost_per_month)}
          meta={`${number(data.totals.kwh_per_month, 2)} kWh / bulan`}
          tone="amber"
        />
        <StatCard
          icon={<Leaf size={19} />}
          label="Estimasi emisi"
          value={
            <>
              {number(data.totals.emission_kg_per_month, 2)} <span className="stat-value-sub">kg</span>
            </>
          }
          meta={`CO₂e / bulan · ${number(data.totals.progress_percent, 1)}% PC diaudit`}
          tone="blue"
        />
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Tren tagihan listrik bulanan</h2>
            <p className="card-sub">Data tagihan manual tingkat kampus, bukan hasil integrasi PLN.</p>
          </div>
          <Badge tone="neutral">{data.bill_summary.count} periode</Badge>
        </div>
        <div className="chart-wrap">
          <TrendChart points={chartPoints} />
        </div>
      </section>

      <div className="exec-layout">
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Riwayat tagihan</h2>
              <p className="card-sub">Total tagihan per periode dan emisi tagihan bila diisi Admin.</p>
            </div>
            {isAdmin && (
              <button className="btn btn-secondary btn-sm" onClick={openCreateBill}>
                <Plus size={14} />
                Tambah tagihan
              </button>
            )}
          </div>

          {data.bills.length === 0 ? (
            <div className="empty-inline">Belum ada data tagihan bulanan.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th className="right">Total tagihan</th>
                    <th className="right">Emisi tagihan</th>
                    <th>Catatan</th>
                    {isAdmin && <th aria-label="Aksi" />}
                  </tr>
                </thead>
                <tbody>
                  {[...data.bills].reverse().map((bill) => (
                    <tr key={bill.id}>
                      <td className="cell-strong">
                        <span className="period-cell">
                          <CalendarDays size={14} /> {monthName(bill.period_month)} {bill.period_year}
                        </span>
                      </td>
                      <td className="right cell-strong">{rupiah(bill.total_amount)}</td>
                      <td className="right">
                        {bill.carbon_emission_kg !== null ? `${number(bill.carbon_emission_kg, 1)} kg` : <span className="muted">—</span>}
                      </td>
                      <td className="cell-muted">{bill.notes ?? '—'}</td>
                      {isAdmin && (
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn icon-btn-sm" onClick={() => openEditBill(bill)} aria-label={`Ubah tagihan ${bill.period_label}`}>
                              <Pencil size={14} />
                            </button>
                            <button className="icon-btn icon-btn-sm danger" onClick={() => void handleDeleteBill(bill)} aria-label={`Hapus tagihan ${bill.period_label}`}>
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
          <div className="data-note">
            Kolom emisi tagihan diisi manual dan berbeda dari estimasi emisi hasil perhitungan energi audit.
          </div>
        </section>

        <aside className="card method-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Metode perhitungan</h2>
              <p className="card-sub">Parameter aktif dan sumber data.</p>
            </div>
          </div>

          <div className="method-formula">
            <span>Energi standby</span>
            <code>Σ(unit × watt × jam × hari) ÷ 1.000</code>
          </div>

          <dl className="param-list">
            <div>
              <dt>Tarif listrik</dt>
              <dd>Rp {number(data.parameters.tariff_per_kwh, 2)} / kWh</dd>
            </div>
            <div>
              <dt>Faktor emisi</dt>
              <dd>{number(data.parameters.emission_factor_kg_per_kwh, 2)} kg CO₂e / kWh</dd>
            </div>
            <div>
              <dt>Jam standby</dt>
              <dd>{number(data.parameters.standby_hours_per_day, 0)} jam / hari</dd>
            </div>
            <div>
              <dt>Hari per bulan</dt>
              <dd>{number(data.parameters.standby_days_per_month, 0)} hari</dd>
            </div>
            <div>
              <dt>Progres audit</dt>
              <dd>{data.totals.audited} / {data.totals.pc_target} PC</dd>
            </div>
          </dl>

          <div className="method-notes">
            {data.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </aside>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Status dan estimasi per laboratorium</h2>
            <p className="card-sub">Lab tanpa data audit ditandai “belum diaudit” dan tidak menampilkan estimasi.</p>
          </div>
          <Badge tone={data.totals.progress_percent >= 100 ? 'success' : 'info'}>
            {number(data.totals.progress_percent, 1)}% selesai
          </Badge>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Laboratorium</th>
                <th>Progres audit</th>
                <th className="right">kWh / bulan</th>
                <th className="right">Biaya / bulan</th>
                <th className="right">Emisi / bulan</th>
              </tr>
            </thead>
            <tbody>
              {data.labs.map((lab) => (
                <tr key={lab.id}>
                  <td>
                    <div className="cell-strong">{lab.name}</div>
                    <div className="cell-muted">{lab.location || '—'}</div>
                  </td>
                  <td>
                    <div className="table-progress">
                      <ProgressBar value={lab.progress_percent} height={6} tone={lab.not_audited ? 'warning' : 'accent'} />
                      <span>
                        {lab.audited_count}/{lab.capacity}
                      </span>
                    </div>
                  </td>
                  <td className="right">{lab.not_audited ? <Badge tone="neutral">Belum diaudit</Badge> : number(lab.energy.kwh_per_month, 3)}</td>
                  <td className="right">{lab.not_audited ? '—' : compactRupiah(lab.energy.cost_per_month)}</td>
                  <td className="right">{lab.not_audited ? '—' : `${number(lab.energy.emission_kg_per_month, 2)} kg`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={billModalOpen}
        title={editingBill ? `Ubah tagihan ${editingBill.period_label}` : 'Tambah tagihan bulanan'}
        subtitle="Data manual tingkat kampus; integrasi PLN tidak termasuk rilis ini."
        onClose={() => setBillModalOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setBillModalOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" type="submit" form="billForm" disabled={savingBill}>
              {savingBill ? <LoaderCircle size={16} className="spin" /> : <Wallet size={16} />}
              Simpan tagihan
            </button>
          </>
        }
      >
        <form id="billForm" className="form-stack" onSubmit={handleBillSubmit}>
          {!editingBill && (
            <div className="form-row">
              <FormField label="Bulan" htmlFor="billMonth">
                <select
                  id="billMonth"
                  className="input"
                  value={billForm.period_month}
                  onChange={(event) => setBillForm({ ...billForm, period_month: event.target.value })}
                  required
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>
                      {monthName(month)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tahun" htmlFor="billYear">
                <input
                  id="billYear"
                  className="input"
                  type="number"
                  min="2020"
                  max="2100"
                  value={billForm.period_year}
                  onChange={(event) => setBillForm({ ...billForm, period_year: event.target.value })}
                  required
                />
              </FormField>
            </div>
          )}
          <FormField label="Total tagihan (Rp)" htmlFor="billAmount">
            <input
              id="billAmount"
              className="input"
              type="number"
              min="0"
              step="1"
              value={billForm.total_amount}
              onChange={(event) => setBillForm({ ...billForm, total_amount: event.target.value })}
              required
            />
          </FormField>
          <FormField
            label="Emisi tagihan (kg CO₂e)"
            htmlFor="billCarbon"
            hint="Opsional. Berbeda dari estimasi emisi hasil perhitungan energi audit."
          >
            <input
              id="billCarbon"
              className="input"
              type="number"
              min="0"
              step="0.1"
              value={billForm.carbon_emission_kg}
              onChange={(event) => setBillForm({ ...billForm, carbon_emission_kg: event.target.value })}
            />
          </FormField>
          <FormField label="Catatan" htmlFor="billNotes">
            <textarea
              id="billNotes"
              className="input textarea"
              rows={3}
              value={billForm.notes}
              onChange={(event) => setBillForm({ ...billForm, notes: event.target.value })}
            />
          </FormField>
          {billError && <div className="inline-error">{billError}</div>}
        </form>
      </Modal>
    </>
  )
}
