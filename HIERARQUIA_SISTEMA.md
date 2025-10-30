# 🗂️ HIERARQUIA DO SISTEMA SAAS - WhatsApp Multi-Tenant

**Data:** 28 de Outubro de 2025  
**Projeto:** Sistema SaaS para WhatsApp e Atendimento  
**Arquitetura:** Monorepo (Turborepo) - Backend NestJS + Frontend Next.js

---

## 📊 ESTRUTURA GERAL

```
d:\VS\saas\
├── 📁 apps/                    # Aplicações principais
│   ├── 📁 api/                # Backend NestJS (Port 3001)
│   └── 📁 web/                # Frontend Next.js (Port 3000)
├── 📁 docs/                   # Documentação do projeto
├── 📁 packages/               # Pacotes compartilhados (vazio atualmente)
├── 📁 k8s/                    # Kubernetes manifests
├── 📁 monitoring/             # Grafana + Prometheus
├── 📁 nginx/                  # Configuração Nginx
├── 📁 scripts/                # Scripts de automação
├── 📄 .env                    # Variáveis de ambiente root
├── 📄 package.json            # Configuração Turborepo
├── 📄 turbo.json              # Pipeline Turborepo
└── 📄 DIAGNOSTICO_SISTEMA.md  # Diagnóstico completo (NOVO!)
```

---

## 🎯 APPS - BACKEND (NestJS)

### Estrutura Completa da API

