# Deploy e Infraestrutura

Guia completo de deploy, infraestrutura e monitoramento da plataforma SaaS.

## 📦 Conteúdo

- [Docker](#docker)
- [CI/CD](#cicd)
- [Kubernetes](#kubernetes)
- [Monitoramento](#monitoramento)
- [Deploy](#deploy)
- [Backup e Recuperação](#backup-e-recuperação)
- [Segurança](#segurança)

## 🐳 Docker

### Estrutura de Containers

```
saas-platform/
├── API (NestJS)          - Port 3001
├── Web (Next.js)         - Port 3000
├── PostgreSQL            - Port 5432
├── Redis                 - Port 6379
├── Nginx                 - Ports 80, 443
├── Prometheus            - Port 9090
└── Grafana               - Port 3003
```

### Dockerfiles

**API (`apps/api/Dockerfile`):**
- Multi-stage build (builder + production)
- Node 18 Alpine (minimal)
- Non-root user (nestjs:1001)
- Health checks configurados
- Dumb-init para signal handling

**Web (`apps/web/Dockerfile`):**
- Multi-stage build otimizado
- Next.js standalone output
- Non-root user (nextjs:1001)
- Static assets otimizados
- Health checks

### Comandos Docker

```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Produção
docker-compose up -d

# Build sem cache
docker-compose build --no-cache

# Logs
docker-compose logs -f api
docker-compose logs -f web

# Reiniciar serviço
docker-compose restart api

# Parar tudo
docker-compose down

# Parar e remover volumes
docker-compose down -v

# Status dos containers
docker-compose ps

# Executar comando no container
docker-compose exec api npm run prisma:migrate
```

## 🔄 CI/CD

### GitHub Actions Workflow

**Pipeline completo (`.github/workflows/ci-cd.yml`):**

1. **Lint e Format Check**
   - ESLint em todos os arquivos
   - Prettier format check
   - Falha se houver erros

2. **Type Check**
   - TypeScript type checking
   - Garante type safety

3. **Tests - API**
   - PostgreSQL test database
   - Redis service
   - Prisma migrations
   - Jest tests com coverage
   - Upload para Codecov

4. **Tests - Web**
   - Next.js tests
   - Component testing
   - Coverage report

5. **Security Scan**
   - npm audit (high severity)
   - Snyk security scan
   - Vulnerability detection

6. **Build Docker Images**
   - Multi-arch builds
   - Push para GitHub Container Registry
   - Tag com branch + SHA
   - Cache layers

7. **Deploy Staging** (develop branch)
   - Auto-deploy para staging
   - Environment: staging
   - URL: staging.yourdomain.com

8. **Deploy Production** (main branch)
   - Manual approval required
   - Environment: production
   - URL: yourdomain.com
   - Sentry release creation

9. **Notifications**
   - Slack notifications
   - Deployment status
   - Failure alerts

### Secrets Necessários

Configure no GitHub Settings > Secrets:

```
GITHUB_TOKEN              # Auto-provided
SNYK_TOKEN               # Snyk API token
SENTRY_AUTH_TOKEN        # Sentry integration
SENTRY_ORG               # Sentry organization
SENTRY_PROJECT           # Sentry project name
SLACK_WEBHOOK            # Slack notifications
```

## ☸️ Kubernetes

### Deployment

**Namespace:** `saas-production`

**Resources:**
- Deployments: API (3 replicas), Web (3 replicas), PostgreSQL, Redis
- Services: ClusterIP para comunicação interna
- Ingress: NGINX com SSL/TLS
- HPA: Auto-scaling baseado em CPU/Memory
- PVC: Persistent storage para PostgreSQL

### Comandos Kubernetes

```bash
# Aplicar configurações
kubectl apply -f k8s/deployment.yml

# Ver pods
kubectl get pods -n saas-production

# Ver services
kubectl get svc -n saas-production

# Logs de um pod
kubectl logs -f <pod-name> -n saas-production

# Descrever deployment
kubectl describe deployment api -n saas-production

# Escalar manualmente
kubectl scale deployment api --replicas=5 -n saas-production

# Rollback
kubectl rollout undo deployment/api -n saas-production

# Ver histórico
kubectl rollout history deployment/api -n saas-production

# Status do rollout
kubectl rollout status deployment/api -n saas-production

# Executar comando no pod
kubectl exec -it <pod-name> -n saas-production -- /bin/sh

# Port forward para debug
kubectl port-forward svc/api-service 3001:3001 -n saas-production
```

### Auto-Scaling

**HPA (Horizontal Pod Autoscaler):**
- Min replicas: 3
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

```bash
# Ver status do HPA
kubectl get hpa -n saas-production

# Descrever HPA
kubectl describe hpa api-hpa -n saas-production
```

## 📊 Monitoramento

### Prometheus

**Metrics coletadas:**
- API: Request rate, latency, errors
- Web: Page views, load time
- PostgreSQL: Connections, queries, cache
- Redis: Operations, memory, hit rate
- Sistema: CPU, memory, disk, network

**Configuração:** `monitoring/prometheus/prometheus.yml`

**Acessar:** http://localhost:9090

### Grafana

**Dashboards:**
- System Overview
- Application Metrics
- Database Performance
- API Analytics
- Error Tracking

**Configuração:** `monitoring/grafana/provisioning/`

**Acessar:** http://localhost:3003
- User: admin
- Password: (definido em .env)

### Alertas

Configure alertas no Prometheus para:
- High error rate (> 5%)
- High latency (> 1s)
- Database connections (> 80%)
- Memory usage (> 90%)
- Disk space (< 10%)

## 🚀 Deploy

### Deploy Automatizado

**Linux/Mac:**
```bash
# Staging
./scripts/deploy.sh staging

# Production
./scripts/deploy.sh production
```

**Windows:**
```powershell
# Staging
.\scripts\deploy.bat staging

# Production
.\scripts\deploy.bat production
```

### Deploy Manual

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci

# 3. Run migrations
cd apps/api
npx prisma migrate deploy
cd ../..

# 4. Build images
docker-compose build --no-cache

# 5. Stop old containers
docker-compose down

# 6. Start new containers
docker-compose up -d

# 7. Verify health
curl http://localhost:3001/health
curl http://localhost:3000
```

### Zero-Downtime Deployment

**Estratégias:**

1. **Blue-Green Deployment:**
   - Mantenha dois ambientes (blue/green)
   - Deploy no ambiente inativo
   - Teste completamente
   - Troque o tráfego

2. **Rolling Update (Kubernetes):**
   - MaxSurge: 1
   - MaxUnavailable: 0
   - Update gradual dos pods

3. **Canary Deployment:**
   - Deploy para 10% do tráfego
   - Monitor métricas
   - Gradualmente aumente para 100%

## 💾 Backup e Recuperação

### Backup Automático

**Script de backup:** `scripts/backup.sh`

```bash
#!/bin/bash
# Backup diário automático

# Database
docker exec saas-postgres pg_dump -U postgres saas > backup_$(date +%Y%m%d).sql

# Files
tar -czf uploads_$(date +%Y%m%d).tar.gz apps/api/uploads/

# Enviar para S3/Cloud Storage
aws s3 cp backup_$(date +%Y%m%d).sql s3://your-bucket/backups/
```

**Configurar cron (Linux):**
```cron
# Backup diário às 2h da manhã
0 2 * * * /path/to/scripts/backup.sh
```

### Restauração

```bash
# Restaurar database
docker exec -i saas-postgres psql -U postgres saas < backup_20231028.sql

# Restaurar files
tar -xzf uploads_20231028.tar.gz
```

### Retenção

- **Daily backups:** 7 dias
- **Weekly backups:** 4 semanas
- **Monthly backups:** 12 meses

## 🔐 Segurança

### SSL/TLS

**Let's Encrypt com Certbot:**

```bash
# Obter certificado
docker-compose run --rm certbot certonly --webroot \
  -w /var/www/certbot \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos

# Renovar certificados (automático)
docker-compose up -d certbot
```

### Secrets Management

**Não commitar secrets!**

Usar:
- `.env.production` (gitignored)
- Kubernetes Secrets
- HashiCorp Vault
- AWS Secrets Manager

### Firewall Rules

```bash
# Permitir apenas portas necessárias
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### Security Headers

Configurados no Nginx (`nginx/conf.d/default.conf`):
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Referrer-Policy: no-referrer-when-downgrade`

## 📝 Checklist de Deploy

### Pré-Deploy

- [ ] Testar em staging
- [ ] Revisar changelog
- [ ] Backup do banco de dados
- [ ] Verificar migrations
- [ ] Atualizar documentação
- [ ] Comunicar equipe

### Deploy

- [ ] Pull latest code
- [ ] Install dependencies
- [ ] Run migrations
- [ ] Build images
- [ ] Deploy containers
- [ ] Verificar health checks
- [ ] Testar endpoints críticos

### Pós-Deploy

- [ ] Monitorar logs
- [ ] Verificar métricas
- [ ] Testar funcionalidades
- [ ] Notificar stakeholders
- [ ] Documentar issues

## 🆘 Troubleshooting

### Container não inicia

```bash
# Ver logs
docker-compose logs api

# Ver detalhes do container
docker inspect saas-api

# Verificar health
docker-compose ps
```

### Database connection failed

```bash
# Verificar PostgreSQL
docker-compose exec postgres pg_isready

# Ver logs do PostgreSQL
docker-compose logs postgres

# Testar conexão
docker-compose exec api npx prisma db pull
```

### High memory usage

```bash
# Ver uso de recursos
docker stats

# Limitar memória
docker-compose up -d --scale api=1 \
  --memory="512m" --memory-swap="1g"
```

### SSL certificate issues

```bash
# Verificar certificado
openssl s_client -connect yourdomain.com:443

# Renovar manualmente
docker-compose run --rm certbot renew
```

## 📚 Referências

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)

---

**Desenvolvido para garantir alta disponibilidade e confiabilidade** 🚀
