export type Role = 'ADMIN' | 'AUDITOR' | 'MAINTENANCE' | 'PIMPINAN'

export type PanelGroup = 'SOCKET' | 'AC'
export type PanelLevel = 'NORMAL' | 'WARNING' | 'OVER' | 'UNAVAILABLE'
export type IncidentStatus = 'BARU' | 'DITINJAU' | 'DALAM_PENANGANAN' | 'SELESAI'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: Role
  role_label: string
  is_active: boolean
}

export interface Parameters {
  standby_hours_per_day: number
  standby_days_per_month: number
  tariff_per_kwh: number
  emission_factor_kg_per_kwh: number
  default_warning_percent: number
  incident_poll_seconds: number
  active_pc_watt: number
}

export interface EnergyEstimate {
  total_standby_watt: number
  hours_per_day: number
  days_per_month: number
  kwh_per_month: number
  cost_per_month: number
  emission_kg_per_month: number
  tariff_per_kwh: number
  emission_factor_kg_per_kwh: number
  calculated_at: string
  method: string
}

export interface LabSummary {
  id: number
  name: string
  location: string | null
  capacity: number
  audited_count: number
  faulty_count: number
  progress_percent: number
  not_audited: boolean
  standby_watt_total: number
  energy: EnergyEstimate
  latest_audit_at: string | null
}

export interface LabRoom {
  id: number
  name: string
  location: string | null
  capacity: number
  is_active: boolean
  audited_count?: number
}

export interface ProgressLab {
  id: number
  name: string
  location: string | null
  capacity: number
  audited_count: number
  faulty_count: number
  progress_percent: number
  not_audited: boolean
  latest_audit_at: string | null
}

export interface Spec {
  id: number
  ram_gb: number
  storage_gb: number
  storage_type: string
  label: string
  standby_watt: number
  is_active: boolean
}

export interface AuditSpec {
  ram_gb: number
  storage_gb: number
  storage_type: string
  standby_watt: number
  label: string
}

export interface AuditLog {
  id: number
  lab_room_id: number
  lab_name?: string
  pc_number: string
  master_pc_spec_id: number
  spec: AuditSpec
  is_faulty: boolean
  fault_note: string | null
  auditor?: { id: number; name: string }
  audited_at: string
  updated_at?: string
}

export interface PanelStatus {
  panel_limit_id: number
  lab_room_id: number
  lab_name?: string
  group_type: PanelGroup
  group_label: string
  limit_ampere: number
  voltage: number
  limit_watt: number
  warning_percent: number
  data_label: string
  load_watt: number | null
  percent: number | null
  status: PanelLevel
  status_label: string
  source: string | null
  source_label?: string
  recorded_at: string | null
  notes: string | null
}

export interface PanelLab {
  id: number
  name: string
  location: string | null
  panels: PanelStatus[]
}

export interface PanelOverview {
  labs: PanelLab[]
  summary: {
    labs: number
    panel_groups: number
    warnings: number
    unavailable: number
  }
  warnings: PanelStatus[]
  generated_at: string
  data_note: string
}

export interface PanelReading {
  id: number
  lab_room_id: number
  lab_name?: string
  group_type: PanelGroup
  group_label: string
  load_watt: number
  source: string
  recorded_at: string
  notes: string | null
  recorder?: { id: number; name: string }
}

export interface Incident {
  id: number
  lab_room_id: number
  lab_name?: string
  description: string
  status: IncidentStatus
  status_label: string
  reporter?: { id: number; name: string }
  status_updated_by?: { id: number; name: string } | null
  status_note: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface Bill {
  id: number
  period_year: number
  period_month: number
  period_label: string
  total_amount: number
  carbon_emission_kg: number | null
  notes: string | null
  creator?: { id: number; name: string }
  created_at?: string
  updated_at?: string
}

export interface AdminTotals {
  labs: number
  pc_target: number
  audited: number
  faulty: number
  progress_percent: number
  kwh_per_month: number
  cost_per_month: number
  emission_kg_per_month: number
  pending_incidents: number
  panel_warnings: number
}

export interface AdminDashboard {
  role: 'ADMIN'
  generated_at: string
  parameters: Parameters
  totals: AdminTotals
  labs: LabSummary[]
  panels: {
    summary: PanelOverview['summary']
    warnings: PanelStatus[]
    data_note: string
  }
  incident_counts: Record<IncidentStatus, number>
  incidents: Incident[]
  recent_audits: AuditLog[]
  data_note: string
}

export interface AuditorDashboard {
  role: 'AUDITOR'
  generated_at: string
  parameters: Parameters
  labs: LabSummary[]
  my_stats: { today: number; total: number; faulty: number }
  recent_audits: AuditLog[]
  data_note: string
}

export interface MaintenanceDashboard {
  role: 'MAINTENANCE'
  generated_at: string
  parameters: Parameters
  panels: PanelOverview
  incident_counts: Record<IncidentStatus, number>
  incidents: Incident[]
  data_note: string
}

export interface ExecutiveSummary {
  role?: 'PIMPINAN'
  generated_at: string
  period: { from: string | null; to: string | null }
  parameters: Parameters
  labs: LabSummary[]
  totals: {
    labs: number
    pc_target: number
    audited: number
    faulty: number
    progress_percent: number
    kwh_per_month: number
    cost_per_month: number
    emission_kg_per_month: number
  }
  bills: Bill[]
  bill_summary: {
    count: number
    total_amount: number
    average_amount: number
    latest_period: string | null
    latest_amount: number | null
  }
  notes: string[]
}

export interface DashboardApi {
  role: Role
  [key: string]: unknown
}

export interface SettingEntry {
  key: string
  value: string
  updated_by: string | null
  updated_at: string | null
}

export interface SettingsResponse {
  data: SettingEntry[]
  parameters: Parameters
}

export interface SettingHistoryEntry {
  id: number
  key: string
  old_value: string | null
  new_value: string
  changed_by: string | null
  changed_at: string
}

export interface AppUser {
  id: number
  name: string
  email: string
  role: Role
  role_label: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface Paginated<T> {
  data: T[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  server_time?: string
}