```
apps/api/
├── 📁 prisma/                          # ORM Prisma
│   ├── 📄 schema.prisma               # Schema do banco de dados
│   ├── 📄 seed.ts                     # Seed principal
│   ├── 📄 seed-user.ts                # Criar usuário teste ✅
│   └── 📄 seed-plans.ts               # Criar planos de pagamento
│
├── 📁 src/                            # Código fonte
│   ├── 📄 main.ts                     # Bootstrap da aplicação
│   ├── 📄 app.module.ts               # Módulo principal (Redis desabilitado)
│   │
│   ├── 📁 auth/                       # ✅ Autenticação JWT
│   │   ├── 📄 auth.controller.ts     # POST /auth/login, /register, /refresh
│   │   ├── 📄 auth.service.ts        # Lógica de autenticação
│   │   ├── 📄 auth.module.ts
│   │   ├── 📄 jwt.strategy.ts        # Estratégia JWT Passport
│   │   ├── 📄 jwt.guard.ts           # Guard de autenticação
│   │   ├── 📄 current-user.decorator.ts
│   │   └── 📁 dto/
│   │       ├── 📄 login.dto.ts
│   │       ├── 📄 register.dto.ts
│   │       └── 📄 refresh-token.dto.ts
│   │
│   ├── 📁 users/                      # ✅ Gerenciamento de usuários
│   │   ├── 📄 users.service.ts
│   │   ├── 📄 users.module.ts
│   │   └── 📄 users.service.spec.ts  # Testes
│   │
│   ├── 📁 organizations/              # ✅ Multi-tenancy
│   │   ├── 📄 organizations.controller.ts
│   │   ├── 📄 organizations.service.ts
│   │   ├── 📄 organizations.module.ts
│   │   └── 📁 dto/
│   │       ├── 📄 create-organization.dto.ts
│   │       ├── 📄 invite-member.dto.ts
│   │       └── 📄 accept-invite.dto.ts
│   │
│   ├── 📁 contacts/                   # ✅ Gerenciamento de contatos
│   │   ├── 📄 contacts.controller.ts # CRUD + Import CSV
│   │   ├── 📄 contacts.service.ts
│   │   ├── 📄 contacts.module.ts
│   │   └── 📁 dto/
│   │       ├── 📄 create-contact.dto.ts
│   │       ├── 📄 update-contact.dto.ts
│   │       └── 📄 import-csv.dto.ts
│   │
│   ├── 📁 whatsapp/                   # ✅ WhatsApp Instances
│   │   ├── 📄 whatsapp.controller.ts # CRUD + Connect/Disconnect
│   │   ├── 📄 whatsapp.service.ts    # Integração Evolution API
│   │   ├── 📄 whatsapp.module.ts
│   │   ├── 📁 dto/
│   │   │   ├── 📄 create-instance.dto.ts
│   │   │   └── 📄 update-instance.dto.ts
│   │   └── 📁 providers/
│   │       ├── 📄 whatsapp-provider.interface.ts
│   │       └── 📄 evolution-api.provider.ts  # Provider Evolution API v1
│   │
│   ├── 📁 campaigns/                  # ⚠️ Campanhas (FALTA Processor)
│   │   ├── 📄 campaigns.controller.ts # Start/Pause/Resume
│   │   ├── 📄 campaigns.service.ts   # Adiciona na fila Bull
│   │   ├── 📄 campaigns.module.ts
│   │   ├── 📁 dto/
│   │   │   ├── 📄 create-campaign.dto.ts
│   │   │   ├── 📄 update-campaign.dto.ts
│   │   │   └── 📄 send-campaign.dto.ts
│   │   └── 📁 processors/
│   │       └── 📄 campaign.processor.ts  # ❌ NÃO IMPLEMENTADO
│   │
│   ├── 📁 messages/                   # ⚠️ Mensagens (FALTA Processor)
│   │   ├── 📄 messages.controller.ts # Send/Retry/Stats
│   │   ├── 📄 messages.service.ts    # Adiciona na fila Bull
│   │   ├── 📄 messages.module.ts
│   │   ├── 📁 dto/
│   │   │   ├── 📄 send-message.dto.ts
│   │   │   └── 📄 webhook-message.dto.ts
│   │   └── 📁 processors/
│   │       └── 📄 message.processor.ts   # ❌ NÃO IMPLEMENTADO
│   │
│   ├── 📁 payments/                   # ⚠️ Pagamentos (SEM credenciais)
│   │   ├── 📄 payments.controller.ts # Stripe + MercadoPago
│   │   ├── 📄 payments.service.ts
│   │   ├── 📄 stripe.service.ts
│   │   ├── 📄 mercadopago.service.ts
│   │   ├── 📄 payments.module.ts
│   │   └── 📁 dto/
│   │       └── 📄 subscription.dto.ts
│   │
│   ├── 📁 analytics/                  # ✅ Analytics Completo
│   │   ├── 📄 analytics.controller.ts # Dashboard/Messages/Revenue
│   │   ├── 📄 analytics.service.ts   # Queries SQL otimizadas
│   │   ├── 📄 analytics.module.ts
│   │   └── 📁 dto/
│   │       └── 📄 analytics.dto.ts   # DTOs complexos
│   │
│   ├── 📁 prisma/                     # ✅ Prisma Module
│   │   ├── 📄 prisma.module.ts
│   │   └── 📄 prisma.service.ts
│   │
│   └── 📁 common/                     # Utilitários compartilhados
│       ├── 📁 decorators/
│       │   ├── 📄 public.decorator.ts
│       │   ├── 📄 rate-limit.decorator.ts
│       │   └── 📄 validation.decorators.ts
│       ├── 📁 filters/
│       │   └── 📄 all-exceptions.filter.ts
│       ├── 📁 guards/
│       │   └── 📄 organization.guard.ts  # Multi-tenancy guard
│       ├── 📁 middleware/
│       │   ├── 📄 rate-limiter.middleware.ts
│       │   ├── 📄 request-logger.middleware.ts
│       │   └── 📄 security-headers.middleware.ts
│       ├── 📁 utils/
│       │   └── 📄 validation.utils.ts
│       └── 📁 config/
│           └── 📄 security.config.ts
│
├── 📁 test/                           # Testes E2E
│   └── 📄 auth.e2e-spec.ts
│
├── 📄 package.json                    # Dependências NestJS
├── 📄 tsconfig.json                   # TypeScript config
└── 📄 .env                            # Variáveis de ambiente

```

---

## 🎨 APPS - FRONTEND (Next.js)

### Estrutura Completa do Web

