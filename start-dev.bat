@echo off
echo ========================================
echo  Iniciando Servidores de Desenvolvimento
echo ========================================
echo.

REM Verificar se Redis está rodando
echo [1/4] Verificando Redis...
docker ps | findstr redis >nul
if %errorlevel% neq 0 (
    echo Redis não está rodando. Iniciando...
    cd /d "%~dp0"
    docker-compose -f docker-compose.dev.yml up -d redis
    timeout /t 3 >nul
) else (
    echo Redis já está rodando.
)
echo.

REM Instalar dependências da API se necessário
echo [2/4] Verificando dependências da API...
cd /d "%~dp0apps\api"
if not exist "node_modules" (
    echo Instalando dependências da API...
    call npm install
)
echo Instalando dependências adicionais...
call npm install @nestjs/throttler stripe mercadopago
echo.

REM Instalar dependências do Web se necessário
echo [3/4] Verificando dependências do Web...
cd /d "%~dp0apps\web"
if not exist "node_modules" (
    echo Instalando dependências do Web...
    call npm install
)
echo Instalando recharts...
call npm install recharts
echo.

REM Iniciar servidores
echo [4/4] Iniciando servidores...
echo.
echo ========================================
echo  Abrindo terminais...
echo ========================================
echo  - API:  http://localhost:3001
echo  - Web:  http://localhost:3000
echo ========================================
echo.

REM Abrir terminal para API
start "SAAS API - http://localhost:3001" cmd /k "cd /d %~dp0apps\api && npm run dev"

REM Aguardar 2 segundos
timeout /t 2 >nul

REM Abrir terminal para Web
start "SAAS Web - http://localhost:3000" cmd /k "cd /d %~dp0apps\web && npm run dev"

echo.
echo Servidores iniciados com sucesso!
echo.
echo Pressione qualquer tecla para sair...
pause >nul
