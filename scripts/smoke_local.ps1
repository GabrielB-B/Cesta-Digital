param(
    [string]$ApiUrl = "http://127.0.0.1:8000",
    [string]$FrontendUrl = "http://127.0.0.1:5173",
    [string]$LoginName = $env:FIRST_ADMIN_LOGIN_NAME,
    [string]$Password = $env:FIRST_ADMIN_PASSWORD
)

$ErrorActionPreference = "Stop"

function Assert-HttpOk {
    param(
        [string]$Name,
        [string]$Url
    )

    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
        throw "$Name respondeu HTTP $($response.StatusCode)."
    }

    Write-Host "$Name OK ($($response.StatusCode))"
}

if (-not $LoginName -or -not $Password) {
    throw "Informe -LoginName e -Password, ou defina FIRST_ADMIN_LOGIN_NAME e FIRST_ADMIN_PASSWORD no ambiente."
}

$normalizedApiUrl = $ApiUrl.TrimEnd("/")
$normalizedFrontendUrl = $FrontendUrl.TrimEnd("/")

Assert-HttpOk -Name "Frontend" -Url $normalizedFrontendUrl
Assert-HttpOk -Name "API root" -Url $normalizedApiUrl
Assert-HttpOk -Name "Health DB" -Url "$normalizedApiUrl/health/db"

$loginResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "$normalizedApiUrl/auth/login" `
    -SessionVariable cestaSession `
    -ContentType "application/x-www-form-urlencoded" `
    -Body @{
        username = $LoginName
        password = $Password
        grant_type = "password"
    }

if (-not $loginResponse.user_id) {
    throw "Login nao retornou a identificacao do usuario."
}

$me = Invoke-RestMethod `
    -Method Get `
    -Uri "$normalizedApiUrl/auth/me" `
    -WebSession $cestaSession
if (-not $me.email) {
    throw "Consulta /auth/me nao retornou usuario."
}

$dashboard = Invoke-RestMethod `
    -Method Get `
    -Uri "$normalizedApiUrl/dashboard/overview" `
    -WebSession $cestaSession

if ($null -eq $dashboard.total_families) {
    throw "Dashboard nao retornou total_families."
}

Write-Host "Login OK para $($me.login_name) ($($me.email))"
Write-Host "Dashboard OK"
Write-Host "Smoke local concluido com sucesso."
