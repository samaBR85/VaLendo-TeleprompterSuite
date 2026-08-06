@echo off
cd /d "%~dp0"
title Valendo

if not exist "node_modules" (
    echo Preparando o Valendo pela primeira vez, aguarde...
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
    echo Construindo o Valendo pela primeira vez, aguarde...
    echo.
    call npm run build
    if errorlevel 1 (
        echo.
        echo Algo deu errado ao construir o app. Tire um print desta janela e mande para o suporte.
        pause
        exit /b 1
    )
)

echo Abrindo o Valendo...

rem Chama o electron DIRETO, e nao pelo npx.
rem
rem Medido nesta maquina: 1,3s pelo npx contra 0,9s direto. Sao 0,4s, nao os
rem "varios segundos" que eu supus antes de medir - o npx nunca foi o motivo
rem de o app parecer travado. O ganho e pequeno e real, e some uma peca do
rem caminho: o npx precisa existir e resolver o pacote; o binario ja esta ali.
rem sem aspas: o caminho nao tem espacos, e aspas em call so somam risco
call node_modules\.bin\electron.cmd .

if errorlevel 1 (
    echo.
    echo O Valendo fechou com um erro. Tire um print desta janela e mande para o suporte.
    pause
)
