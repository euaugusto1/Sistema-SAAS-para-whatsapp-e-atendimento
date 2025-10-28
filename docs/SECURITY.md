# Security Guide

## 🔒 Visão Geral de Segurança

Este documento descreve todas as medidas de segurança implementadas no sistema.

---

## 📋 Camadas de Segurança

### 1. **HTTP Security Headers (Helmet)**

Configurado em `main.ts` com:

```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
})
```

**Headers Aplicados:**
- ✅ `X-Frame-Options: DENY` - Previne clickjacking
- ✅ `X-Content-Type-Options: nosniff` - Previne MIME sniffing
- ✅ `X-XSS-Protection: 1; mode=block` - XSS protection
- ✅ `Strict-Transport-Security` - Force HTTPS
- ✅ `Content-Security-Policy` - CSP rules
- ✅ `Referrer-Policy` - Controla informações de referrer
- ✅ `Permissions-Policy` - Desabilita APIs sensíveis

---

### 2. **CORS (Cross-Origin Resource Sharing)**

Configuração restritiva em produção:

```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
});
```

**Configuração (.env):**
```bash
ALLOWED_ORIGINS=https://app.seudominio.com,https://admin.seudominio.com
```

---

### 3. **Rate Limiting (DDoS Protection)**

#### **Global Rate Limiter (Throttler)**

```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,      // 1 minute window
  limit: 100,      // 100 requests per IP
}])
```

#### **Custom Rate Limiter Middleware**

- **Padrão**: 100 requisições/minuto
- **Strict**: 5 requisições/minuto (login, register)
- **Moderate**: 30 requisições/minuto

**Headers de Rate Limit:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-10-28T10:15:00.000Z
Retry-After: 45
```

**Uso nos Controllers:**

```typescript
// Strict rate limit (5 req/min)
@StrictRateLimit()
@Post('login')
async login() {}

// Moderate rate limit (30 req/min)
@ModerateRateLimit()
@Post('send-message')
async send() {}

// Skip rate limit (webhooks externos)
@SkipRateLimit()
@Post('webhook')
async webhook() {}
```

---

### 4. **Input Validation & Sanitization**

#### **ValidationPipe Global**

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,                    // Remove propriedades não decoradas
    forbidNonWhitelisted: true,         // Rejeita propriedades extras
    transform: true,                    // Auto-transforma tipos
    disableErrorMessages: prod,         // Esconde detalhes em produção
  }),
);
```

#### **Custom Validators**

**Phone Number:**
```typescript
@IsPhoneNumber()
phone: string; // Valida formato brasileiro (5511999999999)
```

**Webhook URL:**
```typescript
@IsWebhookUrl()
webhookUrl: string; // Requer HTTPS em produção
```

**Safe Input:**
```typescript
@IsSafe()
message: string; // Previne SQL injection e XSS
```

#### **Sanitization Utils**

```typescript
// HTML sanitization
const safe = SanitizeHtmlPipe.sanitize(userInput);

// SQL injection prevention
const safe = InputSanitizer.sanitizeSql(query);

// Filename sanitization
const safe = InputSanitizer.sanitizeFilename(file);

// Object sanitization
const safe = InputSanitizer.sanitizeObject(data);
```

---

### 5. **Authentication & Authorization**

#### **JWT Strategy**

- **Access Token**: 15 minutos (curto para segurança)
- **Refresh Token**: 7 dias (longo para conveniência)
- **Algoritmo**: HS256
- **Secret**: Min 32 caracteres (gerado aleatoriamente)

**Configuração (.env):**
```bash
JWT_SECRET=use_openssl_rand_base64_32_to_generate
JWT_REFRESH_SECRET=use_another_random_secret_here
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
```

**Gerar Secrets Seguros:**
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
```

#### **Guards**

**JwtAuthGuard:**
```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
async protected() {}
```

**OrganizationGuard:**
```typescript
@UseGuards(JwtAuthGuard, OrganizationGuard)
@Get('data')
async getData(@Query('organizationId') orgId: string) {}
```

**Public Routes:**
```typescript
@Public() // Bypass authentication
@Post('login')
async login() {}
```

---

### 6. **Error Handling**

#### **Global Exception Filter**

```typescript
// Production: Esconde stack traces
{
  "statusCode": 500,
  "message": "An unexpected error occurred",
  "timestamp": "2025-10-28T10:00:00.000Z",
  "path": "/api/endpoint"
}

// Development: Mostra detalhes
{
  "statusCode": 500,
  "message": "Database connection failed",
  "timestamp": "2025-10-28T10:00:00.000Z",
  "path": "/api/endpoint",
  "stack": "Error: Database connection failed\n  at ..."
}
```

---

### 7. **Request Logging**

Todos os requests são logados:

```
[HTTP] GET /api/users 200 1234b - 45ms - 192.168.1.1 - Mozilla/5.0...
[HTTP] POST /api/login 401 - 12ms - 192.168.1.1 - ...
[HTTP] GET /api/campaigns 500 - 230ms - 192.168.1.1 - ...
```

**Níveis:**
- ✅ `2xx` - LOG (sucesso)
- ⚠️ `4xx` - WARN (erro cliente)
- 🔴 `5xx` - ERROR (erro servidor)

---

## 🛡️ Security Best Practices

### 1. **Secrets Management**

```bash
# ❌ NUNCA faça isso
JWT_SECRET=123456

