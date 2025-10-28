# 🔐 Variáveis de Ambiente - Coolify + Supabase

## ✅ COLE ESTAS VARIÁVEIS NO COOLIFY

Copie e cole no dashboard do Coolify em **Environment Variables**:

```bash
# ==================== DATABASE - SUPABASE ====================
DATABASE_URL=postgresql://postgres.xnazrsweosmopqwsrtvp:7JHX6t.i_ipT%23Qp@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_URL=postgresql://postgres.xnazrsweosmopqwsrtvp:7JHX6t.i_ipT%23Qp@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require

# ==================== REDIS ====================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=MinhaSegura@Redis123

# ==================== JWT (GERE NOVOS!) ====================
JWT_SECRET=COLE_AQUI_O_SECRET_GERADO
JWT_REFRESH_SECRET=COLE_AQUI_OUTRO_SECRET_GERADO
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# ==================== WHATSAPP ====================
EVOLUTION_API_URL=https://dev.evo.sistemabrasil.online
EVOLUTION_API_KEY=9B6P43RdEvTqlS6gEKHJY08LGEOSNIDp

# ==================== APP ====================
PORT=3001
NODE_ENV=production

# ==================== URLS ====================
FRONTEND_URL=https://dcsgog88ccgsoc40848ocg0w.projetojm.org
NEXT_PUBLIC_API_URL=https://dcsgog88ccgsoc40848ocg0w.projetojm.org/api

# ==================== SEGURANÇA ====================
ALLOWED_ORIGINS=https://dcsgog88ccgsoc40848ocg0w.projetojm.org
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
STRICT_RATE_LIMIT_WINDOW_MS=60000
STRICT_RATE_LIMIT_MAX_REQUESTS=5

# ==================== ENCRYPTION (GERE NOVOS!) ====================
ENCRYPTION_KEY=COLE_AQUI_32_CARACTERES
SESSION_SECRET=COLE_AQUI_SESSION_SECRET

# ==================== PAGAMENTOS (OPCIONAL) ====================
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
MERCADOPAGO_ACCESS_TOKEN=your_mercadopago_access_token
MERCADOPAGO_PUBLIC_KEY=your_mercadopago_public_key
MERCADOPAGO_BACK_URL=https://dcsgog88ccgsoc40848ocg0w.projetojm.org/payment/callback
```

---

## 🔑 GERAR SECRETS SEGUROS

### No PowerShell (Windows):

```powershell
# JWT_SECRET
$bytes = New-Object byte[] 36
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# JWT_REFRESH_SECRET (rode novamente)
$bytes = New-Object byte[] 36
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# ENCRYPTION_KEY (32 caracteres)
$bytes = New-Object byte[] 24
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# SESSION_SECRET
$bytes = New-Object byte[] 36
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

### No Linux/Mac:

```bash
# JWT_SECRET
openssl rand -base64 48

# JWT_REFRESH_SECRET
openssl rand -base64 48

# ENCRYPTION_KEY
openssl rand -base64 32

# SESSION_SECRET
openssl rand -base64 48
```

---

## 📋 CHECKLIST DE CONFIGURAÇÃO

### ✅ Passo 1: Supabase já está configurado
- [x] DATABASE_URL com pooling (porta 6543)
- [x] DIRECT_URL para migrations (porta 5432)
- [x] Senha já codificada (%23 para #)

### ⚠️ Passo 2: GERE NOVOS SECRETS
- [ ] Gere JWT_SECRET
- [ ] Gere JWT_REFRESH_SECRET
- [ ] Gere ENCRYPTION_KEY
- [ ] Gere SESSION_SECRET

### ⚠️ Passo 3: Configure Redis
- [ ] Defina REDIS_PASSWORD forte

### ✅ Passo 4: WhatsApp já configurado
- [x] EVOLUTION_API_URL
- [x] EVOLUTION_API_KEY

### ✅ Passo 5: URLs já configuradas
- [x] FRONTEND_URL
- [x] NEXT_PUBLIC_API_URL
- [x] ALLOWED_ORIGINS

---

## 🚀 COMO CONFIGURAR NO COOLIFY

### 1️⃣ Acesse o Service no Coolify

No dashboard: **Projects** → Seu projeto → **Environment Variables**

### 2️⃣ Cole as variáveis

Copie TODO o bloco de variáveis acima e cole no campo de variáveis de ambiente.

### 3️⃣ Substitua os valores marcados

Procure por:
- `COLE_AQUI_O_SECRET_GERADO` → Cole o JWT_SECRET que você gerou
- `COLE_AQUI_OUTRO_SECRET_GERADO` → Cole o JWT_REFRESH_SECRET
- `COLE_AQUI_32_CARACTERES` → Cole o ENCRYPTION_KEY
- `COLE_AQUI_SESSION_SECRET` → Cole o SESSION_SECRET
- `MinhaSegura@Redis123` → Mude para sua senha Redis

### 4️⃣ Salve e Redeploy

Clique em **Save** e depois **Redeploy**

---

## 🔍 VERIFICAÇÃO

Após o deploy, você pode verificar se o Supabase está conectado:

### Logs do Coolify devem mostrar:
```
✓ Prisma Client ready
✓ Database connected
✓ Redis connected
🚀 API running on port 3001
```

### Teste a API:
```bash
curl https://dcsgog88ccgsoc40848ocg0w.projetojm.org/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

---

## ⚠️ NOTAS IMPORTANTES

### 1. Supabase Connection Pooling
✅ **DATABASE_URL** usa porta **6543** (PgBouncer) - Melhor para produção
✅ **DIRECT_URL** usa porta **5432** (Direto) - Necessário para migrations do Prisma

### 2. Senha especial (#)
✅ O caractere `#` está codificado como `%23` na URL
✅ Não altere isso, é necessário para funcionar corretamente

### 3. Redis
⚠️ O Redis está rodando como **container local** no Coolify
✅ Use `redis` como hostname (não localhost)
✅ Defina uma senha forte em REDIS_PASSWORD

### 4. Migrations no Coolify
Se precisar rodar migrations, adicione um comando no Coolify:
```bash
npx prisma migrate deploy
```

---

## 🐛 TROUBLESHOOTING

### ❌ Erro: "Can't reach database server"
**Causa**: Supabase bloqueado ou senha errada
**Solução**: Verifique se a URL está correta e completa

### ❌ Erro: "Redis connection refused"
**Causa**: Redis não iniciou ou senha incorreta
**Solução**: 
1. Verifique se o serviço `redis` está rodando no docker-compose
2. Confirme que REDIS_PASSWORD está correto em todas as variáveis

### ❌ Erro: "JWT malformed"
**Causa**: JWT_SECRET não configurado ou muito curto
**Solução**: Gere um secret de pelo menos 32 caracteres

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Cole as variáveis no Coolify
2. ✅ Gere e substitua os secrets
3. ✅ Salve e faça Redeploy
4. ✅ Monitore os logs
5. ✅ Teste a API

**Tudo pronto para produção!** 🎉
