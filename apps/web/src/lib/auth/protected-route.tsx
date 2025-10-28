import { useRouter } from 'next/router'
import { ProtectedRouteProps } from './types'
import { useAuth } from './auth-context'

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading, initialized } = useAuth()

  // On first render or when re-authenticating, show nothing
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </div>
    )
  }

  // If auth is required and user is not logged in, redirect to login
  if (requireAuth && !user) {
    if (typeof window !== 'undefined' && router.pathname !== redirectTo) {
      router.replace(redirectTo)
      return null
    }
  }

  // If user is logged in and tries to access login/signup, redirect to dashboard
  if (!requireAuth && user) {
    if (typeof window !== 'undefined' && router.pathname !== '/dashboard') {
      router.replace('/dashboard')
      return null
    }
  }

  return <>{children}</>
}