# ✅ SEMPRE use secrets fortes
JWT_SECRET=$(openssl rand -base64 32)
```

**Checklist:**
- [ ] JWT secrets com min 32 caracteres
- [ ] Secrets diferentes para access e refresh tokens
- [ ] Encryption key com 32 caracteres
- [ ] Session secret aleatório
- [ ] Nunca commitar .env no Git
- [ ] Usar .env.example sem valores reais

---

### 2. **Password Security**

```typescript
// ❌ NUNCA armazene senhas em plain text
user.password = '123456';

// ✅ SEMPRE use bcrypt
import * as bcrypt from 'bcrypt';
const salt = await bcrypt.genSalt(10);
user.password = await bcrypt.hash(password, salt);
```

**Requisitos de Senha:**
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial

---

### 3. **SQL Injection Prevention**

```typescript
// ❌ NUNCA concatene strings em queries
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// ✅ SEMPRE use Prisma (já é seguro)
await prisma.user.findUnique({ where: { email } });
```

---

### 4. **XSS Prevention**

```typescript
// ❌ NUNCA renderize HTML sem sanitizar
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SEMPRE sanitize input
const safe = SanitizeHtmlPipe.sanitize(userInput);
<div>{safe}</div>
```

---

### 5. **CSRF Protection**

```typescript
// Para formulários web, use CSRF tokens
// Next.js já tem proteção built-in via Same-Site cookies
```

---

## 🔐 Production Checklist

### **Antes do Deploy:**

- [ ] **Secrets**
  - [ ] JWT_SECRET gerado com openssl
  - [ ] JWT_REFRESH_SECRET diferente do access
  - [ ] ENCRYPTION_KEY com 32 caracteres
  - [ ] SESSION_SECRET aleatório
  - [ ] Todos secrets no vault (não no código)

- [ ] **Environment**
  - [ ] NODE_ENV=production
  - [ ] ALLOWED_ORIGINS configurado corretamente
  - [ ] DATABASE_URL com SSL habilitado
  - [ ] REDIS_URL com autenticação

- [ ] **CORS**
  - [ ] Apenas domínios autorizados
  - [ ] Sem origin: '*' em produção
  - [ ] Credentials: true apenas se necessário

- [ ] **Rate Limiting**
  - [ ] Configurado para produção (mais restritivo)
  - [ ] Monitoramento de abuse
  - [ ] Logs de rate limit violations

- [ ] **HTTPS**
  - [ ] SSL/TLS configurado
  - [ ] HSTS habilitado
  - [ ] Redirect HTTP → HTTPS
  - [ ] Certificado válido

- [ ] **Headers**
  - [ ] Helmet configurado
  - [ ] CSP policies definidas
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff

- [ ] **Logging**
  - [ ] Logs estruturados
  - [ ] Não logar dados sensíveis
  - [ ] Monitoramento de erros (Sentry)
  - [ ] Alertas configurados

- [ ] **Database**
  - [ ] Migrations executadas
  - [ ] Backup automático configurado
  - [ ] Connection pooling habilitado
  - [ ] SSL/TLS para conexões

- [ ] **Dependencies**
  - [ ] Sem vulnerabilidades (npm audit)
  - [ ] Versões atualizadas
  - [ ] Lock file commitado

---

## 🚨 Security Incidents

### **Se detectar ataque:**

1. **Isolar**: Bloquear IP imediatamente
2. **Investigar**: Revisar logs
3. **Notificar**: Alertar equipe
4. **Patch**: Corrigir vulnerabilidade
5. **Monitor**: Observar por 48h

### **IP Blocking (Manual)**

```typescript
// Em rate-limiter.middleware.ts
private blockedIps = new Set([
  '192.168.1.100',
  '10.0.0.50',
]);

if (this.blockedIps.has(ip)) {
  return res.status(403).json({
    statusCode: 403,
    message: 'Access forbidden',
  });
}
```

---

## 📊 Security Monitoring

### **Métricas para Monitorar:**

- **Rate Limit Violations**: IPs que excedem limites
- **Failed Login Attempts**: Tentativas de brute force
- **SQL Injection Attempts**: Patterns maliciosos em inputs
- **Unusual Traffic Patterns**: Spikes anormais
- **Error Rates**: 4xx/5xx elevados

### **Tools Recomendadas:**

- **Sentry**: Error tracking
- **Datadog**: APM e monitoring
- **CloudFlare**: WAF e DDoS protection
- **AWS GuardDuty**: Threat detection
- **Snyk**: Dependency scanning

---

## 🔍 Security Audit Checklist

### **Mensal:**
- [ ] Revisar logs de segurança
- [ ] Atualizar dependências
- [ ] Verificar certificados SSL
- [ ] Testar backup/restore
- [ ] Revisar acessos de usuários

### **Trimestral:**
- [ ] Penetration testing
- [ ] Code review de segurança
- [ ] Auditoria de permissões
- [ ] Teste de disaster recovery
- [ ] Atualização de políticas

### **Anual:**
- [ ] Security audit completo
- [ ] Compliance review (LGPD)
- [ ] Infrastructure review
- [ ] Treinamento de equipe
- [ ] Update de documentação

---

## 📚 Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security](https://docs.nestjs.com/security/helmet)
- [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)
- [LGPD Guide](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)

---

**Última Atualização**: 28 de Outubro de 2025  
**Status**: ✅ Production Ready
