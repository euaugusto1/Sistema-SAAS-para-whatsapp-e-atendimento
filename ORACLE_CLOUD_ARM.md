# 🚀 Guia de Deploy - Oracle Cloud ARM64

## ⚠️ IMPORTANTE: Este guia é específico para VMs ARM64 da Oracle Cloud

A Oracle Cloud oferece VMs ARM (Ampere) no free tier com excelentes recursos:
- ✅ **4 CPUs ARM Ampere A1**
- ✅ **24GB RAM**
- ✅ **200GB storage**
- ✅ **Sempre gratuito!**

---

## 📋 Pré-requisitos

### 1. Criar VM na Oracle Cloud

1. Acesse: https://cloud.oracle.com
2. Vá em: **Compute → Instances → Create Instance**
3. Configurações:
   - **Image:** Ubuntu 22.04 (ou 20.04)
   - **Shape:** Ampere (ARM) - VM.Standard.A1.Flex
   - **CPUs:** 4 (máximo gratuito)
   - **RAM:** 24GB (máximo gratuito)
   - **Storage:** 100-200GB
   - **SSH Key:** Adicione sua chave pública

### 2. Conectar na VM

```bash
ssh ubuntu@SEU_IP_PUBLICO
```

---

## 🚀 Deploy Automático (Recomendado)

### Passo 1: Clone o repositório

```bash
cd ~
git clone https://github.com/euaugusto1/Sistema-SAAS-para-whatsapp-e-atendimento.git
cd Sistema-SAAS-para-whatsapp-e-atendimento
```

### Passo 2: Configure o ambiente

```bash
# Copiar template
cp .env.vm .env

# Editar (OBRIGATÓRIO!)
nano .env
```

**Variáveis OBRIGATÓRIAS:**

```bash
# Senhas fortes (mínimo 16 caracteres)
POSTGRES_PASSWORD=SuaSenhaPostgresForte123!@#
REDIS_PASSWORD=SuaSenhaRedisForte456!@#

# JWT Secrets (mínimo 32 caracteres cada)
JWT_SECRET=seu_jwt_secret_muito_longo_e_seguro_aqui_minimo_32_caracteres
JWT_REFRESH_SECRET=seu_refresh_secret_muito_longo_e_seguro_aqui_minimo_32_caracteres

# Evolution API (obter da sua instância Evolution)
EVOLUTION_API_URL=https://sua-evolution-api.com.br
EVOLUTION_API_KEY=sua_chave_evolution_api_aqui

# URLs (substitua SEU_IP pelo IP público da VM)
FRONTEND_URL=http://SEU_IP_PUBLICO:3000
NEXT_PUBLIC_API_URL=http://SEU_IP_PUBLICO:3001
```

**💡 Dica:** Para gerar secrets seguros:
```bash
# Gerar JWT_SECRET
openssl rand -base64 48

# Gerar JWT_REFRESH_SECRET
openssl rand -base64 48
```

### Passo 3: Execute o deploy

```bash
# Dar permissão
chmod +x deploy-oracle-arm.sh

# Executar (vai pedir sudo)
sudo ./deploy-oracle-arm.sh
```

**O script vai:**
1. ✅ Instalar Docker e Docker Compose
2. ✅ Configurar ambiente
3. ✅ Buildar imagens ARM64 otimizadas (10-15 minutos)
4. ✅ Executar migrations do banco
5. ✅ Iniciar todos os serviços

### Passo 4: Configurar Firewall

**4.1. No Console da Oracle Cloud:**

1. Vá em: **Networking → Virtual Cloud Networks**
2. Clique na sua VCN
3. **Security Lists → Default Security List**
4. **Add Ingress Rules:**

| Source CIDR | Protocol | Port Range | Description |
|-------------|----------|------------|-------------|
| 0.0.0.0/0 | TCP | 3000 | Frontend Web |
| 0.0.0.0/0 | TCP | 3001 | API Backend |
| 0.0.0.0/0 | TCP | 3003 | Grafana (opcional) |
| 0.0.0.0/0 | TCP | 9090 | Prometheus (opcional) |

**4.2. No Sistema Operacional (iptables):**

```bash
# Liberar portas
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3003 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 9090 -j ACCEPT

# Salvar regras
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

### Passo 5: Verificar

```bash
# Ver containers rodando
docker-compose -f docker-compose.arm64.yml ps

# Ver logs
docker-compose -f docker-compose.arm64.yml logs -f

