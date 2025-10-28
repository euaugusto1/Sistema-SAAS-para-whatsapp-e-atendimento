@echo off
REM SaaS Platform - Production Deployment Script (Windows)
REM Usage: deploy.bat [environment]
REM Environments: staging, production

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=production

echo.
echo ========================================
echo   SaaS Platform Deployment
echo   Environment: %ENVIRONMENT%
echo ========================================
echo.

REM Validate environment
if not "%ENVIRONMENT%"=="staging" if not "%ENVIRONMENT%"=="production" (
    echo [ERROR] Invalid environment: %ENVIRONMENT%
    echo Usage: deploy.bat [staging^|production]
    exit /b 1
)

REM Load environment variables
if exist ".env.%ENVIRONMENT%" (
    echo [INFO] Loading environment variables from .env.%ENVIRONMENT%
    for /f "delims=" %%x in (.env.%ENVIRONMENT%) do (
        set "%%x"
    )
) else (
    echo [ERROR] Environment file .env.%ENVIRONMENT% not found!
    exit /b 1
)

REM Create timestamp for backup
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_DIR=backups\%TIMESTAMP%

echo [INFO] Creating backup directory: %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul

REM Backup database
echo [INFO] Backing up database...
docker exec saas-postgres pg_dump -U %POSTGRES_USER% %POSTGRES_DB% > "%BACKUP_DIR%\database.sql"
echo [INFO] Database backup saved

REM Backup environment files
echo [INFO] Backing up environment files...
copy /y ".env.%ENVIRONMENT%" "%BACKUP_DIR%\.env.%ENVIRONMENT%.backup" >nul

REM Pull latest changes
echo [INFO] Pulling latest code from repository...
git pull origin %ENVIRONMENT%

REM Install dependencies
echo [INFO] Installing dependencies...
call npm ci

REM Run database migrations
echo [INFO] Running database migrations...
cd apps\api
call npx prisma migrate deploy
cd ..\..

REM Build Docker images
echo [INFO] Building Docker images...
docker-compose -f docker-compose.yml build --no-cache

REM Stop old containers
echo [INFO] Stopping old containers...
docker-compose -f docker-compose.yml down

REM Start new containers
echo [INFO] Starting new containers...
docker-compose -f docker-compose.yml up -d

REM Wait for services
echo [INFO] Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Health checks
echo [INFO] Running health checks...

curl -f http://localhost:3001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] API is healthy
) else (
    echo [ERROR] API health check failed
    echo [WARNING] Rolling back deployment...
    docker-compose -f docker-compose.yml down
    exit /b 1
)

curl -f http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Web is healthy
) else (
    echo [ERROR] Web health check failed
    echo [WARNING] Rolling back deployment...
    docker-compose -f docker-compose.yml down
    exit /b 1
)

REM Clean up old Docker images
echo [INFO] Cleaning up old Docker images...
docker image prune -f >nul

REM Display running containers
echo.
echo [INFO] Running containers:
docker-compose -f docker-compose.yml ps

echo.
echo ========================================
echo   Deployment Completed Successfully!
echo ========================================
echo.
echo Backup saved to: %BACKUP_DIR%
echo.
echo Useful commands:
echo   - View logs: docker-compose logs -f
echo   - Restart services: docker-compose restart
echo   - Stop services: docker-compose down
echo.

endlocal
