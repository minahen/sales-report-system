export type Role = 'salesperson' | 'manager' | 'admin'
export type ReportStatus = 'draft' | 'submitted' | 'reviewed'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
}

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
}

export interface ApiResponse<T> {
  data: T
}

export interface PaginatedApiResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiErrorDetail {
  field: string
  code: string
  message: string
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: ApiErrorDetail[]
  }
}
