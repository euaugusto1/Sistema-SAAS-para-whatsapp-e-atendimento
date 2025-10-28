@echo off
echo ========================================
echo  Enviando Projeto para GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Verificando repositorio...
git status
echo.

echo [2/4] Verificando remote...
git remote -v
echo.

echo [3/4] Enviando para GitHub...
git push -u origin main
echo.

if %errorlevel% equ 0 (
    echo ========================================
    echo  SUCESSO! Projeto enviado para GitHub
    echo ========================================
    echo.
    echo Repositorio: https://github.com/euaugusto1/Sistema-SAAS-para-whatsapp-e-atendimento
    echo.
) else (
    echo ========================================
    echo  ERRO ao enviar para GitHub
    echo ========================================
    echo.
    echo Possiveis causas:
    echo - Credenciais incorretas
    echo - Sem permissao no repositorio
    echo - Problemas de conexao
    echo.
    echo Tente executar manualmente:
    echo git push -u origin main
    echo.
)

pause
