import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/auth/auth-context';
import { ProtectedRoute } from '../lib/auth/protected-route';
import { useRouter } from 'next/router';

// Add path patterns that don't require authentication
const publicPaths = ['/', '/login', '/signup'];

export default function MyApp({ Component, pageProps }: AppProps & { Component: { requireAuth?: boolean } }) {
  const router = useRouter();
  const requireAuth = publicPaths.every(path => !router.pathname.startsWith(path));

  return (
    <AuthProvider>
      <ProtectedRoute requireAuth={requireAuth}>
        <Component {...pageProps} />
      </ProtectedRoute>
    </AuthProvider>
  );
}