```
apps/web/
├── 📁 src/
│   ├── 📁 pages/                      # Páginas Next.js
│   │   ├── 📄 _app.tsx               # App wrapper
│   │   ├── 📄 index.tsx              # Landing page
│   │   ├── 📄 login.tsx              # ✅ Login (tema verde neon)
│   │   ├── 📄 signup.tsx             # Registro
│   │   ├── 📄 dashboard.tsx          # ✅ Dashboard principal
│   │   ├── 📄 contacts.tsx           # ✅ Gerenciar contatos
│   │   ├── 📄 whatsapp.tsx           # ✅ Instâncias WhatsApp
│   │   ├── 📄 campaigns.tsx          # ✅ Gerenciar campanhas
│   │   ├── 📄 messages.tsx           # ✅ Histórico de mensagens
│   │   ├── 📄 analytics.tsx          # ✅ Analytics dashboard
│   │   ├── 📄 campaign-analytics.tsx # ⚠️ Analytics campanha (import corrigido)
│   │   ├── 📄 plans.tsx              # ⚠️ Planos (import corrigido)
│   │   └── 📄 subscription.tsx       # Assinaturas
│   │
│   ├── 📁 components/                 # Componentes React
│   │   ├── 📄 Layout.tsx             # Layout principal
│   │   ├── 📄 DashboardModals.tsx    # Modais do dashboard
│   │   ├── 📄 LoadingSpinner.tsx     # Loading component
│   │   └── 📄 ErrorMessage.tsx       # Error component
│   │
│   ├── 📁 lib/                        # Bibliotecas e utilitários
│   │   ├── 📁 api/
│   │   │   └── 📄 client.ts          # ✅ Axios client + interceptors
│   │   │
│   │   └── 📁 auth/
│   │       ├── 📄 auth-context.tsx   # Context de autenticação
│   │       ├── 📄 hooks.ts           # useAuth hook
│   │       ├── 📄 protected-route.tsx
│   │       └── 📄 types.ts
│   │
│   └── 📁 styles/                     # Estilos globais
│       └── 📄 globals.css            # CSS global (tema verde)
│
├── 📁 public/                         # Arquivos estáticos
├── 📄 package.json                    # Dependências Next.js
├── 📄 tsconfig.json                   # TypeScript config
├── 📄 next-env.d.ts                   # Next.js types
└── 📄 .eslintrc.json                  # ESLint config

```

---

## 🗄️ DATABASE SCHEMA (Prisma)

### Modelos Principais

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ AUTENTICAÇÃO E USUÁRIOS ============

model User {
  id                 String          @id @default(uuid())
  email              String          @unique
  name               String
  passwordHash       String
  emailVerified      Boolean         @default(false)
  status             UserStatus      @default(ACTIVE)
  
  // Relations
  ownedOrganizations Organization[]  @relation("OrganizationOwner")
  memberships        Membership[]
  payments           Payment[]
  subscriptions      Subscription[]
  
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt
  
  @@map("users")
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  DELETED
}

// ============ MULTI-TENANCY ============

model Organization {
  id               String           @id @default(uuid())
  name             String
  slug             String           @unique
  ownerId          String
  owner            User             @relation("OrganizationOwner", fields: [ownerId], references: [id])
  
  // Relations
  memberships      Membership[]
  contacts         Contact[]
  campaigns        Campaign[]
  messages         Message[]
  whatsappInstances WhatsappInstance[]
  
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  
  @@map("organizations")
}

model Membership {
  id             String           @id @default(uuid())
  userId         String
  organizationId String
  role           MembershipRole   @default(MEMBER)
  
  user           User             @relation(fields: [userId], references: [id])
  organization   Organization     @relation(fields: [organizationId], references: [id])
  
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  @@unique([userId, organizationId])
  @@map("memberships")
}

enum MembershipRole {
  OWNER
  ADMIN
  MEMBER
}

// ============ CONTATOS ============

model Contact {
  id             String           @id @default(uuid())
  organizationId String
  name           String?
  phone          String
  email          String?
  tags           String[]
  
  organization   Organization     @relation(fields: [organizationId], references: [id])
  messages       Message[]
  campaignRecipients CampaignRecipient[]
  
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  @@unique([organizationId, phone])
  @@map("contacts")
}

// ============ WHATSAPP ============

