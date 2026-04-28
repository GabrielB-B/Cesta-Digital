param(
    [Parameter(Mandatory = $true)]
    [string]$Database,
    [Parameter(Mandatory = $true)]
    [string]$User,
    [Parameter(Mandatory = $true)]
    [string]$Password,
    [string]$Host = "127.0.0.1",
    [int]$Port = 3306,
    [string]$OutputDir = "backups"
)

$ErrorActionPreference = "Stop"

$resolvedOutputDir = Resolve-Path -LiteralPath $OutputDir -ErrorAction SilentlyContinue
if (-not $resolvedOutputDir) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    $resolvedOutputDir = Resolve-Path -LiteralPath $OutputDir
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $resolvedOutputDir "$Database-$timestamp.sql"
$checksumFile = "$backupFile.sha256"

try {
    $env:MYSQL_PWD = $Password
    & mysqldump `
        --host=$Host `
        --port=$Port `
        --user=$User `
        --single-transaction `
        --routines `
        --triggers `
        --databases $Database `
        | Set-Content -LiteralPath $backupFile -Encoding UTF8

    if (-not (Test-Path -LiteralPath $backupFile)) {
        throw "Arquivo de backup nao foi gerado."
    }

    $hash = Get-FileHash -LiteralPath $backupFile -Algorithm SHA256
    "$($hash.Hash)  $([System.IO.Path]::GetFileName($backupFile))" | Set-Content -LiteralPath $checksumFile

    Write-Host "Backup gerado em: $backupFile"
    Write-Host "Checksum gerado em: $checksumFile"
}
finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}
