# Configurar encoding para emojis
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "████████████████████████████████████████████████████████████████" -ForegroundColor Red
Write-Host "██                                                            ██" -ForegroundColor Red
Write-Host "██             🛑 PARANDO SERVIDORES 🛑                       ██" -ForegroundColor Red
Write-Host "██                                                            ██" -ForegroundColor Red
Write-Host "████████████████████████████████████████████████████████████████" -ForegroundColor Red
Write-Host ""

Write-Host "🔍 Procurando processos rodando..." -ForegroundColor Yellow
Write-Host ""

# Função para matar processos por porta
function Kill-ProcessByPort($port, $name) {
    Write-Host "🛑 Encerrando $name (porta $port)..." -ForegroundColor Red
    $processes = netstat -ano | Select-String ":$port " 
    foreach ($process in $processes) {
        $pid = ($process -split '\s+')[-1]
        try {
            Write-Host "   Matando PID: $pid" -ForegroundColor Gray
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        } catch {
            # Ignorar erros
        }
    }
}

Kill-ProcessByPort 8001 "Backend"
Kill-ProcessByPort 5173 "Frontend"

Write-Host "🛑 Limpando processos Python..." -ForegroundColor Red
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "🛑 Limpando processos Node.js..." -ForegroundColor Red
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✅ Todos os servidores foram encerrados!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Para reiniciar, execute: .\start.ps1" -ForegroundColor Yellow
Write-Host ""
Read-Host "Pressione Enter para continuar..." 