model WhatsappInstance {
  id             String           @id @default(uuid())
  organizationId String
  name           String
  phoneNumber    String
  status         InstanceStatus   @default(DISCONNECTED)
  qrCode         String?
  
  organization   Organization     @relation(fields: [organizationId], references: [id])
  campaigns      Campaign[]
  messages       Message[]
  
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  @@unique([organizationId, phoneNumber])
  @@map("whatsapp_instances")
}

enum InstanceStatus {
  CONNECTED
  DISCONNECTED
  CONNECTING
  BANNED
}

// ============ MENSAGENS ============

model Message {
  id             String           @id @default(uuid())
  organizationId String
  contactId      String
  instanceId     String
  direction      MessageDirection
  body           String
  status         MessageStatus    @default(PENDING)
  errorMessage   String?
  externalId     String?
  
  organization   Organization     @relation(fields: [organizationId], references: [id])
  contact        Contact          @relation(fields: [contactId], references: [id])
  instance       WhatsappInstance @relation(fields: [instanceId], references: [id])
  
  sentAt         DateTime?
  deliveredAt    DateTime?
  readAt         DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  @@map("messages")
}

enum MessageDirection {
  INBOUND
  OUTBOUND
}

enum MessageStatus {
  PENDING
  SENT
  DELIVERED
  READ
  FAILED
}

// ============ CAMPANHAS ============

model Campaign {
  id              String           @id @default(uuid())
  organizationId  String
  name            String
  instanceId      String
  templateId      String?
  message         String
  status          CampaignStatus   @default(DRAFT)
  
  totalRecipients Int              @default(0)
  sentCount       Int              @default(0)
  deliveredCount  Int              @default(0)
  failedCount     Int              @default(0)
  
  organization    Organization     @relation(fields: [organizationId], references: [id])
  instance        WhatsappInstance @relation(fields: [instanceId], references: [id])
  recipients      CampaignRecipient[]
  
  scheduledAt     DateTime?
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  @@map("campaigns")
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  PAUSED
  COMPLETED
  CANCELLED
}

model CampaignRecipient {
  id             String           @id @default(uuid())
  campaignId     String
  contactId      String
  status         MessageStatus    @default(PENDING)
  messageId      String?
  errorMessage   String?
  
  campaign       Campaign         @relation(fields: [campaignId], references: [id])
  contact        Contact          @relation(fields: [contactId], references: [id])
  
  sentAt         DateTime?
  deliveredAt    DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  @@unique([campaignId, contactId])
  @@map("campaign_recipients")
}

// ============ PAGAMENTOS ============

model Plan {
  id              String           @id @default(uuid())
  name            String
  slug            String           @unique
  description     String?
  priceMonthly    Decimal          @db.Decimal(10, 2)
  priceYearly     Decimal          @db.Decimal(10, 2)
  
  features        String[]
  maxContacts     Int
  maxMessagesMonth Int
  maxInstances    Int
  maxUsers        Int
  
  subscriptions   Subscription[]
  
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  @@map("plans")
}

model Subscription {
  id              String           @id @default(uuid())
  userId          String
  planId          String
  status          SubscriptionStatus @default(ACTIVE)
  
  user            User             @relation(fields: [userId], references: [id])
  plan            Plan             @relation(fields: [planId], references: [id])
  payments        Payment[]
  
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  canceledAt      DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  @@map("subscriptions")
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  PAUSED
}

