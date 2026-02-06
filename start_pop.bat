@echo off
title POP - Inicializador Geral

echo =========================================
echo   INICIANDO SISTEMA POP - SERVIDOR
echo =========================================
echo.

:: ===============================
:: CONFIG
:: ===============================
set BASE=J:\Isaac\Isaac\pop
set BACKEND=%BASE%\backend
set FRONTEND=%BASE%\frontend

set PYTHON_BACK=%BACKEND%\.venv\Scripts\python.exe
set PORT_API=8100
set PORT_FRONT=8080

:: ===============================
:: VERIFICACOES
:: ===============================

echo Verificando pasta base...
if not exist "%BASE%" (
    echo ERRO: Pasta base nao encontrada!
    pause
    exit /b
)

echo Verificando Python do backend...
if not exist "%PYTHON_BACK%" (
    echo ERRO: Ambiente virtual nao encontrado!
    echo Rode: python -m venv .venv
    pause
    exit /b
)

:: ===============================
:: BACKEND
:: ===============================

echo.
echo Iniciando BACKEND (API Flask)...
echo Porta: %PORT_API%

start "POP - API" cmd /k ^
cd /d "%BACKEND%" ^& ^
"%PYTHON_BACK%" app.py

timeout /t 5 >nul

:: ===============================
:: FRONTEND
:: ===============================

echo.
echo Iniciando FRONTEND (HTTP Server)...
echo Porta: %PORT_FRONT%

start "POP - FRONTEND" cmd /k ^
cd /d "%FRONTEND%" ^& ^
python -m http.server %PORT_FRONT%

:: ===============================
:: FINAL
:: ===============================

echo.
echo =========================================
echo  SISTEMA POP INICIADO COM SUCESSO
echo =========================================
echo.
echo API:   http://10.42.92.200:%PORT_API%
echo Front: http://10.42.92.200:%PORT_FRONT%
echo.

pause
