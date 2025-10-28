# 🚀 Guia de Deploy em VM

## Pré-requisitos

- VM Linux (Ubuntu 20.04+ recomendado) ou Windows Server
- Mínimo 2GB RAM, 2 CPUs
- Recomendado: 4GB RAM, 4 CPUs
- 20GB de espaço em disco

---

## 📦 Opção 1: Deploy Rápido (Recomendado)

### Linux/Ubuntu:

```bash
# 1. Clone o repositório
git clone https://github.com/euaugusto1/Sistema-SAAS-para-whatsapp-e-atendimento.git
cd Sistema-SAAS-para-whatsapp-e-atendimento

# 2. Copie e edite o arquivo de ambiente
cp .env.vm .env
nano .env  # Ou vim/vi

# Edite as seguintes variáveis OBRIGATÓRIAS:
# - POSTGRES_PASSWORD (senha do banco)
# - REDIS_PASSWORD (senha do Redis)
# - JWT_SECRET (mínimo 32 caracteres)
# - JWT_REFRESH_SECRET (mínimo 32 caracteres)
# - EVOLUTION_API_URL (URL da sua API Evolution)
# - EVOLUTION_API_KEY (chave da Evolution API)

# 3. Execute o script de deploy
chmod +x deploy-vm.sh
sudo ./deploy-vm.sh

# 4. Aguarde o build (5-10 minutos)
# Quando terminar, os serviços estarão rodando!
```

### Windows Server:

```cmd
# 1. Clone o repositório
git clone https://github.com/euaugusto1/Sistema-SAAS-para-whatsapp-e-atendimento.git
cd Sistema-SAAS-para-whatsapp-e-atendimento

# 2. Copie e edite o arquivo de ambiente
copy .env.vm .env
notepad .env

# Edite as variáveis obrigatórias (veja lista acima)

# 3. Execute o script de deploy
deploy-vm.bat

# 4. Aguarde o build
```

---

## 📦 Opção 2: Deploy Manual

### 1. Instalar Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**CentOS/RHEL:**
```bash
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Configurar Ambiente

```bash
# Clone o repositório
git clone https://github.com/euaugusto1/Sistema-SAAS-para-whatsapp-e-atendimento.git
cd Sistema-SAAS-para-whatsapp-e-atendimento

# Criar arquivo .env
cp .env.vm .env

# Editar variáveis (use nano, vim ou vi)
nano .env
```

**Variáveis OBRIGATÓRIAS para editar:**

```bash
# Senhas fortes (min 16 caracteres)
POSTGRES_PASSWORD=SuaSenhaForteAqui123!@#
REDIS_PASSWORD=OutraSenhaForteAqui456!@#

# Secrets JWT (min 32 caracteres cada)
JWT_SECRET=seu_jwt_secret_muito_seguro_aqui_min_32_caracteres
JWT_REFRESH_SECRET=seu_refresh_secret_muito_seguro_aqui_min_32_caracteres

# Evolution API (obter em sua instância)
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_chave_evolution_api

# URLs públicas (substitua pelo IP/domínio da sua VM)
FRONTEND_URL=http://SEU_IP:3000
NEXT_PUBLIC_API_URL=http://SEU_IP:3001
```

### 3. Build e Deploy

```bash
# Build das imagens (primeira vez demora ~10 minutos)
docker-compose build

# Subir PostgreSQL primeiro
docker-compose up -d postgres
sleep 10

# Rodar migrations
docker-compose run --rm api npx prisma migrate deploy

# Seed do banco (planos de assinatura)
docker-compose run --rm api npx prisma db seed

# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f
```

---

## 🔍 Verificar Deploy

### Verificar containers rodando:
```bash
docker-compose ps
```

Você deve ver:
```
NAME                IMAGE                   STATUS
saas-api            saas-api:latest        Up
saas-web            saas-web:latest        Up
saas-postgres       postgres:15-alpine     Up (healthy)
saas-redis          redis:7-alpine         Up (healthy)
saas-prometheus     prom/prometheus        Up
saas-grafana        grafana/grafana        Up
```

### Testar endpoints:

```bash
# API Health Check
curl http://localhost:3001/health

# Frontend
curl http://localhost:3000

# Prometheus
curl http://localhost:9090/-/healthy

# Grafana
curl http://localhost:3003/api/health
```

---

## 🌐 Acessar Aplicação

Substitua `SEU_IP` pelo IP da sua VM:

- **Frontend (Web):** http://SEU_IP:3000
- **API (Backend):** http://SEU_IP:3001
- **Prometheus:** http://SEU_IP:9090
- **Grafana:** http://SEU_IP:3003
  - User: `admin`
  - Password: `admin123_change_this` (altere no .env)

---

## 🔥 Firewall

### Ubuntu/Debian (UFW):
```bash
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 3001/tcp  # API
sudo ufw allow 9090/tcp  # Prometheus (opcional)
sudo ufw allow 3003/tcp  # Grafana (opcional)
sudo ufw enable
```

### CentOS/RHEL (firewalld):
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=9090/tcp
sudo firewall-cmd --permanent --add-port=3003/tcp
sudo firewall-cmd --reload
```

