import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  Clock,
  Gauge,
  History,
  Leaf,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Timer,
  Wallet,
  Zap,
} from 'lucide-react'
import { useToast } from '../components/ToastProvider'
import { Badge, ErrorState, FormField, PageHead, PageLoader } from '../components/ui'
import { api, firstError } from '../lib/api'
import { dateTime, number, rupiah } from '../lib/format'
import type { Parameters, SettingEntry, SettingHistoryEntry, SettingsResponse } from '../types'

type SettingsForm = Record<keyof Parameters, string>

const parameterLabels: Record<keyof Parameters, string> = {
  standby_hours_per_day: 'Jam standby per hari',
  standby_days_per_month: 'Hari standby per bulan',
  tariff_per_kwh: 'Tarif listrik per kWh',
  emission_factor_kg_per_kwh: 'Faktor emisi per kWh',
  default_warning_percent: 'Ambang peringatan panel',
  incident_poll_seconds: 'Interval polling insiden',
  active_pc_watt: 'Daya aktif PC referensi',
}

function toForm(parameters: Parameters): SettingsForm {
  return {
    standby_hours_per_day: String(parameters.standby_hours_per_day),
    standby_days_per_month: String(parameters.standby_days_per_month),
    tariff_per_kwh: String(parameters.tariff_per_kwh),
    emission_factor_kg_per_kwh: String(parameters.emission_factor_kg_per_kwh),
    default_warning_percent: String(parameters.default_warning_percent),
    incident_poll_seconds: String(parameters.incident_poll_seconds),
    active_pc_watt: String(parameters.active_pc_watt),
  }
}

