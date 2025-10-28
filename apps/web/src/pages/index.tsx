import React from "react";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Resumo Visual — Transformação em SaaS</title>
        <meta
          name="description"
          content="Resumo visual do projeto de transformação em SaaS para disparador WhatsApp."
        />
      </Head>

      <div className="container py-5">
        <header className="site-nav">
          <div className="brand">
            <div className="logo">SV</div>
            <div>
              <div style={{ fontWeight: 700 }}>Transformação SaaS</div>
              <div className="muted-small">Resumo Visual</div>
            </div>
          </div>
          <div className="nav-actions">
            <a className="btn btn-link" href="/login">
              Entrar
            </a>
            <a className="btn btn-outline-primary" href="/signup">
              Criar conta
            </a>
          </div>
        </header>

        <div className="hero mt-3">
          <div className="container">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 420px" }}>
                <h1>Transformação em SaaS — Resumo Visual</h1>
                <p className="lead">
                  Página que reproduz o resumo visual do projeto com objetivos,
                  arquitetura, roadmap e métricas.
                </p>
                <div className="cta-group">
                  <a className="btn btn-cta btn-lg" href="/signup">
                    Começar grátis
                  </a>
                  <a
                    className="btn btn-outline-light btn-lg"
                    href="/login"
                    style={{ marginLeft: 12 }}
                  >
                    Entrar
                  </a>
                </div>
              </div>
              <div style={{ width: 220, flex: "0 0 220px" }}>
                {/* simple visual placeholder */}
                <div
                  style={{
                    background: "#fff",
                    color: "#0f172a",
                    padding: 18,
                    borderRadius: 8,
                    textAlign: "center",
                    boxShadow: "0 8px 24px rgba(2,6,23,0.12)",
                  }}
                >
                  <strong>Visão</strong>
                  <div style={{ marginTop: 8 }} className="muted-small">
                    SaaS escalável para disparos WhatsApp
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-4">
          <h2>Visão Geral</h2>
          <pre
            style={{
              background: "#f8f9fa",
              padding: 12,
              borderRadius: 8,
              whiteSpace: "pre-wrap",
            }}
          >{`SISTEMA ATUAL          →         SISTEMA FUTURO

📄 Monolítico                 🏢 Multi-tenant
👤 Single user                👥 Multi-user
🔓 Segurança básica           🔐 Segurança robusta
📝 Hardcoded                 🎨 Customizável
💸 Sem monetização           💰 Assinatura`}</pre>
        </section>

        <section className="mb-4">
          <h2>Objetivo Principal</h2>
          <p>
            Criação de uma plataforma SaaS de disparos WhatsApp que permite
            múltiplas empresas gerenciarem suas próprias campanhas de forma
            independente, segura e escalável.
          </p>
        </section>

        <section className="mb-4">
          <h2>Projeção Financeira (Cenário Conservador — 12 meses)</h2>
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Mês</th>
                  <th>Usuários</th>
                  <th>Preço (R$)</th>
                  <th>Receita (R$)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1-3</td>
                  <td>50</td>
                  <td>100</td>
                  <td>5.000</td>
                </tr>
                <tr>
                  <td>4-6</td>
                  <td>150</td>
                  <td>120</td>
                  <td>18.000</td>
                </tr>
                <tr>
                  <td>7-9</td>
                  <td>300</td>
                  <td>130</td>
                  <td>39.000</td>
                </tr>
                <tr>
                  <td>10-12</td>
                  <td>500</td>
                  <td>140</td>
                  <td>70.000</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>ARR Ano 1:</strong> ~R$ 840.000 —{" "}
            <strong>Break-even:</strong> Mês 9-10
          </p>
        </section>

        <section className="mb-4">
          <h2>Arquitetura Simplificada</h2>
          <div style={{ background: "#f8f9fa", padding: 12, borderRadius: 8 }}>
            <pre
              style={{ margin: 0, whiteSpace: "pre-wrap" }}
            >{`FRONTEND: Next.js + Tailwind + Shadcn/ui

REST API / WebSocket

BACKEND: NestJS + Prisma

DB: PostgreSQL
Queue: Redis
WhatsApp: Provider API`}</pre>
          </div>
        </section>

        <section className="mb-4">
          <h2>Funcionalidades (MVP)</h2>
          <div className="cards-grid">
            <div className="feature-card">
              <h5>Autenticação</h5>
              <p>Registro / Login, recuperação de senha e perfil de usuário.</p>
            </div>
            <div className="feature-card">
              <h5>Multi-tenancy</h5>
              <p>Criar organizações, convidar membros e permissões básicas.</p>
            </div>
            <div className="feature-card">
              <h5>Contatos</h5>
              <p>CRUD completo, import CSV, segmentação por tags e listas.</p>
            </div>
            <div className="feature-card">
              <h5>Campanhas</h5>
              <p>
                Criar disparos, anexos, agendamento e monitoramento em tempo
                real.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-4">
          <h2>Modelos de Planos</h2>
          <div className="cards-grid">
            <div className="feature-card text-center">
              <h5>FREE (Trial)</h5>
              <p className="muted-small">
                100 mensagens/mês • 1 instância • 500 contatos • Marca d'água
              </p>
            </div>
            <div className="feature-card text-center">
              <h5>STARTER — R$79/mês</h5>
              <p className="muted-small">
                5.000 msgs • 2 instâncias • 5.000 contatos • Templates
                ilimitados
              </p>
            </div>
            <div className="feature-card text-center">
              <h5>PRO — R$199/mês</h5>
              <p className="muted-small">
                20.000 msgs • 5 instâncias • 25.000 contatos • Automações • API
              </p>
            </div>
            <div className="feature-card text-center">
              <h5>ENTERPRISE — R$499/mês</h5>
              <p className="muted-small">
                100k+ msgs • instâncias ilimitadas • contatos ilimitados • IA •
                White-label
              </p>
            </div>
          </div>
        </section>

        <section className="mb-4">
          <h2>Timeline Resumida</h2>
          <p>
            <strong>Mês 1-2:</strong> Fundação — setup, autenticação, schema.
          </p>
          <p>
            <strong>Mês 3-4:</strong> Core — CRUD contatos, templates,
            integração WhatsApp, campanhas.
          </p>
          <p>
            <strong>Mês 5-6:</strong> Polish — pagamentos, analytics, UX e
            lançamento beta.
          </p>
        </section>

        <section className="mb-4">
          <h2>Riscos e Mitigações</h2>
          <ul>
            <li>
              <strong>Risco:</strong> Banimento WhatsApp — <em>Mitigação:</em>{" "}
              rate limiting, múltiplos providers, compliance.
            </li>
            <li>
              <strong>Risco:</strong> Atrasos no desenvolvimento —{" "}
              <em>Mitigação:</em> MVP bem definido, buffer, cortar features.
            </li>
            <li>
              <strong>Risco:</strong> Custos altos — <em>Mitigação:</em> começar
              em plataformas baratas, otimizar queries.
            </li>
          </ul>
        </section>

        <section className="mb-4">
          <h2>Próximos Passos Imediatos</h2>
          <ol>
            <li>Ler análise técnica e validar stack.</li>
            <li>Calcular budget e decidir: sozinho ou contratar.</li>
            <li>Executar primeira tarefa do roadmap.</li>
          </ol>
        </section>

        <footer className="text-center mt-5 mb-5 text-muted">
          <small>
            Resumo gerado em: 26/10/2025 — Versão: Resumo Visual 1.0
          </small>
        </footer>
      </div>
    </>
  );
}