model Payment {
  id              String           @id @default(uuid())
  userId          String
  subscriptionId  String?
  amount          Decimal          @db.Decimal(10, 2)
  currency        String           @default("BRL")
  status          PaymentStatus    @default(PENDING)
  paymentProvider String
  providerPaymentId String?
  
  user            User             @relation(fields: [userId], references: [id])
  subscription    Subscription?    @relation(fields: [subscriptionId], references: [id])
  
  paidAt          DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  @@map("payments")
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}
```

---

## 🔑 ENDPOINTS DA API

### Autenticação
```
POST   /auth/register          # Criar conta
POST   /auth/login             # Login
POST   /auth/refresh           # Refresh token
GET    /auth/me                # Dados do usuário logado
```

### Organizations
```
POST   /organizations                        # Criar organização
GET    /organizations                        # Listar organizações
GET    /organizations/:id                    # Detalhes
GET    /organizations/:id/members            # Membros
POST   /organizations/:id/invite             # Convidar membro
POST   /organizations/invitations/accept     # Aceitar convite
```

### Contatos
```
POST   /contacts               # Criar contato
GET    /contacts               # Listar contatos (paginado)
GET    /contacts/:id           # Detalhes
PATCH  /contacts/:id           # Atualizar
DELETE /contacts/:id           # Deletar
POST   /contacts/import/csv    # Importar CSV
```

### WhatsApp Instances
```
POST   /whatsapp/instances                # Criar instância
GET    /whatsapp/instances                # Listar instâncias
GET    /whatsapp/instances/:id            # Detalhes
PATCH  /whatsapp/instances/:id            # Atualizar
DELETE /whatsapp/instances/:id            # Deletar
GET    /whatsapp/instances/:id/qrcode     # Obter QR Code
POST   /whatsapp/instances/:id/connect    # Conectar
POST   /whatsapp/instances/:id/disconnect # Desconectar
```

### Mensagens
```
POST   /messages              # Enviar mensagem
GET    /messages              # Listar mensagens
GET    /messages/stats        # Estatísticas
GET    /messages/:id          # Detalhes
POST   /messages/:id/retry    # Reenviar
POST   /messages/webhook      # Webhook Evolution API
```

### Campanhas
```
POST   /campaigns             # Criar campanha
GET    /campaigns             # Listar campanhas
GET    /campaigns/:id         # Detalhes
PATCH  /campaigns/:id         # Atualizar
DELETE /campaigns/:id         # Deletar
POST   /campaigns/:id/start   # Iniciar
POST   /campaigns/:id/pause   # Pausar
POST   /campaigns/:id/resume  # Retomar
GET    /campaigns/:id/stats   # Estatísticas
```

### Analytics
```
GET    /analytics/dashboard           # Métricas gerais
GET    /analytics/messages            # Análise de mensagens
GET    /analytics/revenue             # Análise de receita
GET    /analytics/campaigns/:id       # Análise de campanha
```

### Pagamentos
```
GET    /payments/plans                       # Listar planos
POST   /payments/subscriptions               # Criar assinatura
GET    /payments/subscriptions               # Listar assinaturas
POST   /payments/subscriptions/cancel        # Cancelar
POST   /payments/subscriptions/update        # Atualizar
GET    /payments/payments                    # Histórico
POST   /payments/webhook/stripe              # Webhook Stripe
POST   /payments/webhook/mercadopago         # Webhook MercadoPago
```

---

## 📚 DOCUMENTAÇÃO

```
docs/
├── 📄 ANALYTICS.md              # Documentação Analytics
├── 📄 CODE_EXAMPLES.md          # Exemplos de código
├── 📄 CODE_QUALITY.md           # Padrões de qualidade
├── 📄 DEPLOY.md                 # Guia de deploy
└── 📄 SECURITY.md               # Segurança
```

---

## ⚙️ CONFIGURAÇÕES

### Variáveis de Ambiente (.env)

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"

# Redis (DESABILITADO - sem Redis instalado)
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"

# Evolution API
EVOLUTION_API_URL="https://dev.evo.sistemabrasil.online"
EVOLUTION_API_KEY="9B6P43RdEvTqlS6gEKHJY08LGEOSNIDp"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Payments (NÃO CONFIGURADO)
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
# MERCADOPAGO_ACCESS_TOKEN=

# Email (NÃO CONFIGURADO)
# SMTP_HOST=
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASSWORD=
# MAIL_FROM=
```

---

## 🔄 FLUXOS PRINCIPAIS

### 1. Autenticação
```
User -> Login Page -> POST /auth/login
     -> API verifica email/senha
     -> Retorna JWT + Refresh Token
     -> Armazena em localStorage
     -> Redireciona para /dashboard
```

### 2. Multi-Tenancy
```
User -> Tem Organization (via Membership)
     -> Todos endpoints recebem ?organizationId=xxx
     -> OrganizationGuard valida permissão
     -> Retorna apenas dados da organização
```