function numeric(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function SettingsPage() {
  const toast = useToast()

  const [entries, setEntries] = useState<SettingEntry[]>([])
  const [form, setForm] = useState<SettingsForm | null>(null)
  const [initialForm, setInitialForm] = useState<SettingsForm | null>(null)
  const [history, setHistory] = useState<SettingHistoryEntry[]>([])
  const [historyError, setHistoryError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [response, historyResponse] = await Promise.all([
        api.get<SettingsResponse>('/settings'),
        api.get<{ data: SettingHistoryEntry[] }>('/settings/history').catch((caught: unknown) => {
          setHistoryError(firstError(caught))
          return { data: [] as SettingHistoryEntry[] }
        }),
      ])
      const next = toForm(response.parameters)
      setEntries(response.data)
      setForm(next)
      setInitialForm(next)
      setHistory(historyResponse.data)
      setError('')
      setFormError('')
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

  const dirty = useMemo(() => {
    if (!form || !initialForm) return false
    return (Object.keys(form) as (keyof SettingsForm)[]).some((key) => form[key] !== initialForm[key])
  }, [form, initialForm])

  const preview = useMemo(() => {
    if (!form) return null
    const sampleWatt = 5
    const hours = numeric(form.standby_hours_per_day)
    const days = numeric(form.standby_days_per_month)
    const kwh = (sampleWatt * hours * days) / 1000
    return {
      kwh,
      cost: kwh * numeric(form.tariff_per_kwh),
      emission: kwh * numeric(form.emission_factor_kg_per_kwh),
    }
  }, [form])

  const update = (key: keyof Parameters, value: string) => {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  function reset() {
    if (initialForm) {
      setForm(initialForm)
      setFormError('')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form) return
    setSaving(true)
    setFormError('')
    try {
      await api.patch('/settings', {
        standby_hours_per_day: numeric(form.standby_hours_per_day),
        standby_days_per_month: numeric(form.standby_days_per_month),
        tariff_per_kwh: numeric(form.tariff_per_kwh),
        emission_factor_kg_per_kwh: numeric(form.emission_factor_kg_per_kwh),
        default_warning_percent: numeric(form.default_warning_percent),
        incident_poll_seconds: numeric(form.incident_poll_seconds),
        active_pc_watt: numeric(form.active_pc_watt),
      })
      toast.success('Parameter kalkulasi diperbarui dan langsung dipakai pada estimasi berikutnya.')
      await load(true)
    } catch (caught) {
      setFormError(firstError(caught))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader label="Memuat parameter sistem…" />
  if (error || !form) return <ErrorState message={error || 'Parameter tidak tersedia.'} onRetry={() => void load()} />

  const updatedAtByKey = new Map(entries.map((entry) => [entry.key, entry]))

  return (
    <>
      <PageHead
        eyebrow="Parameter sistem"
        title="Pengaturan kalkulasi"
        description="Atur asumsi energi standby, tarif, faktor emisi, dan interval operasional yang dipakai seluruh perhitungan."
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => void load()} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              Perbarui
            </button>
            <button className="btn btn-primary" type="submit" form="settingsForm" disabled={saving || !dirty}>
              {saving ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}
              Simpan parameter
            </button>
          </>
        }
      />

      <div className="info-banner">
        <AlertTriangle size={17} />
        <div>
          <strong>Perubahan parameter tidak mengubah catatan watt pada audit historis.</strong> Energi, biaya, dan emisi
          dihitung ulang memakai parameter aktif saat halaman dibuka. Setiap perubahan dicatat pada riwayat beserta
          pelakunya.
        </div>
        <Badge tone="warning">Estimasi, bukan meter PLN</Badge>
      </div>

      <form id="settingsForm" className="settings-layout" onSubmit={handleSubmit}>
        <div className="settings-main">
          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Asumsi estimasi energi standby</h2>
                <p className="card-sub">
                  Dipakai pada rumus Σ(watt standby × jam × hari) ÷ 1.000 untuk kWh per bulan.
                </p>
              </div>
              <span className="card-head-icon"><Zap size={17} /></span>
            </div>

            <div className="settings-grid">
              <FormField
                label="Jam standby per hari"
                htmlFor="standbyHours"
                hint="Rentang 0–24 jam. Tentukan periode PC dalam kondisi standby."
              >
                <div className="unit-input">
                  <input
                    id="standbyHours"
                    className="input"
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={form.standby_hours_per_day}
                    onChange={(event) => update('standby_hours_per_day', event.target.value)}
                    required
                  />
                  <span>jam/hari</span>
                </div>
              </FormField>

              <FormField
                label="Hari standby per bulan"
                htmlFor="standbyDays"
                hint="Rentang 1–31 hari. Gunakan jumlah hari operasional yang disepakati."
              >
                <div className="unit-input">
                  <input
                    id="standbyDays"
                    className="input"
                    type="number"
                    min="1"
                    max="31"
                    step="0.5"
                    value={form.standby_days_per_month}
                    onChange={(event) => update('standby_days_per_month', event.target.value)}
                    required
                  />
                  <span>hari/bulan</span>
                </div>
              </FormField>

              <FormField
                label="Tarif listrik"
                htmlFor="tariff"
                hint="Tarif per kWh yang berlaku; tanyakan pemilik data sebelum mengubah."
              >
                <div className="unit-input prefix">
                  <span>Rp</span>
                  <input
                    id="tariff"
                    className="input"
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    value={form.tariff_per_kwh}
                    onChange={(event) => update('tariff_per_kwh', event.target.value)}
                    required
                  />
                  <span>/kWh</span>
                </div>
              </FormField>

              <FormField
                label="Faktor emisi"
                htmlFor="emission"
                hint="Faktor emisi grid dalam kg CO₂e per kWh."
              >
                <div className="unit-input">
                  <input
                    id="emission"
                    className="input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.emission_factor_kg_per_kwh}
                    onChange={(event) => update('emission_factor_kg_per_kwh', event.target.value)}
                    required
                  />
                  <span>kg CO₂e/kWh</span>
                </div>
              </FormField>
            </div>

            <div className="calc-preview settings-preview">
              <div>
                <span>Contoh 1 unit · 5 W standby</span>
                <strong>{number(preview?.kwh ?? 0, 3)} kWh / bulan</strong>
              </div>
              <div>
                <span>Estimasi biaya</span>
                <strong>{rupiah(preview?.cost ?? 0)}</strong>
              </div>
              <div>
                <span>Estimasi emisi</span>
                <strong>{number(preview?.emission ?? 0, 3)} kg CO₂e</strong>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Operasional panel dan feed insiden</h2>
                <p className="card-sub">Nilai awal panel dan interval pembaruan otomatis pada dashboard.</p>
              </div>
              <span className="card-head-icon"><Gauge size={17} /></span>
            </div>

            <div className="settings-grid">
              <FormField
                label="Ambang peringatan panel"
                htmlFor="warningPercent"
                hint="Peringatan muncul saat beban mencapai persentase ini dari batas panel."
              >
                <div className="unit-input">
                  <input
                    id="warningPercent"
                    className="input"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={form.default_warning_percent}
                    onChange={(event) => update('default_warning_percent', event.target.value)}
                    required
                  />
                  <span>%</span>
                </div>
              </FormField>

              <FormField
                label="Interval polling insiden"
                htmlFor="pollSeconds"
                hint="Rentang 3–60 detik. Semakin kecil, semakin sering feed diperbarui."
              >
                <div className="unit-input">
                  <input
                    id="pollSeconds"
                    className="input"
                    type="number"
                    min="3"
                    max="60"
                    step="1"
                    value={form.incident_poll_seconds}
                    onChange={(event) => update('incident_poll_seconds', event.target.value)}
                    required
                  />
                  <span>detik</span>
                </div>
              </FormField>

              <FormField
                label="Daya aktif PC referensi"
                htmlFor="activeWatt"
                hint="Nilai acuan operasional. Tidak dipakai pada estimasi standby; daya standby diambil dari master perangkat."
              >
                <div className="unit-input">
                  <input
                    id="activeWatt"
                    className="input"
                    type="number"
                    min="0.01"
                    max="10000"
                    step="0.01"
                    value={form.active_pc_watt}
                    onChange={(event) => update('active_pc_watt', event.target.value)}
                    required
                  />
                  <span>W</span>
                </div>
              </FormField>
            </div>

            <div className="settings-hint">
              <Timer size={15} />
              <span>
                Perubahan interval polling berlaku setelah halaman panel dimuat ulang oleh pengguna. Jeda minimal 3
                detik untuk menjaga beban server.
              </span>
            </div>
          </section>

          <div className="settings-actions">
            {formError && <div className="inline-error">{formError}</div>}
            <div className="settings-actions-row">
              <button className="btn btn-ghost" type="button" onClick={reset} disabled={!dirty || saving}>
                <RotateCcw size={15} />
                Batalkan perubahan
              </button>
              <button className="btn btn-primary" type="submit" disabled={saving || !dirty}>
                {saving ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}
                Simpan parameter
              </button>
            </div>
            {dirty && <span className="dirty-hint">Ada perubahan yang belum disimpan.</span>}
          </div>
        </div>

        <aside className="settings-side">
          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Metode dan sumber</h2>
                <p className="card-sub">Transparansi perhitungan yang tampil pada laporan.</p>
              </div>
            </div>
            <div className="method-formula">
              <span>Energi standby</span>
              <code>Σ(unit × watt × jam × hari) ÷ 1.000</code>
            </div>
            <dl className="param-list">
              <div>
                <dt><Clock size={14} /> Jam / hari</dt>
                <dd>{number(numeric(form.standby_hours_per_day), 2)} jam</dd>
              </div>
              <div>
                <dt><Clock size={14} /> Hari / bulan</dt>
                <dd>{number(numeric(form.standby_days_per_month), 2)} hari</dd>
              </div>
              <div>
                <dt><Wallet size={14} /> Tarif</dt>
                <dd>{rupiah(numeric(form.tariff_per_kwh))} / kWh</dd>
              </div>
              <div>
                <dt><Leaf size={14} /> Faktor emisi</dt>
                <dd>{number(numeric(form.emission_factor_kg_per_kwh), 2)} kg / kWh</dd>
              </div>
              <div>
                <dt><Gauge size={14} /> Ambang panel</dt>
                <dd>{number(numeric(form.default_warning_percent), 0)}%</dd>
              </div>
              <div>
                <dt><Timer size={14} /> Polling</dt>
                <dd>{number(numeric(form.incident_poll_seconds), 0)} detik</dd>
              </div>
            </dl>
            <div className="data-note">
              Angka adalah estimasi dari data audit dan parameter aktif, bukan pembacaan meter PLN.
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Pembaruan terakhir</h2>
                <p className="card-sub">Pelaku dan waktu perubahan nilai aktif.</p>
              </div>
              <History size={16} className="card-head-icon" />
            </div>
            <div className="setting-meta-list">
              {(Object.keys(parameterLabels) as (keyof Parameters)[]).map((key) => {
                const entry = updatedAtByKey.get(key)
                return (
                  <div className="setting-meta-item" key={key}>
                    <div>
                      <strong>{parameterLabels[key]}</strong>
                      <span>{entry?.updated_by ? `oleh ${entry.updated_by}` : 'nilai awal sistem'}</span>
                    </div>
                    <time>{dateTime(entry?.updated_at)}</time>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>
      </form>

      <section className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Riwayat perubahan parameter</h2>
            <p className="card-sub">
              Jejak perubahan nilai agar hasil historis dapat dijelaskan. Menampilkan hingga 100 perubahan terakhir.
            </p>
          </div>
          <Badge tone="neutral">{history.length} catatan</Badge>
        </div>

        {historyError ? (
          <div className="empty-inline">{historyError}</div>
        ) : history.length === 0 ? (
          <div className="empty-inline">Belum ada perubahan parameter yang tercatat.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Parameter</th>
                  <th>Nilai lama</th>
                  <th>Nilai baru</th>
                  <th>Diubah oleh</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td className="cell-muted">{dateTime(entry.changed_at)}</td>
                    <td className="cell-strong">{parameterLabels[entry.key as keyof Parameters] ?? entry.key}</td>
                    <td className="cell-muted">{entry.old_value ?? '—'}</td>
                    <td className="cell-strong">{entry.new_value}</td>
                    <td>{entry.changed_by ?? 'Sistem'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="settings-footnote">
        <SlidersHorizontal size={15} />
        <span>
          Parameter disimpan pada tabel <code>settings</code> dan digunakan oleh API kalkulasi. Nilai default berada di
          <code> config/vampir.php</code>; perubahan Admin akan menimpa default tersebut.
        </span>
      </div>
    </>
  )
}
