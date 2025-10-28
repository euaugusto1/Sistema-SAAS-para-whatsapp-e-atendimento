import React, { useState } from 'react';
import { apiClient } from '../lib/api/client';
import Head from 'next/head';
import { useAuth } from '../lib/auth/auth-context';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const auth: any = useAuth();

  async function submit(e: any) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return setMsg('Preencha todos os campos');
    if (password !== confirm) return setMsg('As senhas não coincidem');
    setMsg('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/register', { name, email, password });
      // Backend retorna: { user, accessToken, refreshToken }
      const data = res.data;
      
      if (data.accessToken) {
        // Salvar tokens manualmente
        auth.setTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        
        setMsg('Registro realizado com sucesso! Redirecionando...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        setMsg('Registro realizado, mas sem token. Faça login.');
      }
    } catch (err: any) {
      setMsg(err?.response?.data?.message || err.message || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Signup — Disparador</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
      </Head>
      <div className="container" style={{ maxWidth: 540, marginTop: 60 }}>
        <div className="card p-4">
          <h3 className="mb-3">Criar conta</h3>
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">Nome</label>
              <input className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@exemplo.com" required />
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Senha</label>
                <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" required />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Confirmar senha</label>
                <input className="form-control" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirmar senha" required />
              </div>
            </div>

            <div className="d-grid">
              <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>{loading ? 'Cadastrando...' : 'Criar conta'}</button>
            </div>
          </form>

          {msg && <div className="alert alert-info mt-3">{msg}</div>}
        </div>
      </div>
    </>
  );
}