---

## 🔧 Comandos Úteis

```bash
# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f api
docker-compose logs -f web

# Reiniciar serviços
docker-compose restart

# Parar todos os serviços
docker-compose stop

# Parar e remover containers
docker-compose down

# Ver uso de recursos
docker stats

# Acessar shell do container
docker-compose exec api sh
docker-compose exec web sh

# Rodar migrations manualmente
docker-compose run --rm api npx prisma migrate deploy

# Ver status detalhado
docker-compose ps -a
```

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to Docker daemon"
```bash
# Verificar se Docker está rodando
sudo systemctl status docker

# Iniciar Docker
sudo systemctl start docker

# Adicionar usuário ao grupo docker (para não precisar de sudo)
sudo usermod -aG docker $USER
# Faça logout e login novamente
```

### Erro: "Port already in use"
```bash
# Ver o que está usando a porta
sudo lsof -i :3000
sudo lsof -i :3001

# Matar processo
sudo kill -9 PID
```

### Erro: "Database connection failed"
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps postgres

# Ver logs do PostgreSQL
docker-compose logs postgres

# Reiniciar PostgreSQL
docker-compose restart postgres

# Verificar credenciais no .env
cat .env | grep DATABASE_URL
```

### Erro de memória/recursos:
```bash
# Limpar containers parados
docker container prune -f

# Limpar imagens não usadas
docker image prune -a -f

# Limpar volumes não usados (CUIDADO!)
docker volume prune -f

# Ver uso de espaço
docker system df
```

### Build muito lento:
```bash
# Usar cache do Docker
docker-compose build

# Build sem cache (mais lento, mas garante atualização)
docker-compose build --no-cache

# Build paralelo (mais rápido)
docker-compose build --parallel
```

---

## 🔄 Atualizar Aplicação

```bash
# 1. Fazer backup do banco
docker-compose exec postgres pg_dump -U postgres saas > backup_$(date +%Y%m%d).sql

# 2. Pull das atualizações
git pull origin main

# 3. Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 4. Rodar migrations
docker-compose run --rm api npx prisma migrate deploy
```

---

## 💾 Backup e Restore

### Backup:
```bash
# Criar diretório de backup
mkdir -p backups

# Backup do banco
docker-compose exec postgres pg_dump -U postgres saas | gzip > backups/db_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup do Redis
docker-compose exec redis redis-cli --rdb /data/dump.rdb
docker cp saas-redis:/data/dump.rdb backups/redis_$(date +%Y%m%d_%H%M%S).rdb

# Backup completo (volumes)
sudo tar -czf backups/volumes_$(date +%Y%m%d_%H%M%S).tar.gz /var/lib/docker/volumes/saas_*
```

### Restore:
```bash
# Restore do banco
gunzip < backups/db_20251028_120000.sql.gz | docker-compose exec -T postgres psql -U postgres saas

# Restore do Redis
docker cp backups/redis_20251028_120000.rdb saas-redis:/data/dump.rdb
docker-compose restart redis
```

---

## 📊 Monitoramento

### Grafana Dashboards:

1. Acesse: http://SEU_IP:3003
2. Login: admin / admin123_change_this
3. Vá em Dashboards → Browse
4. Dashboards pré-configurados:
   - Application Metrics
   - Database Metrics
   - Redis Metrics

### Prometheus Queries:

- Requests por segundo: `rate(http_requests_total[1m])`
- CPU usage: `process_cpu_usage`
- Memória: `process_memory_usage_bytes`

---

## 🔒 Segurança em Produção

### 1. Alterar senhas padrão:
```bash
nano .env
# Altere todas as senhas e secrets
```

### 2. Usar HTTPS (Nginx + Let's Encrypt):
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seudominio.com

# Renovação automática
sudo crontab -e
# Adicione: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Firewall restritivo:
```bash
# Permitir apenas portas necessárias
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4. Limitar acesso ao Grafana/Prometheus:
```bash
# Editar docker-compose.yml
# Remover exposição de portas ou usar nginx como proxy
```

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os logs: `docker-compose logs -f`
2. Verifique o status: `docker-compose ps`
3. Consulte a documentação: `docs/DEPLOY.md`
4. Issues no GitHub: https://github.com/euaugusto1/Sistema-SAAS-para-whatsapp-e-atendimento/issues

---

**✅ Deploy concluído! Sua plataforma SaaS está rodando!** 🚀
