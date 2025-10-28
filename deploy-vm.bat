@echo off
echo =========================================
echo   Deploy SaaS Platform - VM Windows
echo =========================================
echo.

REM Verificar se Docker está rodando
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Docker nao esta rodando!
    echo Por favor, inicie o Docker Desktop e tente novamente.
    pause
    exit /b 1
)

echo [OK] Docker esta rodando
echo.

REM Verificar se arquivo .env existe
if not exist .env (
    echo [AVISO] Arquivo .env nao encontrado.
    if exist .env.example (
        echo Criando .env a partir do .env.example...
        copy .env.example .env
        echo.
        echo IMPORTANTE: Edite o arquivo .env com suas credenciais!
        echo Pressione qualquer tecla apos editar...
        pause
    ) else (
        echo [ERRO] Arquivo .env.example nao encontrado!
        pause
        exit /b 1
    )
)

echo [1/5] Parando containers antigos...
docker-compose down 2>nul

echo.
echo [2/5] Removendo imagens antigas...
docker-compose down --rmi local 2>nul

echo.
echo [3/5] Buildando imagens (isso pode demorar alguns minutos)...
docker-compose build --no-cache

if %errorlevel% neq 0 (
    echo [ERRO] Falha ao buildar imagens
    pause
    exit /b 1
)

echo [OK] Imagens buildadas com sucesso
echo.

echo [4/5] Executando migrations do banco...
echo Aguardando PostgreSQL...
docker-compose up -d postgres
timeout /t 10 /nobreak >nul

REM Rodar migrations
docker-compose run --rm api npx prisma migrate deploy

echo.
echo [5/5] Iniciando todos os servicos...
docker-compose up -d

if %errorlevel% neq 0 (
    echo [ERRO] Falha ao iniciar servicos
    docker-compose logs
    pause
    exit /b 1
)

echo.
echo =========================================
echo   Deploy concluido com sucesso!
echo =========================================
echo.
echo Servicos disponiveis:
echo   - API:        http://localhost:3001
echo   - Web:        http://localhost:3000
echo   - Prometheus: http://localhost:9090
echo   - Grafana:    http://localhost:3003
echo.
echo Comandos uteis:
echo   - Ver logs:        docker-compose logs -f
echo   - Ver status:      docker-compose ps
echo   - Parar servicos:  docker-compose stop
echo   - Reiniciar:       docker-compose restart
echo.
pause
