import type { NextRequest } from 'next/server'

export interface RequestUser {
  id: string
  role: string
}

export function getRequestUser(request: NextRequest): RequestUser | null {
  const id = request.headers.get('x-user-id')
  const role = request.headers.get('x-user-role')
  if (!id || !role) return null
  return { id, role }
}