# Testar API
curl http://localhost:3001/health
```

---

## 🌐 Acessar Aplicação

Substitua `SEU_IP` pelo IP público da sua VM Oracle Cloud:

- **Frontend:** http://SEU_IP:3000
- **API:** http://SEU_IP:3001
- **API Health:** http://SEU_IP:3001/health
- **Grafana:** http://SEU_IP:3003 (admin/admin123_change_this)
- **Prometheus:** http://SEU_IP:9090

---

## 📊 Verificar Status

### Ver containers:
```bash
docker-compose -f docker-compose.arm64.yml ps
```

Saída esperada:
```
NAME                IMAGE                     STATUS
saas-api            saas-api:latest          Up (healthy)
saas-web            saas-web:latest          Up
saas-postgres       postgres:15-alpine       Up (healthy)
saas-redis          redis:7-alpine           Up (healthy)
saas-prometheus     prom/prometheus:latest   Up
saas-grafana        grafana/grafana:latest   Up
```

### Ver logs em tempo real:
```bash
# Todos os serviços
docker-compose -f docker-compose.arm64.yml logs -f

# Apenas API
docker-compose -f docker-compose.arm64.yml logs -f api

# Apenas Web
docker-compose -f docker-compose.arm64.yml logs -f web

# Com timestamp
docker-compose -f docker-compose.arm64.yml logs -f --timestamps
```

### Ver uso de recursos:
```bash
# Uso em tempo real
docker stats

# Uso de disco
docker system df

# Memória da VM
free -h

# Disco da VM
df -h
```

---

## 🔧 Comandos Úteis

### Gerenciar serviços:
```bash
# Reiniciar todos
docker-compose -f docker-compose.arm64.yml restart

# Reiniciar apenas um serviço
docker-compose -f docker-compose.arm64.yml restart api

# Parar todos
docker-compose -f docker-compose.arm64.yml stop

# Iniciar todos
docker-compose -f docker-compose.arm64.yml start

# Remover tudo (CUIDADO! Perde dados)
docker-compose -f docker-compose.arm64.yml down -v
```

### Acessar containers:
```bash
# Shell do container da API
docker-compose -f docker-compose.arm64.yml exec api sh

# Shell do PostgreSQL
docker-compose -f docker-compose.arm64.yml exec postgres psql -U postgres -d saas

# Shell do Redis
docker-compose -f docker-compose.arm64.yml exec redis redis-cli -a redis123
```

### Executar comandos:
```bash
# Migrations
docker-compose -f docker-compose.arm64.yml run --rm api npx prisma migrate deploy

# Seed do banco
docker-compose -f docker-compose.arm64.yml run --rm api npx prisma db seed

# Ver schema do Prisma
docker-compose -f docker-compose.arm64.yml run --rm api npx prisma studio
```

---

## 🐛 Troubleshooting

### 1. Erro: "Platform mismatch"

```bash
# Verificar arquitetura
uname -m
# Deve mostrar: aarch64 ou arm64

# Se não for ARM, você está na VM errada!
# Use o script deploy-vm.sh ao invés deste
```

### 2. Erro: "Cannot connect to Docker daemon"

```bash
# Verificar status do Docker
sudo systemctl status docker

# Iniciar Docker
sudo systemctl start docker

# Habilitar na inicialização
sudo systemctl enable docker
```

### 3. Erro: "Port already in use"

```bash
# Ver o que está usando a porta
sudo lsof -i :3000
sudo lsof -i :3001

# Matar processo (substitua PID)
sudo kill -9 PID

# Ou parar containers antigos
docker-compose down
docker-compose -f docker-compose.arm64.yml down
```

### 4. Build muito lento ou travando

```bash
# Limpar cache do Docker
docker system prune -a -f

# Aumentar swap (se RAM < 4GB)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 5. Erro de memória (OOM - Out of Memory)

```bash
# Ver uso de memória
free -h

# Ver containers que mais usam memória
docker stats --no-stream

# Reduzir containers rodando (desabilitar Grafana/Prometheus)
# Editar docker-compose.arm64.yml e comentar os serviços
```

### 6. Migrations falhando

```bash
# Ver logs do Postgres
docker-compose -f docker-compose.arm64.yml logs postgres

# Conectar no banco
docker-compose -f docker-compose.arm64.yml exec postgres psql -U postgres -d saas

# Dentro do psql:
\dt              # Listar tabelas
\d users         # Ver estrutura da tabela users
SELECT * FROM _prisma_migrations;  # Ver migrations aplicadas

# Forçar reset (CUIDADO! Perde dados)
docker-compose -f docker-compose.arm64.yml run --rm api npx prisma migrate reset
```

### 7. Firewall bloqueando acesso

```bash
# Verificar regras do iptables
sudo iptables -L -n -v

# Se não tiver as regras, adicione:
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT

# Salvar
sudo netfilter-persistent save

# ⚠️ NÃO ESQUEÇA de configurar no console da Oracle Cloud também!
```

