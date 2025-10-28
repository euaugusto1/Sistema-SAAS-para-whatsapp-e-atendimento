@echo off
echo ========================================
echo  Parando Servidores de Desenvolvimento
echo ========================================
echo.

echo Parando containers Docker...
cd /d "%~dp0"
docker-compose -f docker-compose.dev.yml down

echo.
echo AVISO: Os servidores Node (API e Web) precisam ser
echo fechados manualmente nas janelas de terminal abertas.
echo.
echo Pressione Ctrl+C em cada janela de terminal para parar.
echo.
pause
