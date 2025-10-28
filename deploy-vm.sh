#!/bin/bash

echo "========================================="
echo "  Deploy SaaS Platform - VM"
echo "========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Por favor, execute como root (sudo)${NC}"
    exit 1
fi

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker não encontrado. Instalando...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose não encontrado. Instalando...${NC}"
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo -e "${GREEN}✓${NC} Docker e Docker Compose instalados"
echo ""

# Verificar se arquivo .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}Arquivo .env não encontrado. Criando a partir do .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠ IMPORTANTE: Edite o arquivo .env com suas credenciais!${NC}"
        echo "Pressione ENTER para continuar após editar o .env..."
        read
    else
        echo -e "${RED}Arquivo .env.example não encontrado!${NC}"
        exit 1
    fi
fi

echo "[1/5] Parando containers antigos..."
docker-compose down 2>/dev/null

echo ""
echo "[2/5] Removendo imagens antigas..."
docker-compose down --rmi local 2>/dev/null

echo ""
echo "[3/5] Buildando imagens (isso pode demorar alguns minutos)..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Erro ao buildar imagens${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Imagens buildadas com sucesso"
echo ""

echo "[4/5] Executando migrations do banco..."
# Aguardar PostgreSQL estar pronto
echo "Aguardando PostgreSQL..."
docker-compose up -d postgres
sleep 10

# Rodar migrations
docker-compose run --rm api npx prisma migrate deploy

echo ""
echo "[5/5] Iniciando todos os serviços..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Erro ao iniciar serviços${NC}"
    docker-compose logs
    exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}✓ Deploy concluído com sucesso!${NC}"
echo "========================================="
echo ""
echo "Serviços disponíveis:"
echo "  • API:        http://$(hostname -I | awk '{print $1}'):3001"
echo "  • Web:        http://$(hostname -I | awk '{print $1}'):3000"
echo "  • Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
echo "  • Grafana:    http://$(hostname -I | awk '{print $1}'):3003"
echo ""
echo "Comandos úteis:"
echo "  • Ver logs:           docker-compose logs -f"
echo "  • Ver status:         docker-compose ps"
echo "  • Parar serviços:     docker-compose stop"
echo "  • Reiniciar:          docker-compose restart"
echo ""
