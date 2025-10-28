// Types for Auth context and components
export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  phone?: string
  status?: string
  emailVerified?: boolean
  memberships?: Array<{
    id: string
    role: string
    organization: {
      id: string
      name: string
      slug: string
    }
  }>
  plan?: {
    id: string
    name: string
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

export interface LoginResponse {
  user: User
  accessToken: string
  refreshToken?: string
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  initialized: boolean
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => void
  getTokens: () => AuthTokens | null
  setTokens: (tokens: AuthTokens) => void
}

export interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}