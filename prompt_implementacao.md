# 🤖 Plano Revisado — Plataforma SaaS de Disparos WhatsApp

## 1. Visão Geral
- **Objetivo**: evoluir o MVP atual para um SaaS multi-tenant com ofertas pagas, automações e analytics.
- **Situação**: monorepo criado, homepage e fluxo básico de autenticação web prontos; backend NestJS ainda minimalista.
- **Motivo da revisão**: o documento anterior descrevia um futuro idealizado (Next App Router, módulos completos). Este arquivo passa a refletir o código real e guia a evolução.

## 2. Estado Atual do Repositório
### Frontend (`apps/web`)
- Next.js com rotas em `pages/`, TypeScript e Bootstrap 5.
- AuthProvider, hooks e ProtectedRoute funcionando (`lib/auth/*`, `_app.tsx`).
- Telas públicas (landing, login, signup) e dashboard ainda simples.
- Falta migração para Tailwind/shadcn, páginas para contatos/campanhas, estados de loading/erro padronizados.

### Backend (`apps/api`)
- NestJS com módulos `auth`/`users` iniciados, porém sem guards, DTOs ou testes.
- Prisma configurado, `schema.prisma` expandido porém sem migrations/seed aplicados.
- Falta isolamento multi-tenant, refresh tokens, validações e endpoints de negócio.

### Infra/Docs
- Scripts de dev básicos, Docker Compose inicial, docs organizados (`docs/`, `todo list`).
- Ainda não há CI/CD, monitoramento ou documentação de deploy.

## 3. Lacunas vs Objetivo Original
| Tema | Situação | Ação crítica |
|------|----------|--------------|
| Multi-tenancy | Ausente | Implementar módulo `organizations`, memberships e guard |
| Autenticação backend | Parcial | DTOs, hashing, refresh tokens, rota `/auth/me`, guard JWT |
| Dashboard/UI | Parcial | Layout protegido, navegação e estados de carregamento |
| Contatos & Campanhas | Não iniciado | Modelar Prisma, services/rotas Nest e telas Next |
| Integração WhatsApp | Não iniciado | Provider Evolution API, armazenamento de sessões |
| Filas & Workers | Não iniciado | Configurar Bull + Redis, processors |
| Pagamentos | Não iniciado | Modelar `subscriptions`, integrar Stripe/MP |
| DevOps/Segurança | Não iniciado | ESLint/Prettier, Husky, CI/CD, observabilidade |

## 4. Prioridades (Próximas 2-3 Semanas)
1. **Autenticação sólida no backend**: DTOs `class-validator`, `JwtStrategy`, `JwtAuthGuard`, refresh token persistido, `/auth/me` retornando usuário+organizações.
2. **Multi-tenancy mínimo viável**: modelos Prisma para `Organization`, `OrganizationMember`, `OrganizationInvite`; serviço Nest com criação automática de organização e guard de acesso.
3. **Sincronizar frontend e backend**: ajustar `apiClient` e telas de login/signup para consumir respostas padronizadas (tokens, usuário, organização), tratar estados de loading/erro.
4. **Migrations e seed**: gerar migration inicial, rodar `prisma generate`, criar seed (usuário admin, plano default, organização demo).

## 5. Roadmap Macro
### Fase A — Fundamentos (Semanas 1-2)
- Autenticação backend completa, multi-tenant básico, migrations/seed, testes de auth.

### Fase B — Contatos & Templates (Semanas 3-5)
- CRUD de contatos, importação CSV, listas, templates básicos; telas Next correspondentes.

### Fase C — WhatsApp & Filas (Semanas 6-8)
- Integração Evolution API (instâncias, QR, status), Bull queues + workers, webhooks de entrega.

### Fase D — Campanhas & Analytics (Semanas 9-11)
- Fluxo completo de campanhas, dashboards com métricas Recharts, filtros por organização/campanha.

### Fase E — Pagamentos & Deploy (Semanas 12-13)
- Stripe/MercadoPago, planos/assinaturas, billing page, CI/CD, Dockerfiles, monitoramento (Sentry).

## 6. Diretrizes Técnicas Atualizadas
### Backend
- Node 20, NestJS, Prisma, PostgreSQL, Redis.
- JWT + refresh tokens com hash, guards multi-tenant.
- `ValidationPipe` global, DTOs tipados, Swagger pós-estabilização.
- Helmet, CORS restritivo, rate limiting após Redis estável.

### Frontend
- Next.js (Pages Router) + React Query/Zustand (planejado).
- Bootstrap atual; migração progressiva para Tailwind + shadcn quando design system estiver pronto.
- Forms com React Hook Form + Zod após telas de contatos/campanhas.

### Observabilidade & Operações
- GitHub Actions (lint/test/build), logs estruturados (Winston), Sentry, documentação de deploy (Vercel/Railway).
- Docker Compose com Postgres, Redis, Maildev; health checks para API e filas.

## 7. Checklist de Qualidade
### Backend
- [ ] DTOs + validação
- [ ] JwtStrategy + JwtAuthGuard + OrganizationGuard
- [ ] Logger padronizado
- [ ] Migrations/seed aplicados
- [ ] Testes (unit + e2e auth)
- [ ] Swagger inicial

### Frontend
- [x] AuthProvider + ProtectedRoute
- [ ] Loading/empty/error states consistentes
- [ ] Dashboard com dados reais
- [ ] Telas de contatos/campanhas
- [ ] Migração gradual para Tailwind/shadcn

### DevOps/Security
- [ ] ESLint/Prettier/Husky
- [ ] CI/CD GitHub Actions
- [ ] Docker Compose completo
- [ ] Monitoramento (Sentry) e logs agregados
- [ ] Rate limiting e headers de segurança extras

## 8. Próximos Passos Recomendados
1. Rodar `npm install` no backend para garantir `class-validator`/`class-transformer`.
2. Ajustar `prisma/schema.prisma`, gerar migration e `prisma generate`.
3. Atualizar frontend para consumir as novas respostas e tratar revalidação/refresh.
4. Criar testes (unit `users.service`, e2e auth) para suportar refatorações futuras.
5. Implementar serviços/guards definitivos de auth e organizações (incluindo refresh tokens guardados em `sessions`).
6. Expor endpoints `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/me`, `/organizations/*` condizentes.

---
Manter este documento vivo: revisar a cada entrega relevante, registrando decisões arquiteturais e ajustes de roadmap conforme o projeto avança.