### 3. Envio de Mensagem (ATUAL - Sem Processor)
```
User -> Dashboard -> Preenche formulário
     -> POST /messages
     -> Cria registro no banco (status: PENDING)
     -> Adiciona job na fila Bull
     -> ❌ SEM PROCESSOR = Fica em PENDING para sempre
```

### 4. Campanha (ATUAL - Sem Processor)
```
User -> Criar Campanha -> Seleciona contatos
     -> POST /campaigns
     -> Cria campanha + recipients
     -> POST /campaigns/:id/start
     -> Adiciona job na fila Bull
     -> ❌ SEM PROCESSOR = Fica em SENDING para sempre
```

### 5. Instância WhatsApp
```
User -> Criar Instância
     -> POST /whatsapp/instances
     -> EvolutionApiProvider.createInstance()
     -> Retorna instância
     -> User clica "Conectar"
     -> GET /whatsapp/instances/:id/qrcode
     -> Exibe QR Code
     -> User escaneia com WhatsApp
     -> Status muda para CONNECTED
```

---

## 📊 STATUS ATUAL DO SISTEMA

### ✅ FUNCIONANDO (70%)

- ✅ Autenticação JWT completa
- ✅ Multi-tenancy (Organizations + Memberships)
- ✅ CRUD de Contatos (+ Import CSV)
- ✅ CRUD de Instâncias WhatsApp
- ✅ Integração Evolution API
- ✅ CRUD de Campanhas
- ✅ CRUD de Mensagens
- ✅ Analytics completo (todas métricas)
- ✅ Frontend Next.js com tema verde neon
- ✅ Proteção de rotas
- ✅ API rodando na porta 3001
- ✅ Frontend rodando na porta 3000

### ⚠️ PARCIALMENTE FUNCIONANDO (20%)

- ⚠️ Mensagens: Cria no banco, mas NÃO envia (sem processor)
- ⚠️ Campanhas: Cria no banco, mas NÃO executa (sem processor)
- ⚠️ Pagamentos: Código pronto, mas SEM credenciais Stripe/MercadoPago
- ⚠️ Bull Queue: Configurado, mas Redis offline

### ❌ NÃO IMPLEMENTADO (10%)

- ❌ Message Processor (envio real via Evolution API)
- ❌ Campaign Processor (processamento de campanhas)
- ❌ Sistema de Emails (recuperação senha, notificações)
- ❌ Webhooks Evolution API (status de mensagens)
- ❌ Testes automatizados (E2E, Unit)
- ❌ Redis (Bull Queue offline)

---

## 🚀 PRÓXIMOS PASSOS

### Prioridade 1 (URGENTE)
1. ✅ Instalar Redis OU usar Redis Cloud
2. ✅ Criar Message Processor
3. ✅ Criar Campaign Processor
4. ✅ Testar envio real de mensagem

### Prioridade 2 (IMPORTANTE)
1. Configurar Stripe/MercadoPago
2. Criar planos no banco
3. Implementar sistema de emails
4. Webhooks Evolution API

### Prioridade 3 (DESEJÁVEL)
1. Testes automatizados
2. Monitoramento (Sentry)
3. CI/CD
4. Documentação Swagger

---

## 📞 COMANDOS ÚTEIS

```bash
# Iniciar API
cd d:\VS\saas\apps\api
npm run dev

# Iniciar Frontend
cd d:\VS\saas\apps\web
npm run dev

# Prisma
npx prisma studio              # Abrir banco de dados
npx prisma migrate dev         # Rodar migrations
npx ts-node prisma/seed-user.ts # Criar usuário teste

# Verificar servidores
netstat -ano | findstr ":3000 :3001"

# Verificar Redis
redis-cli ping

# Logs
# API: Terminal onde rodou npm run dev
# Frontend: Terminal onde rodou npm run dev
```

---

## 🔐 CREDENCIAIS DE TESTE

```
Email: admin@example.com
Senha: admin123

Organização: Organização Teste
Slug: teste-org
```

---

**Última atualização:** 28/10/2025 20:55  
**Versão:** 1.0  
**Autor:** Sistema de Diagnóstico Automático
