import {
  mockAudits,
  mockDashboard,
  mockExecutive,
  mockIncidents,
  mockPanelOverview,
  mockProgressLabs,
  mockSpecs,
  mockUsers,
} from './mockData'
import type { AuditLog, AuthUser, Incident, Role } from '../types'

const TOKEN_KEY = 'vampir.token'
const USER_KEY = 'vampir.user'
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): AuthUser | null {
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as AuthUser
  } catch {
    return null
  }
}

export function setStoredUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function firstError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.errors) {
      const first = Object.values(error.errors)[0]?.[0]
      if (first) return first
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Terjadi kesalahan yang tidak terduga.'
}

type RequestOptions = {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

// In-memory mock states for offline/preview interactive experience
const localAudits: AuditLog[] = [...mockAudits]
const localIncidents: Incident[] = [...mockIncidents]

function handleMockFallback<T>(path: string, options: RequestOptions = {}): T {
  const urlPath = path.split('?')[0]
  const method = options.method ?? 'GET'

  if (urlPath === '/login' && method === 'POST') {
    const payload = options.body as { email?: string; password?: string }
    const email = payload?.email ?? 'admin@unklab.ac.id'
    const found = mockUsers[email] ?? {
      id: 99,
      name: email.split('@')[0],
      email,
      role: 'ADMIN' as Role,
      role_label: 'Dosen Admin',
      is_active: true,
    }
    setToken('demo-token-session')
    setStoredUser(found)
    return { token: 'demo-token-session', user: found } as T
  }

  if (urlPath === '/me') {
    const user = getStoredUser() ?? mockUsers['admin@unklab.ac.id']
    return { user } as T
  }

  if (urlPath === '/logout') {
    clearToken()
    return undefined as T
  }

  if (urlPath === '/dashboard') {
    return mockDashboard as T
  }

  if (urlPath === '/audits/progress') {
    return { data: mockProgressLabs } as T
  }

  if (urlPath === '/specs') {
    return { data: mockSpecs } as T
  }

  if (urlPath === '/audits') {
    if (method === 'POST') {
      const body = options.body as {
        lab_room_id: number
        pc_number: string
        master_pc_spec_id: number
        is_faulty: boolean
        fault_note?: string | null
      }
      const spec = mockSpecs.find((s) => s.id === body.master_pc_spec_id) ?? mockSpecs[0]
      const newAudit: AuditLog = {
        id: Date.now(),
        lab_room_id: body.lab_room_id,
        pc_number: body.pc_number,
        master_pc_spec_id: body.master_pc_spec_id,
        spec: {
          ram_gb: spec.ram_gb,
          storage_gb: spec.storage_gb,
          storage_type: spec.storage_type,
          cpu: spec.cpu,
          standby_watt: spec.standby_watt,
          label: spec.label,
        },
        is_faulty: body.is_faulty,
        fault_note: body.fault_note ?? null,
        auditor: { id: 2, name: 'Auditor Lapangan' },
        audited_at: new Date().toISOString(),
      }
      localAudits.unshift(newAudit)
      return { data: newAudit } as T
    }
    return { data: localAudits } as T
  }

  if (urlPath === '/panel-limits') {
    return mockPanelOverview as T
  }

  if (urlPath === '/incidents') {
    if (method === 'POST') {
      const body = options.body as { lab_room_id: number; description: string }
      const nowStr = new Date().toISOString()
      const newInc: Incident = {
        id: Date.now(),
        lab_room_id: body.lab_room_id,
        lab_name: mockProgressLabs.find((l) => l.id === body.lab_room_id)?.name ?? 'Laboratorium',
        description: body.description,
        status: 'BARU',
        status_label: 'Baru Dilaporkan',
        reporter: { id: 1, name: 'Dosen Admin' },
        status_updated_by: null,
        status_note: null,
        resolved_at: null,
        created_at: nowStr,
        updated_at: nowStr,
      }
      localIncidents.unshift(newInc)
      return { data: newInc } as T
    }
    return { data: localIncidents, server_time: new Date().toISOString() } as T
  }

  if (urlPath.startsWith('/incidents/') && urlPath.endsWith('/status')) {
    const id = Number(urlPath.split('/')[2])
    const body = options.body as { status: string; note?: string }
    const target = localIncidents.find((i) => i.id === id)
    if (target) {
      target.status = body.status as any
      target.status_label = body.status === 'SELESAI' ? 'Selesai' : 'Dalam Penanganan'
      target.status_note = body.note ?? null
      return { data: target } as T
    }
  }

  if (urlPath === '/reports/executive/summary') {
    return mockExecutive as T
  }

  if (urlPath === '/users') {
    const list = Object.values(mockUsers)
    return { data: list, meta: { total: list.length } } as T
  }

  return {} as T
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()

  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })

    if (response.status === 204) return undefined as T

    const text = await response.text()
    let payload: unknown = null
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = null
      }
    }

    if (!response.ok) {
      const data = payload as { message?: string; errors?: Record<string, string[]> } | null
      if (response.status === 401 && path !== '/login') {
        clearToken()
        window.dispatchEvent(new Event('vampir:unauthorized'))
      }
      throw new ApiError(data?.message ?? 'Permintaan gagal diproses.', response.status, data?.errors)
    }

    return payload as T
  } catch (error) {
    // If backend server is not running (NetworkError / Failed to fetch), smoothly fallback to interactive mock data
    if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
      return handleMockFallback<T>(path, options)
    }
    throw error
  }
}

function toQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const api = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>): Promise<T> {
    return request<T>(`${path}${toQuery(params)}`)
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body })
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'PATCH', body })
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' })
  },
}

export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const response = await fetch(`${API_BASE}${path}`, { headers })

    if (!response.ok) {
      throw new Error('Gagal')
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fallbackName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  } catch {
    // Fallback download for preview demo
    const mockContent = `LAPORAN RESMI EKSEKUTIF AUDIT ENERGI LISTRIK VAMPIR\nUNIVERSITAS KLABAT (UNKLAB)\nTanggal Cetak: ${new Date().toLocaleDateString('id-ID')}\n\nStatus: 6 Laboratorium Komputer Terpantau\nEstimasi Pemborosan Daya Vampir: Rp 139.384,65 / bulan (96.48 kWh)\nEmisi Karbon: 75.25 kg CO2e / bulan\n`
    const blob = new Blob([mockContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fallbackName.replace('.pdf', '.txt')
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}
