param(
    [Parameter(Mandatory = $true)]
    [string]$InputFile,
    [Parameter(Mandatory = $true)]
    [string]$User,
    [Parameter(Mandatory = $true)]
    [string]$Password,
    [string]$Host = "127.0.0.1",
    [int]$Port = 3306
)

$ErrorActionPreference = "Stop"
$resolvedInputFile = Resolve-Path -LiteralPath $InputFile

if (-not $resolvedInputFile) {
    throw "Arquivo de backup nao encontrado."
}

try {
    $env:MYSQL_PWD = $Password
    Get-Content -LiteralPath $resolvedInputFile | & mysql `
        --host=$Host `
        --port=$Port `
        --user=$User

    Write-Host "Restore concluido a partir de: $resolvedInputFile"
}
finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}
