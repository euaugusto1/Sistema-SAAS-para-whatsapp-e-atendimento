#!/bin/bash

echo "========================================="
echo "  Deploy SaaS - Oracle Cloud ARM64"
echo "========================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar arquitetura
ARCH=$(uname -m)
echo -e "${BLUE}Arquitetura detectada: $ARCH${NC}"

if [[ "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
    echo -e "${YELLOW}⚠ AVISO: Esta VM não parece ser ARM64${NC}"
    echo "Este script é otimizado para Oracle Cloud ARM (aarch64)"
    echo -e "Pressione ENTER para continuar ou Ctrl+C para cancelar..."
    read
fi

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Por favor, execute como root: sudo $0${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo "  [1/6] Instalando dependências"
echo "========================================="

# Atualizar sistema
echo "Atualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq

# Instalar pacotes básicos
echo "Instalando pacotes essenciais..."
apt-get install -y -qq \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release

echo -e "${GREEN}✓${NC} Dependências instaladas"

echo ""
echo "========================================="
echo "  [2/6] Instalando Docker"
echo "========================================="

# Verificar se Docker já está instalado
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker já instalado: $(docker --version)"
else
    echo "Instalando Docker..."
    
    # Remover versões antigas
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null
    
    # Adicionar repositório Docker
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Habilitar e iniciar Docker
    systemctl enable docker
    systemctl start docker
    
    echo -e "${GREEN}✓${NC} Docker instalado: $(docker --version)"
fi

# Verificar Docker Compose
if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose já instalado: $(docker-compose --version)"
else
    echo "Instalando Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓${NC} Docker Compose instalado"
fi

echo ""
echo "========================================="
echo "  [3/6] Configurando ambiente"
echo "========================================="

# Verificar arquivo .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}Arquivo .env não encontrado${NC}"
    if [ -f .env.vm ]; then
        echo "Copiando .env.vm para .env..."
        cp .env.vm .env
        echo -e "${YELLOW}"
        echo "╔═══════════════════════════════════════════════════════════╗"
        echo "║  IMPORTANTE: EDITE O ARQUIVO .env ANTES DE CONTINUAR!   ║"
        echo "╚═══════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        echo "Execute: nano .env"
        echo ""
        echo "Variáveis OBRIGATÓRIAS para editar:"
        echo "  - POSTGRES_PASSWORD"
        echo "  - REDIS_PASSWORD"
        echo "  - JWT_SECRET (mínimo 32 caracteres)"
        echo "  - JWT_REFRESH_SECRET (mínimo 32 caracteres)"
        echo "  - EVOLUTION_API_URL"
        echo "  - EVOLUTION_API_KEY"
        echo ""
        echo "Pressione ENTER após editar o arquivo .env..."
        read
    else
        echo -e "${RED}Erro: Arquivos .env e .env.vm não encontrados!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Arquivo .env configurado"

echo ""
echo "========================================="
echo "  [4/6] Parando containers antigos"
echo "========================================="

# Parar e remover containers antigos
docker-compose -f docker-compose.arm64.yml down 2>/dev/null || true
docker-compose down 2>/dev/null || true

echo -e "${GREEN}✓${NC} Containers antigos removidos"

echo ""
echo "========================================="
echo "  [5/6] Buildando imagens ARM64"
echo "========================================="
echo -e "${YELLOW}⚠ Isso pode demorar 10-15 minutos...${NC}"
echo ""

# Build com cache
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

docker-compose -f docker-compose.arm64.yml build --parallel

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Erro ao buildar imagens${NC}"
    echo ""
    echo "Tentando build sem cache..."
    docker-compose -f docker-compose.arm64.yml build --no-cache --parallel
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Falha no build${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Imagens buildadas com sucesso"

echo ""
echo "========================================="
echo "  [6/6] Iniciando serviços"
echo "========================================="

# Iniciar PostgreSQL primeiro
echo "Iniciando PostgreSQL..."
docker-compose -f docker-compose.arm64.yml up -d postgres
sleep 15

# Verificar se PostgreSQL está saudável
echo "Verificando PostgreSQL..."
for i in {1..30}; do
    if docker-compose -f docker-compose.arm64.yml ps postgres | grep -q "healthy"; then
        echo -e "${GREEN}✓${NC} PostgreSQL está pronto"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "Executando migrations..."
docker-compose -f docker-compose.arm64.yml run --rm api npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Migrations executadas"
else
    echo -e "${YELLOW}⚠ Migrations falharam, mas continuando...${NC}"
fi

echo ""
echo "Executando seed do banco..."
docker-compose -f docker-compose.arm64.yml run --rm api npx prisma db seed 2>/dev/null || echo "Seed já executado ou falhou"

echo ""
echo "Iniciando todos os serviços..."
docker-compose -f docker-compose.arm64.yml up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Erro ao iniciar serviços${NC}"
    docker-compose -f docker-compose.arm64.yml logs
    exit 1
fi

# Aguardar serviços ficarem saudáveis
echo ""
echo "Aguardando serviços iniciarem..."
sleep 20

echo ""
echo "========================================="
echo -e "${GREEN}✓ Deploy concluído com sucesso!${NC}"
echo "========================================="
echo ""

# Obter IP da VM
VM_IP=$(hostname -I | awk '{print $1}')

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║            SERVIÇOS DISPONÍVEIS                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  🌐 Frontend:   http://$VM_IP:3000"
echo "  🔧 API:        http://$VM_IP:3001"
echo "  📊 Prometheus: http://$VM_IP:9090"
echo "  📈 Grafana:    http://$VM_IP:3003"
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║            CREDENCIAIS PADRÃO                            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  Grafana:"
echo "    • Usuário: admin"
echo "    • Senha: admin123_change_this"
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║            COMANDOS ÚTEIS                                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  Ver logs:          docker-compose -f docker-compose.arm64.yml logs -f"
echo "  Ver status:        docker-compose -f docker-compose.arm64.yml ps"
echo "  Reiniciar:         docker-compose -f docker-compose.arm64.yml restart"
echo "  Parar:             docker-compose -f docker-compose.arm64.yml stop"
echo "  Remover tudo:      docker-compose -f docker-compose.arm64.yml down -v"
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║            CONFIGURAR FIREWALL                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  Oracle Cloud requer configuração de firewall:"
echo ""
echo "  1. No console da Oracle Cloud:"
echo "     • Vá em Networking → Virtual Cloud Networks"
echo "     • Clique na sua VCN"
echo "     • Security Lists → Default Security List"
echo "     • Add Ingress Rules:"
echo "       - Porta 3000 (Frontend)"
echo "       - Porta 3001 (API)"
echo "       - Porta 3003 (Grafana) - opcional"
echo "       - Porta 9090 (Prometheus) - opcional"
echo ""
echo "  2. No sistema operacional:"
echo "     sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT"
echo "     sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT"
echo "     sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3003 -j ACCEPT"
echo "     sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 9090 -j ACCEPT"
echo "     sudo netfilter-persistent save"
echo ""
echo "========================================="
echo -e "${GREEN}🎉 Deploy finalizado!${NC}"
echo "========================================="
