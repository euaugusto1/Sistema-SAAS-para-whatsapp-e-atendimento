import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useAuth } from './auth-context'

export function useRequireAuth(redirectTo = '/login') {
  const { user, loading, initialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && initialized && !user) {
      router.replace(redirectTo)
    }
  }, [user, loading, initialized, router, redirectTo])

  return { user, loading }
}

export function usePublicRoute(redirectTo = '/dashboard') {
  const { user, loading, initialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && initialized && user) {
      router.replace(redirectTo)
    }
  }, [user, loading, initialized, router, redirectTo])

  return { user, loading }
}