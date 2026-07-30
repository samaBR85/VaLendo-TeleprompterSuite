@echo off
cd /d "%~dp0"
title VaLendo

if not exist "node_modules" (
    echo Preparando o VaLendo pela primeira vez, aguarde...
    echo Isso pode levar alguns minutos.
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo Algo deu errado na instalacao. Tire um print desta janela e mande para o suporte.
        pause
        exit /b 1
    )
)

if not exist "out\main\index.js" (
    echo Construindo o VaLendo pela primeira vez, aguarde...
    echo.
    call npm run build
    if errorlevel 1 (
        echo.
        echo Algo deu errado ao construir o app. Tire um print desta janela e mande para o suporte.
        pause
        exit /b 1
    )
)

echo Abrindo o VaLendo...
call npx electron .

if errorlevel 1 (
    echo.
    echo O VaLendo fechou com um erro. Tire um print desta janela e mande para o suporte.
    pause
)
