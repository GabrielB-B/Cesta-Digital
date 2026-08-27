param(
    [string]$Address,
    [int]$FrontendPort = 5173,
    [int]$ApiPort = 8010
)

$ErrorActionPreference = "Stop"
$repositoryDir = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $repositoryDir ".ux-sandbox"
$statePath = Join-Path $runtimeDir "processes.json"
$backendDir = Join-Path $repositoryDir "backend"
$frontendDir = Join-Path $repositoryDir "frontend"
$pythonPath = Join-Path $backendDir ".venv\Scripts\python.exe"
$computerHostName = [System.Net.Dns]::GetHostName().ToLowerInvariant()

if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw "Ambiente Python nao encontrado em $pythonPath."
}

if (-not $Address) {
    $network = Get-NetIPConfiguration |
        Where-Object {
            $_.IPv4Address -and
            $_.IPv4DefaultGateway -and
            $_.NetAdapter.Status -eq "Up"
        } |
        Select-Object -First 1
    if (-not $network) {
        throw "Nao foi possivel detectar um IPv4 de rede local com gateway ativo."
    }
    $Address = $network.IPv4Address.IPAddress
}

if (-not [System.Net.IPAddress]::TryParse($Address, [ref]([System.Net.IPAddress]$null))) {
    throw "Endereco IPv4 invalido: $Address"
}

foreach ($port in @($FrontendPort, $ApiPort)) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if ($listener) {
        $owners = ($listener | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
        throw "A porta $port ja esta em uso pelo processo $owners. Nenhum processo foi encerrado."
    }
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$apiUrl = "http://${computerHostName}:$ApiPort"
$apiIpUrl = "http://${Address}:$ApiPort"
$frontendUrl = "http://${computerHostName}:$FrontendPort"
$frontendIpUrl = "http://${Address}:$FrontendPort"
$backendOutput = Join-Path $runtimeDir "backend.out.log"
$backendError = Join-Path $runtimeDir "backend.err.log"
$frontendOutput = Join-Path $runtimeDir "frontend.out.log"
$frontendError = Join-Path $runtimeDir "frontend.err.log"

function Wait-Http {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 45
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                return
            }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    } while ((Get-Date) -lt $deadline)

    throw "Tempo esgotado aguardando $Url."
}

$backendProcess = $null
$frontendProcess = $null
try {
    $backendProcess = Start-Process `
        -FilePath $pythonPath `
        -ArgumentList @(
            "scripts/start_ux_sandbox.py",
            "--host", "0.0.0.0",
            "--port", "$ApiPort",
            "--frontend-origin", $frontendUrl,
            "--frontend-origin", $frontendIpUrl
        ) `
        -WorkingDirectory $backendDir `
        -RedirectStandardOutput $backendOutput `
        -RedirectStandardError $backendError `
        -WindowStyle Hidden `
        -PassThru

    Wait-Http -Url "http://127.0.0.1:$ApiPort/health/db"

    $npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
    $previousApiUrl = $env:VITE_API_URL
    $previousAppEnv = $env:VITE_APP_ENV
    $previousUxLocalHost = $env:UX_LOCAL_HOST
    try {
        $env:VITE_API_URL = $apiUrl
        $env:VITE_APP_ENV = "staging"
        $env:UX_LOCAL_HOST = $computerHostName
        $frontendProcess = Start-Process `
            -FilePath $npmPath `
            -ArgumentList @(
                "run", "dev", "--",
                "--host", "0.0.0.0",
                "--port", "$FrontendPort",
                "--strictPort"
            ) `
            -WorkingDirectory $frontendDir `
            -RedirectStandardOutput $frontendOutput `
            -RedirectStandardError $frontendError `
            -WindowStyle Hidden `
            -PassThru
    }
    finally {
        if ($null -eq $previousApiUrl) {
            Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
        }
        else {
            $env:VITE_API_URL = $previousApiUrl
        }
        if ($null -eq $previousAppEnv) {
            Remove-Item Env:VITE_APP_ENV -ErrorAction SilentlyContinue
        }
        else {
            $env:VITE_APP_ENV = $previousAppEnv
        }
        if ($null -eq $previousUxLocalHost) {
            Remove-Item Env:UX_LOCAL_HOST -ErrorAction SilentlyContinue
        }
        else {
            $env:UX_LOCAL_HOST = $previousUxLocalHost
        }
    }

    Wait-Http -Url "http://127.0.0.1:$FrontendPort/login"

    $state = [ordered]@{
        address = $Address
        frontend_url = $frontendUrl
        frontend_ip_url = $frontendIpUrl
        api_url = $apiUrl
        api_ip_url = $apiIpUrl
        backend = [ordered]@{
            id = $backendProcess.Id
            started_at = $backendProcess.StartTime.ToUniversalTime().ToString("o")
        }
        frontend = [ordered]@{
            id = $frontendProcess.Id
            started_at = $frontendProcess.StartTime.ToUniversalTime().ToString("o")
        }
    }
    $state | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding UTF8

    [pscustomobject]@{
        Frontend = $frontendUrl
        FrontendIP = $frontendIpUrl
        API = $apiUrl
        Health = "$apiUrl/health/db"
        Estado = $statePath
    } | Format-List
}
catch {
    foreach ($process in @($frontendProcess, $backendProcess)) {
        if ($process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }
    throw
}
