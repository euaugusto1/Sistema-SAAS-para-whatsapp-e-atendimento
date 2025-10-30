import React, { useState, useEffect } from "react";
import Head from "next/head";

export default function Home() {
  const [animatedNumbers, setAnimatedNumbers] = useState({
    users: 0,
    messages: 0,
    revenue: 0,
    satisfaction: 0
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedNumbers({
        users: 1000,
        messages: 250000,
        revenue: 840000,
        satisfaction: 98
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>SaaS WhatsApp Platform — Transforme sua Comunicação</title>
        <meta
          name="description"
          content="Plataforma SaaS completa para disparos WhatsApp com multi-tenancy, analytics avançado e automação. Aumente sua conversão em até 300%."
        />
        <meta name="keywords" content="WhatsApp, SaaS, Marketing Digital, Automação, Campanhas" />
      </Head>

      <div className="landing-page">
        {/* Navigation */}
        <nav className="navbar">
          <div className="nav-container">
            <div className="brand">
              <div className="logo">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="url(#gradient)" />
                  <path d="M8 12L16 8L24 12V20C24 22.2091 22.2091 24 20 24H12C9.79086 24 8 22.2091 8 20V12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 8V16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="brand-text">
                <span className="brand-name">WhatsApp SaaS</span>
                <span className="brand-tagline">Professional Platform</span>
              </div>
            </div>
            <div className="nav-actions">
              <a className="nav-link" href="#features">Features</a>
              <a className="nav-link" href="#pricing">Preços</a>
              <a className="btn btn-ghost" href="/login">Entrar</a>
              <a className="btn btn-primary" href="/signup">Começar Grátis</a>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-content">
              <div className="hero-badge">
                🚀 Agora com IA Integrada
              </div>
              <h1 className="hero-title">
                Transforme sua Comunicação com 
                <span className="gradient-text"> WhatsApp Profissional</span>
              </h1>
              <p className="hero-subtitle">
                Plataforma SaaS completa para disparos em massa, automação inteligente e analytics avançado. 
                Aumente sua conversão em até <strong>300%</strong> com nossa tecnologia de ponta.
              </p>
              <div className="hero-actions">
                <a className="btn btn-hero-primary" href="/signup">
                  <span>Começar Grátis</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
                <a className="btn btn-hero-secondary" href="#demo">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Ver Demo
                </a>
              </div>
              <div className="hero-social-proof">
                <span className="social-proof-text">Confiado por</span>
                <div className="social-proof-numbers">
                  <span className="stat-number">{animatedNumbers.users.toLocaleString()}+</span>
                  <span className="stat-label">empresas</span>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="dashboard-mockup">
                <div className="mockup-header">
                  <div className="mockup-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <span className="mockup-title">WhatsApp Dashboard</span>
                </div>
                <div className="mockup-content">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon purple">📱</div>
                      <div className="stat-info">
                        <span className="stat-value">{(animatedNumbers.messages / 1000).toFixed(0)}K</span>
                        <span className="stat-label">Mensagens</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon blue">💰</div>
                      <div className="stat-info">
                        <span className="stat-value">R$ {(animatedNumbers.revenue / 1000).toFixed(0)}K</span>
                        <span className="stat-label">Receita</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon green">⭐</div>
                      <div className="stat-info">
                        <span className="stat-value">{animatedNumbers.satisfaction}%</span>
                        <span className="stat-label">Satisfação</span>
                      </div>
                    </div>
                  </div>
                  <div className="chart-mockup">
                    <div className="chart-bars">
                      <div className="bar" style={{height: '60%'}}></div>
                      <div className="bar" style={{height: '80%'}}></div>
                      <div className="bar" style={{height: '45%'}}></div>
                      <div className="bar" style={{height: '90%'}}></div>
                      <div className="bar" style={{height: '75%'}}></div>
                      <div className="bar" style={{height: '95%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Recursos Poderosos</h2>
              <p className="section-subtitle">
                Tudo que você precisa para dominar o WhatsApp Business
              </p>
            </div>
            <div className="features-grid">
              <div className="feature-card premium">
                <div className="feature-icon purple">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                  </svg>
                </div>
                <h3 className="feature-title">Disparos em Massa</h3>
                <p className="feature-description">
                  Envie milhares de mensagens personalizadas com delivery garantido e rate limiting inteligente.
                </p>
                <ul className="feature-list">
                  <li>✓ Até 100K mensagens/mês</li>
                  <li>✓ Múltiplas instâncias</li>
                  <li>✓ Anti-ban protection</li>
                </ul>
              </div>

              <div className="feature-card premium">
                <div className="feature-icon blue">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                  </svg>
                </div>
                <h3 className="feature-title">Analytics Avançado</h3>
                <p className="feature-description">
                  Dashboard completo com métricas em tempo real, ROI tracking e insights acionáveis.
                </p>
                <ul className="feature-list">
                  <li>✓ Dashboards interativos</li>
                  <li>✓ ROI em tempo real</li>
                  <li>✓ Relatórios customizados</li>
                </ul>
              </div>

              <div className="feature-card premium">
                <div className="feature-icon green">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <h3 className="feature-title">Automação IA</h3>
                <p className="feature-description">
                  Chatbots inteligentes com processamento de linguagem natural e respostas automáticas.
                </p>
                <ul className="feature-list">
                  <li>✓ Chatbot com IA</li>
                  <li>✓ Funis automáticos</li>
                  <li>✓ Segmentação inteligente</li>
                </ul>
              </div>

              <div className="feature-card">
                <div className="feature-icon orange">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h3 className="feature-title">Multi-Tenant</h3>
                <p className="feature-description">
                  Gerencie múltiplas empresas com isolamento completo de dados e permissões granulares.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon red">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                </div>
                <h3 className="feature-title">Segurança Avançada</h3>
                <p className="feature-description">
                  Criptografia ponta-a-ponta, compliance LGPD e backups automáticos.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon teal">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h3 className="feature-title">API Completa</h3>
                <p className="feature-description">
                  Integre com qualquer sistema usando nossa API REST robusta e documentação completa.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="pricing-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Planos que Escalam com Você</h2>
              <p className="section-subtitle">
                Escolha o plano ideal para o tamanho do seu negócio
              </p>
            </div>
            <div className="pricing-grid">
              <div className="pricing-card">
                <div className="pricing-header">
                  <h3 className="plan-name">Starter</h3>
                  <div className="plan-price">
                    <span className="price">R$ 0</span>
                    <span className="period">/mês</span>
                  </div>
                  <p className="plan-description">Perfeito para começar</p>
                </div>
                <div className="pricing-features">
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    100 mensagens/mês
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    1 instância WhatsApp
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    500 contatos
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Suporte básico
                  </div>
                </div>
                <a href="/signup" className="btn btn-plan">Começar Grátis</a>
              </div>

              <div className="pricing-card popular">
                <div className="popular-badge">Mais Popular</div>
                <div className="pricing-header">
                  <h3 className="plan-name">Professional</h3>
                  <div className="plan-price">
                    <span className="price">R$ 99</span>
                    <span className="period">/mês</span>
                  </div>
                  <p className="plan-description">Para empresas em crescimento</p>
                </div>
                <div className="pricing-features">
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    5.000 mensagens/mês
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    2 instâncias WhatsApp
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    2.000 contatos
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Analytics avançado
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Automações
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Suporte prioritário
                  </div>
                </div>
                <a href="/signup" className="btn btn-plan-popular">Começar Teste</a>
              </div>

              <div className="pricing-card">
                <div className="pricing-header">
                  <h3 className="plan-name">Enterprise</h3>
                  <div className="plan-price">
                    <span className="price">R$ 299</span>
                    <span className="period">/mês</span>
                  </div>
                  <p className="plan-description">Para grandes empresas</p>
                </div>
                <div className="pricing-features">
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Mensagens ilimitadas
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Instâncias ilimitadas
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Contatos ilimitados
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    IA Avançada
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    White-label
                  </div>
                  <div className="feature-item">
                    <svg className="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Suporte 24/7
                  </div>
                </div>
                <a href="/signup" className="btn btn-plan">Contatar Vendas</a>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <div className="container">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">{animatedNumbers.users.toLocaleString()}+</div>
                <div className="stat-label">Empresas Ativas</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{(animatedNumbers.messages / 1000).toFixed(0)}K+</div>
                <div className="stat-label">Mensagens Enviadas</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{animatedNumbers.satisfaction}%</div>
                <div className="stat-label">Taxa de Satisfação</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Suporte Técnico</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="container">
            <div className="cta-content">
              <h2 className="cta-title">Pronto para Transformar sua Comunicação?</h2>
              <p className="cta-subtitle">
                Junte-se a mais de 1.000 empresas que já aumentaram suas vendas em até 300% com nossa plataforma.
              </p>
              <div className="cta-actions">
                <a href="/signup" className="btn btn-cta-primary">
                  Começar Teste Grátis
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#pricing" className="btn btn-cta-secondary">Ver Preços</a>
              </div>
              <div className="cta-note">
                ✅ Sem compromisso • ✅ Configuração em 5 minutos • ✅ Suporte incluído
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-brand">
                <div className="brand">
                  <div className="logo">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <rect width="32" height="32" rx="8" fill="url(#footerGradient)" />
                      <path d="M8 12L16 8L24 12V20C24 22.2091 22.2091 24 20 24H12C9.79086 24 8 22.2091 8 20V12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 8V16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <defs>
                        <linearGradient id="footerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#8B5CF6" />
                          <stop offset="100%" stopColor="#06B6D4" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="brand-text">
                    <span className="brand-name">WhatsApp SaaS</span>
                    <span className="brand-tagline">Professional Platform</span>
                  </div>
                </div>
                <p className="footer-description">
                  A plataforma mais completa para disparos WhatsApp com tecnologia de ponta e suporte 24/7.
                </p>
              </div>
              <div className="footer-links">
                <div className="link-group">
                  <h4>Produto</h4>
                  <a href="#features">Recursos</a>
                  <a href="#pricing">Preços</a>
                  <a href="/signup">Teste Grátis</a>
                  <a href="/api-docs">API</a>
                </div>
                <div className="link-group">
                  <h4>Empresa</h4>
                  <a href="/about">Sobre</a>
                  <a href="/blog">Blog</a>
                  <a href="/careers">Carreiras</a>
                  <a href="/contact">Contato</a>
                </div>
                <div className="link-group">
                  <h4>Suporte</h4>
                  <a href="/help">Central de Ajuda</a>
                  <a href="/docs">Documentação</a>
                  <a href="/status">Status</a>
                  <a href="/security">Segurança</a>
                </div>
                <div className="link-group">
                  <h4>Legal</h4>
                  <a href="/privacy">Privacidade</a>
                  <a href="/terms">Termos</a>
                  <a href="/cookies">Cookies</a>
                  <a href="/gdpr">LGPD</a>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <div className="footer-copy">
                © 2025 WhatsApp SaaS. Todos os direitos reservados.
              </div>
              <div className="footer-social">
                <span>Siga-nos:</span>
                <a href="#" className="social-link">Twitter</a>
                <a href="#" className="social-link">LinkedIn</a>
                <a href="#" className="social-link">YouTube</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