### 8. Aplicação não responde

```bash
# Verificar health checks
docker-compose -f docker-compose.arm64.yml ps

# Ver logs detalhados
docker-compose -f docker-compose.arm64.yml logs --tail=100 api
docker-compose -f docker-compose.arm64.yml logs --tail=100 web

# Reiniciar serviço problemático
docker-compose -f docker-compose.arm64.yml restart api
```

---

## 🔄 Atualizar Aplicação

```bash
# 1. Backup do banco
docker-compose -f docker-compose.arm64.yml exec postgres pg_dump -U postgres saas | gzip > backup_$(date +%Y%m%d).sql.gz

# 2. Pull atualizações
git pull origin main

# 3. Rebuild (pode demorar)
docker-compose -f docker-compose.arm64.yml down
docker-compose -f docker-compose.arm64.yml build --no-cache
docker-compose -f docker-compose.arm64.yml up -d

# 4. Rodar migrations
docker-compose -f docker-compose.arm64.yml run --rm api npx prisma migrate deploy
```

---

## 💾 Backup e Restore

### Backup Automático (Cron):

```bash
# Criar script de backup
sudo nano /usr/local/bin/backup-saas.sh
```

Conteúdo:
```bash
#!/bin/bash
BACKUP_DIR=/home/ubuntu/backups
mkdir -p $BACKUP_DIR
cd /home/ubuntu/Sistema-SAAS-para-whatsapp-e-atendimento

# Backup banco
docker-compose -f docker-compose.arm64.yml exec -T postgres pg_dump -U postgres saas | gzip > $BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql.gz

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
```

```bash
# Dar permissão
sudo chmod +x /usr/local/bin/backup-saas.sh

# Adicionar ao cron (diariamente às 3AM)
sudo crontab -e
# Adicione: 0 3 * * * /usr/local/bin/backup-saas.sh
```

### Restore Manual:

```bash
# Restaurar backup
gunzip < backup_20251028.sql.gz | docker-compose -f docker-compose.arm64.yml exec -T postgres psql -U postgres saas
```

---

## 🔒 Segurança em Produção

### 1. Alterar senhas padrão:
```bash
nano .env
# Altere TODAS as senhas e secrets
docker-compose -f docker-compose.arm64.yml restart
```

### 2. Configurar SSL/HTTPS (com Nginx + Let's Encrypt):

```bash
# Instalar Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Configurar domínio (substitua seudominio.com)
sudo nano /etc/nginx/sites-available/saas

# Copie a configuração do arquivo nginx/conf.d/default.conf do projeto

# Habilitar site
sudo ln -s /etc/nginx/sites-available/saas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obter certificado SSL
sudo certbot --nginx -d seudominio.com -d api.seudominio.com

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

### 4. Monitoramento:

```bash
# Instalar fail2ban
sudo apt install -y fail2ban

# Configurar alertas
# Use Prometheus + Grafana + Alertmanager
```

---

## 📈 Otimizações para ARM64

### 1. Otimizar Docker:

```bash
# Editar daemon.json
sudo nano /etc/docker/daemon.json
```

Adicione:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
```

```bash
sudo systemctl restart docker
```

### 2. Limpar regularmente:

```bash
# Adicionar ao cron (semanal)
sudo crontab -e
# Adicione: 0 2 * * 0 docker system prune -af --volumes
```

### 3. Monitorar recursos:

```bash
# Instalar htop
sudo apt install -y htop

# Ver uso
htop
```

---

## 📞 Suporte

### Logs importantes:

```bash
# Sistema
journalctl -xe

# Docker
sudo journalctl -u docker

# Aplicação
docker-compose -f docker-compose.arm64.yml logs --tail=500
```

### Informações úteis:

```bash
# Versões
docker --version
docker-compose --version
uname -a

# Recursos
free -h
df -h
docker system df
```

---

## ✅ Checklist de Deploy

- [ ] VM Oracle Cloud ARM64 criada
- [ ] SSH configurado
- [ ] Repositório clonado
- [ ] Arquivo .env configurado com senhas fortes
- [ ] Script deploy-oracle-arm.sh executado
- [ ] Firewall Oracle Cloud configurado (Security Lists)
- [ ] iptables configurado no SO
- [ ] Serviços acessíveis externamente
- [ ] Backup configurado (cron)
- [ ] SSL/HTTPS configurado (produção)
- [ ] Monitoramento funcionando

---

**🎉 Deploy em Oracle Cloud ARM64 concluído com sucesso!** 🚀

**Recursos da VM Free Tier:**
- 4 CPUs ARM Ampere
- 24GB RAM
- 200GB Storage
- Largura de banda generosa
- **100% Gratuito permanentemente!**
