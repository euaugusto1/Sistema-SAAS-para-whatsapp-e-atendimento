// @ts-nocheck
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { apiClient } from '../lib/api/client';
import { useAuth } from '../lib/auth/auth-context';
import { LoadingSpinner, ErrorMessage } from '../components/LoadingSpinner';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ sent: 0, delivered: 0, failed: 0 });
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const auth: any = useAuth();

  useEffect(() => {
    document.title = 'Dashboard';
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError('');
    try {
      const meRes = await apiClient.get('/auth/me');
      const userData = meRes.data?.user || meRes.data;
      setOrganizations(userData?.memberships || []);
      
      // For demo metrics
      setMetrics({ sent: 1234, delivered: 1200, failed: 34 });
    } catch (e: any) {
      console.error('Failed to load dashboard data', e);
      setError(e?.response?.data?.message || 'Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    // use centralized logout to clear tokens and redirect
    try {
      auth.logout();
    } catch (e) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }

  return (
    <>
      <Head>
        <title>Dashboard — Disparador</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
      </Head>
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Dashboard</h1>
          <div>
            <button className="btn btn-outline-secondary me-2" onClick={() => window.location.href = '/signup'}>Criar conta</button>
            <button className="btn btn-danger" onClick={logout}>Sair</button>
          </div>
        </div>

        {loading && <LoadingSpinner message="Carregando dashboard..." />}
        
        {error && <ErrorMessage message={error} onRetry={loadDashboardData} />}

        {!loading && !error && (
          <>
            <div className="row">
              <div className="col-md-4">
                <div className="card p-3 text-center">
                  <h5>Enviadas</h5>
                  <h2>{metrics.sent}</h2>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card p-3 text-center">
                  <h5>Entregues</h5>
                  <h2>{metrics.delivered}</h2>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card p-3 text-center">
                  <h5>Falhas</h5>
                  <h2>{metrics.failed}</h2>
                </div>
              </div>
            </div>

            <section className="mt-4">
              <div className="card p-3">
                <h4>Minhas Organizações</h4>
                {organizations.length === 0 ? (
                  <p className="text-muted mt-2">Nenhuma organização encontrada.</p>
                ) : (
                  <div className="list-group mt-3">
                    {organizations.map((membership: any) => (
                      <div key={membership.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{membership.organization?.name || 'Organização'}</strong>
                          <br />
                          <small className="text-muted">Função: {membership.role}</small>
                        </div>
                        <span className="badge bg-primary">{membership.organization?.slug}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="mt-4">
              <div className="card p-3">
                <h4>Atalhos</h4>
                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-primary" onClick={() => window.location.href = '/login'}>Enviar Lote</button>
                  <button className="btn btn-outline-primary" onClick={() => alert('A página de contatos ainda será implementada')}>Contacts</button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
