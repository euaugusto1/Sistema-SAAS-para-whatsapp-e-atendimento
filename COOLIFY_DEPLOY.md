# Guia de Deploy no Coolify

## 🚨 Problema Identificado

O Coolify está detectando o projeto como Node.js e tentando usar **Nixpacks** para o build, mas este projeto usa **Docker Compose** com Dockerfiles customizados.

## ✅ Soluções

### Solução 1: Configurar via Dashboard do Coolify (RECOMENDADO)

1. **Acesse o dashboard do Coolify**: https://dcsgog88ccgsoc40848ocg0w.projetojm.org

2. **Vá para as configurações do seu projeto**:
   - Clique no projeto "Sistema-SAAS-para-whatsapp-e-atendimento"
   - Vá para a aba "Configuration" ou "Settings"

3. **Altere o Build Pack**:
   - Procure por "Build Pack" ou "Deployment Method"
   - Mude de **"Nixpacks"** ou **"Auto"** para **"Docker Compose"**
   
4. **Configure o arquivo Docker Compose**:
   - No campo "Docker Compose File", especifique: `docker-compose.yml`
   - OU se você está em ARM64 (Oracle Cloud): `docker-compose.arm64.yml`

5. **Defina o Service a ser exposto**:
   - Service: `web`
   - Port: `3000`

6. **Configure as variáveis de ambiente**:
   - Vá para a aba "Environment Variables"
   - Adicione todas as variáveis do arquivo `.env`
   - **Variáveis críticas**:
     ```
     NODE_ENV=production
     DATABASE_URL=postgresql://postgres:SUA_SENHA@postgres:5432/saas
     REDIS_URL=redis://:SUA_SENHA@redis:6379
     JWT_SECRET=seu_jwt_secret_32_chars
     JWT_REFRESH_SECRET=seu_refresh_secret_32_chars
     FRONTEND_URL=https://dcsgog88ccgsoc40848ocg0w.projetojm.org
     ```

7. **Salve e faça Deploy novamente**

### Solução 2: Via Arquivos de Configuração

Se a Solução 1 não funcionar, adicione um arquivo `.coolify.json`:

**Arquivo criado**: `.coolify.json` (na raiz do projeto)

```json
{
  "type": "docker-compose",
  "dockerComposeFile": "docker-compose.yml",
  "services": {
    "web": {
      "port": 3000,
      "protocol": "http"
    }
  }
}
```

### Solução 3: Usar Dockerfile Único (Fallback)

Se o Coolify insistir em usar Nixpacks, crie um Dockerfile na raiz:

**Arquivo criado**: `Dockerfile` (na raiz do projeto)

Este Dockerfile usa multi-stage build para construir API e Web juntos.

## 🔧 Configuração Passo a Passo no Coolify

### Para Docker Compose (Recomendado)

1. **Build Pack**: Docker Compose
2. **Docker Compose File**: `docker-compose.yml`
3. **Port Mapping**: 
   - Web: 3000
   - API: 3001
   - Grafana: 3003

### Variáveis de Ambiente Essenciais

```bash
# Database
POSTGRES_DB=saas
POSTGRES_USER=postgres
POSTGRES_PASSWORD=senha_segura_postgres
DATABASE_URL=postgresql://postgres:senha_segura_postgres@postgres:5432/saas

# Redis
REDIS_PASSWORD=senha_segura_redis
REDIS_URL=redis://:senha_segura_redis@redis:6379

# JWT
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)

# URLs
FRONTEND_URL=https://dcsgog88ccgsoc40848ocg0w.projetojm.org
API_URL=https://dcsgog88ccgsoc40848ocg0w.projetojm.org/api

# Stripe (se usar)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# MercadoPago (se usar)
MERCADOPAGO_ACCESS_TOKEN=...

# Evolution API (WhatsApp)
EVOLUTION_API_URL=sua_url
EVOLUTION_API_KEY=sua_chave

# Node
NODE_ENV=production
```

## 🐛 Troubleshooting

### Erro: "failed to fetch oauth token: 403 Forbidden"

**Causa**: Coolify está tentando baixar imagens do GitHub Container Registry (ghcr.io) que não existem ou requerem autenticação.

**Solução**: Configurar Coolify para usar Docker Compose em vez de Nixpacks.

### Erro: "Image not found"

**Causa**: Coolify está procurando uma imagem pré-construída.

**Solução**: Configurar para fazer build localmente usando Docker Compose.

### Como verificar se está usando Docker Compose

Nos logs de deploy, você deve ver:
```
Building docker-compose services...
Building api...
Building web...
```

Em vez de:
```
Generating nixpacks configuration...
Found application type: node
```

## 📝 Checklist de Deploy

- [ ] Configurado Build Pack como "Docker Compose" no Coolify
- [ ] Especificado arquivo `docker-compose.yml`
- [ ] Definido service `web` com porta 3000
- [ ] Configuradas todas as variáveis de ambiente
- [ ] Testado build localmente: `docker-compose build`
- [ ] Verificado que `.env` não está no repositório (apenas `.env.example`)
- [ ] Confirmado que o Coolify tem acesso ao repositório GitHub

## 🚀 Comandos Úteis

### Testar localmente antes do deploy:

```bash
# Build das imagens
docker-compose build

# Iniciar serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Verificar saúde dos serviços
docker-compose ps
```

### Gerar secrets seguros:

```bash
# JWT Secret
openssl rand -base64 48

# Outro secret
openssl rand -hex 32
```

## 📞 Próximos Passos

1. **Acesse o Coolify dashboard**
2. **Mude o Build Pack para Docker Compose**
3. **Configure as variáveis de ambiente**
4. **Faça um novo deploy**
5. **Monitore os logs para verificar o sucesso**

## 🌐 URLs Esperadas

Após o deploy bem-sucedido:

- **Frontend**: https://dcsgog88ccgsoc40848ocg0w.projetojm.org
- **API**: https://dcsgog88ccgsoc40848ocg0w.projetojm.org/api
- **Grafana**: https://dcsgog88ccgsoc40848ocg0w.projetojm.org:3003
- **Health Check API**: https://dcsgog88ccgsoc40848ocg0w.projetojm.org/api/health

---

**Nota**: Se você estiver usando Oracle Cloud ARM64, use `docker-compose.arm64.yml` em vez de `docker-compose.yml` e siga o guia `ORACLE_CLOUD_ARM.md`.
