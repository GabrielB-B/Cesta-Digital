$ErrorActionPreference = "Stop"
$repositoryDir = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $repositoryDir ".ux-sandbox\processes.json"

if (-not (Test-Path -LiteralPath $statePath)) {
    Write-Output "Nenhum estado de sandbox local foi encontrado."
    exit 0
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$stopped = @()
$skipped = @()

foreach ($entryName in @("frontend", "backend")) {
    $entry = $state.$entryName
    $process = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
    if (-not $process) {
        $skipped += "${entryName}: processo ja encerrado"
        continue
    }

    $expectedStart = [datetime]::Parse($entry.started_at).ToUniversalTime()
    $actualStart = $process.StartTime.ToUniversalTime()
    if ([math]::Abs(($actualStart - $expectedStart).TotalSeconds) -gt 2) {
        $skipped += "${entryName}: PID reutilizado; processo preservado"
        continue
    }

    & taskkill.exe /PID $process.Id /T /F | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $stopped += "${entryName}: PID $($process.Id)"
    }
}

Remove-Item -LiteralPath $statePath -Force
Write-Output "Sandbox local encerrado."
if ($stopped) {
    Write-Output ("Encerrados: " + ($stopped -join "; "))
}
if ($skipped) {
    Write-Output ("Observacoes: " + ($skipped -join "; "))
}
