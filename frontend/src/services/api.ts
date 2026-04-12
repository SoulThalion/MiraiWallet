import axios, { AxiosInstance, AxiosError } from 'axios'

// ── Types from Backend ───────────────────────────────────

export interface ApiTransaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  date: string
  category?: {
    id: string
    name: string
    icon: string
    color: string
  }
  account?: {
    id: string
    name: string
    color: string
  }
  createdAt: string
  updatedAt: string
}

export interface ApiCategory {
  id: string
  name: string
  icon: string
  color: string
  monthlyBudget?: number
  budget?: number
  spent?: number
}

export interface ApiAlertAction {
  label: string
  style: 'primary' | 'secondary' | 'success' | 'gold'
}

export interface ApiAlert {
  id: string
  type: 'danger' | 'success' | 'warning' | 'info'
  badge: string
  title: string
  body: string
  amount?: string | null
  actions?: ApiAlertAction[] | null
  isRead: boolean
  isDismissed: boolean
  createdAt: string
}

export interface ApiBudget {
  id: string
  categoryId: string
  month: string
  amount: number
  category?: ApiCategory
  spent?: number
}

export interface ApiAccount {
  id: string
  name: string
  type: string
  balance: number
  currency: string
  color?: string
}

export interface DashboardData {
  balance: number
  month: string
  income: number
  expenses: number
  saved: number
  categoryBreakdown: {
    categoryId: string | null
    name: string
    icon: string
    color: string
    total: number
  }[]
  monthlySummary: {
    month: string
    income: number
    expenses: number
    net: number
  }[]
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext?: boolean
  hasPrev?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface SessionUser {
  id: string
  name: string
  email: string
  role?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: string
}

export interface AuthResult extends AuthTokens {
  user: SessionUser
}

/** URL base del API (sin barra final). Obligatoria vía `VITE_API_URL` en `.env`. */
export function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error(
      'VITE_API_URL no está definida. Copia frontend/.env.example a frontend/.env y asigna la URL del API (p. ej. http://localhost:3000/api/v1).'
    )
  }
  return raw.replace(/\/$/, '')
}

interface ApiSuccessBody<T> {
  success: boolean
  data: T
  meta?: PaginationMeta
}

function unwrapPaginated<T>(body: ApiSuccessBody<T[]>): PaginatedResponse<T> {
  return { data: body.data, meta: body.meta ?? { page: 1, limit: 20, total: body.data.length, totalPages: 1 } }
}

// ── API Client ───────────────────────────────────────────

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: resolveApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          const url = error.config?.url ?? ''
          const isPublicAuth =
            url.includes('/auth/login') ||
            url.includes('/auth/register') ||
            url.includes('/auth/refresh')
          if (!isPublicAuth) {
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            if (!window.location.pathname.startsWith('/login')) {
              window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
            }
          }
        }
        return Promise.reject(error)
      }
    )
  }

  async getDashboard(): Promise<DashboardData> {
    const response = await this.client.get<ApiSuccessBody<DashboardData>>('/stats/dashboard')
    return response.data.data
  }

  async getTransactions(params?: {
    page?: number
    limit?: number
    type?: 'income' | 'expense' | 'transfer'
    categoryId?: string
    from?: string
    to?: string
  }): Promise<PaginatedResponse<ApiTransaction>> {
    const response = await this.client.get<ApiSuccessBody<ApiTransaction[]>>('/transactions', { params })
    return unwrapPaginated(response.data)
  }

  async createTransaction(data: {
    description: string
    amount: number
    type: 'income' | 'expense' | 'transfer'
    date: string
    accountId: string
    categoryId?: string
    notes?: string
  }): Promise<ApiTransaction> {
    const response = await this.client.post<ApiSuccessBody<ApiTransaction>>('/transactions', data)
    return response.data.data
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.client.delete(`/transactions/${id}`)
  }

  async getCategories(): Promise<ApiCategory[]> {
    const response = await this.client.get<ApiSuccessBody<ApiCategory[]>>('/categories')
    return response.data.data
  }

  async getBudgets(month?: string): Promise<ApiBudget[]> {
    const response = await this.client.get<ApiSuccessBody<ApiBudget[]>>('/budgets', { params: { month } })
    return response.data.data
  }

  async getAccounts(): Promise<ApiAccount[]> {
    const response = await this.client.get<ApiSuccessBody<ApiAccount[]>>('/accounts')
    return response.data.data
  }

  async getAlerts(params?: {
    page?: number
    limit?: number
    type?: string
  }): Promise<PaginatedResponse<ApiAlert>> {
    const response = await this.client.get<ApiSuccessBody<ApiAlert[]>>('/alerts', { params })
    return unwrapPaginated(response.data)
  }

  /** El backend expone descartar como DELETE /alerts/:id */
  async dismissAlert(id: string): Promise<void> {
    await this.client.delete(`/alerts/${id}`)
  }

  async markAlertRead(id: string): Promise<void> {
    await this.client.patch(`/alerts/${id}/read`)
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const response = await this.client.post<ApiSuccessBody<AuthResult>>('/auth/login', { email, password })
    return response.data.data
  }

  async register(payload: { name: string; email: string; password: string }): Promise<AuthResult> {
    const response = await this.client.post<ApiSuccessBody<AuthResult>>('/auth/register', payload)
    return response.data.data
  }

  async getMe(): Promise<SessionUser> {
    const response = await this.client.get<ApiSuccessBody<SessionUser>>('/auth/me')
    return response.data.data
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout')
  }
}

export const api = new ApiClient()
