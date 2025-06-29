# Script para iniciar o Pitch Training App
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "|                                                          |" -ForegroundColor Cyan  
Write-Host "|            PITCH TRAINING APP - LAUNCHER                 |" -ForegroundColor Cyan
Write-Host "|                                                          |" -ForegroundColor Cyan  
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Parando servidores anteriores..." -ForegroundColor Yellow
Write-Host ""

# Função para matar processos por porta
function Kill-ProcessByPort($port) {
    $processes = netstat -ano | Select-String ":$port " 
    foreach ($process in $processes) {
        $pid = ($process -split '\s+')[-1]
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        } catch {
            # Ignorar erros
        }
    }
}

Write-Host "Encerrando processos na porta 8001 (Backend)..." -ForegroundColor Red
Kill-ProcessByPort 8001

Write-Host "Encerrando processos na porta 5173 (Frontend)..." -ForegroundColor Red
Kill-ProcessByPort 5173

Write-Host "Limpando processos Python/Node restantes..." -ForegroundColor Red
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host "Servidores anteriores encerrados!" -ForegroundColor Green
Write-Host ""

Write-Host "Iniciando Backend (Python)..." -ForegroundColor Blue
Write-Host ""

# Iniciar Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; .\venv\Scripts\Activate.ps1; python main_simple.py" -WindowStyle Normal

Write-Host "Aguardando backend inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Iniciando Frontend (React)..." -ForegroundColor Blue
Write-Host ""

# Iniciar Frontend  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev" -WindowStyle Normal

Write-Host "Aguardando frontend inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "|                                                          |" -ForegroundColor Green
Write-Host "|                    TUDO INICIADO!                        |" -ForegroundColor Green
Write-Host "|                                                          |" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "SERVICOS RODANDO:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:   http://localhost:8001" -ForegroundColor Blue
Write-Host "Frontend:  http://localhost:5173" -ForegroundColor Blue
Write-Host "WebSocket: ws://localhost:8001/ws" -ForegroundColor Blue
Write-Host ""
Write-Host "Abra seu navegador em: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para parar os servidores: feche as janelas ou use stop.ps1" -ForegroundColor Gray
Write-Host ""

# Aguardar e verificar status
Start-Sleep -Seconds 8

Write-Host "Verificando status dos servidores..." -ForegroundColor Cyan
Write-Host ""

$backend = netstat -an | Select-String ":8001 "
if ($backend) {
    Write-Host "Backend rodando na porta 8001 - OK" -ForegroundColor Green
} else {
    Write-Host "Backend NAO esta rodando na porta 8001" -ForegroundColor Red
    Write-Host "Verifique a janela do Backend Server para erros" -ForegroundColor Yellow
}

$frontend = netstat -an | Select-String ":5173 "
if ($frontend) {
    Write-Host "Frontend rodando na porta 5173 - OK" -ForegroundColor Green
} else {
    Write-Host "Frontend NAO esta rodando na porta 5173" -ForegroundColor Red
    Write-Host "Verifique a janela do Frontend Server para erros" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Pronto! Sua aplicacao deve estar rodando!" -ForegroundColor Green
Write-Host "Acesse: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

# Tentar abrir o navegador automaticamente
try {
    Start-Process "http://localhost:5173"
    Write-Host "Navegador aberto automaticamente!" -ForegroundColor Green
} catch {
    Write-Host "Abra manualmente: http://localhost:5173" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Pressione Enter para continuar..." 