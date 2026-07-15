[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

function Assert-True {
    param(
        [Parameter(Mandatory = $true)][bool]$Condition,
        [Parameter(Mandatory = $true)][string]$Message
    )
    if (-not $Condition) { throw "ASSERTION FAILED: $Message" }
}

function Assert-ThrowsLike {
    param(
        [Parameter(Mandatory = $true)][scriptblock]$Action,
        [Parameter(Mandatory = $true)][string]$Pattern
    )
    try { & $Action }
    catch {
        if ($_.Exception.Message -like $Pattern) { return }
        throw "Era esperado erro '$Pattern', mas ocorreu: $($_.Exception.Message)"
    }
    throw "Era esperado erro '$Pattern', mas a acao terminou com sucesso."
}

function Reset-FakeTarget {
    Remove-Item -LiteralPath $script:FakeRestoreState -Force -ErrorAction SilentlyContinue
    $env:FAKE_RESTORE_VARIANT = "valid"
    $env:FAKE_TARGET_PRESET = "empty"
    $env:FAKE_MYSQL_RESTORE_EXIT = "0"
}

function Copy-BackupSet {
    param(
        [Parameter(Mandatory = $true)]$BackupResult,
        [Parameter(Mandatory = $true)][string]$Destination
    )
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    $dump = Join-Path $Destination ([IO.Path]::GetFileName($BackupResult.BackupFile))
    $checksum = Join-Path $Destination ([IO.Path]::GetFileName($BackupResult.ChecksumFile))
    $manifest = Join-Path $Destination ([IO.Path]::GetFileName($BackupResult.ManifestFile))
    Copy-Item -LiteralPath $BackupResult.BackupFile -Destination $dump
    Copy-Item -LiteralPath $BackupResult.ChecksumFile -Destination $checksum
    Copy-Item -LiteralPath $BackupResult.ManifestFile -Destination $manifest
    return [pscustomobject]@{ Dump = $dump; Checksum = $checksum; Manifest = $manifest }
}

function Assert-CredentialCaptures {
    param(
        [Parameter(Mandatory = $true)][string]$CaptureFile,
        [Parameter(Mandatory = $true)][string]$ExpectedOptionContent
    )
    $records = @(Get-Content -LiteralPath $CaptureFile | ForEach-Object { $_ | ConvertFrom-Json })
    Assert-True ($records.Count -gt 0) "o contrato deve capturar chamadas autenticadas"
    foreach ($record in $records) {
        $comparison = [StringComparison]::Ordinal
        if ($env:OS -eq "Windows_NT") { $comparison = [StringComparison]::OrdinalIgnoreCase }
        $optionPath = [IO.Path]::GetFullPath("$($record.option_path)")
        $optionDirectory = [IO.Path]::GetFullPath("$($record.option_directory)")
        $optionParent = [IO.Directory]::GetParent($optionPath).FullName
        $temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([char[]]"\/")
        $directoryParent = [IO.Directory]::GetParent($optionDirectory).FullName.TrimEnd([char[]]"\/")

        Assert-True ($record.first_argument -eq "--defaults-extra-file=$($record.option_path)") `
            "option file deve ser sempre o primeiro argumento"
        Assert-True ($optionParent.Equals($optionDirectory, $comparison)) `
            "option file deve ficar dentro do diretorio privado capturado"
        Assert-True ([IO.Path]::GetFileName($optionPath) -eq "client.cnf") `
            "option file deve usar o nome fixo dentro do diretorio aleatorio"
        Assert-True ([IO.Path]::GetFileName($optionDirectory) -match '^cesta-mysql-[a-f0-9]{32}$') `
            "diretorio privado deve usar nome aleatorio reconhecivel"
        Assert-True ($directoryParent.Equals($temporaryRoot, $comparison)) `
            "diretorio privado deve ser filho direto da pasta temporaria do sistema"
        Assert-True (@($record.directory_entries).Count -eq 1 -and $record.directory_entries[0] -eq "client.cnf") `
            "diretorio privado deve conter somente o option file"
        Assert-True ($record.option_content -ceq $ExpectedOptionContent) `
            "senha deve estar escapada corretamente no option file"
        Assert-True (-not (Test-Path -LiteralPath $record.option_path)) `
            "option file deve ser removido mesmo apos falhas"
        Assert-True (-not (Test-Path -LiteralPath $record.option_directory)) `
            "diretorio privado deve ser removido mesmo apos falhas"

        if ($env:OS -eq "Windows_NT") {
            Assert-True ([bool]$record.directory_acl_protected) "DACL do diretorio privado deve ser protegida"
            Assert-True ($record.directory_owner_sid -eq $record.current_sid) "diretorio deve pertencer ao SID atual"
            Assert-True (@($record.directory_acl_rules).Count -eq 1) "DACL do diretorio deve conter uma regra"
            Assert-True (-not [bool]$record.directory_acl_rules[0].inherited) "regra do diretorio nao pode ser herdada"
            Assert-True ($record.directory_acl_rules[0].type -eq "Allow") "regra do diretorio deve permitir acesso"
            Assert-True ($record.directory_acl_rules[0].sid -eq $record.current_sid) "diretorio deve permitir somente o SID atual"
            Assert-True ($record.directory_acl_rules[0].rights -match "FullControl") "SID atual deve ter controle total do diretorio"
            Assert-True (
                $record.directory_acl_rules[0].inheritance -match "ContainerInherit" -and
                $record.directory_acl_rules[0].inheritance -match "ObjectInherit"
            ) "ACL privada deve ser herdavel apenas pelos filhos do diretorio"

            Assert-True ([bool]$record.file_acl_protected) "DACL do option file deve ser protegida"
            Assert-True ($record.file_owner_sid -eq $record.current_sid) "option file deve pertencer ao SID atual"
            Assert-True (@($record.file_acl_rules).Count -eq 1) "DACL do option file deve conter uma regra"
            Assert-True (-not [bool]$record.file_acl_rules[0].inherited) "regra do option file nao pode ser herdada"
            Assert-True ($record.file_acl_rules[0].type -eq "Allow") "regra exclusiva deve permitir acesso"
            Assert-True ($record.file_acl_rules[0].sid -eq $record.current_sid) "option file deve permitir somente o SID atual"
            Assert-True ($record.file_acl_rules[0].rights -match "FullControl") "SID atual deve ter controle total do option file"
            Assert-True ($record.file_acl_rules[0].inheritance -eq "None") "option file nao deve propagar ACL"
        }
        else {
            Assert-True ([int]$record.directory_unix_mode -eq 448) `
                "diretorio privado Unix deve usar modo exato 0700"
            Assert-True ([int]$record.file_unix_mode -eq 384) `
                "option file Unix deve usar modo exato 0600"
        }
    }
}

function Get-CredentialCaptureCount {
    param([Parameter(Mandatory = $true)][string]$CaptureFile)
    if (-not (Test-Path -LiteralPath $CaptureFile -PathType Leaf)) { return 0 }
    return @(Get-Content -LiteralPath $CaptureFile).Count
}

function Assert-NewCredentialArtifactsRemoved {
    param(
        [Parameter(Mandatory = $true)][string]$CaptureFile,
        [Parameter(Mandatory = $true)][int]$SinceCount,
        [Parameter(Mandatory = $true)][string]$Scenario
    )

    $newRecords = @(
        Get-Content -LiteralPath $CaptureFile |
            Select-Object -Skip $SinceCount |
            ForEach-Object { $_ | ConvertFrom-Json }
    )
    Assert-True ($newRecords.Count -gt 0) "$Scenario deve executar ao menos uma chamada autenticada"
    foreach ($record in $newRecords) {
        Assert-True (-not (Test-Path -LiteralPath $record.option_path)) `
            "$Scenario deve remover o option file"
        Assert-True (-not (Test-Path -LiteralPath $record.option_directory)) `
            "$Scenario deve remover o diretorio privado"
    }
}

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).ProviderPath
$backupScript = Join-Path $repositoryRoot "scripts\backup_mysql.ps1"
$restoreScript = Join-Path $repositoryRoot "scripts\restore_mysql.ps1"
$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ("cesta-backup-contract-" + [Guid]::NewGuid().ToString("N"))
$fakeHandler = Join-Path $temporaryRoot "fake-mysql-handler.ps1"
$fakeDumpCommand = Join-Path $temporaryRoot "fake-mysqldump.cmd"
$fakeMySqlCommand = Join-Path $temporaryRoot "fake-mysql.cmd"
$script:FakeRestoreState = Join-Path $temporaryRoot "mysql-restored.state"
$fakeDumpMarker = Join-Path $temporaryRoot "dump-completed.state"
$fakeCaptureFile = Join-Path $temporaryRoot "credential-captures.jsonl"
$temporaryLocationActive = $false

$managedEnvironmentVariables = @(
    "CESTA_DB_PASSWORD",
    "MYSQL_PWD",
    "FAKE_POWERSHELL_COMMAND",
    "FAKE_MYSQL_HANDLER",
    "FAKE_MYSQL_STATE",
    "FAKE_DUMP_MARKER",
    "FAKE_CAPTURE_FILE",
    "FAKE_DUMP_EXIT",
    "FAKE_DUMP_MODE",
    "FAKE_SOURCE_MUTATES",
    "FAKE_MYSQL_RESTORE_EXIT",
    "FAKE_RESTORE_VARIANT",
    "FAKE_TARGET_PRESET"
)
$originalEnvironment = @{}
foreach ($variableName in $managedEnvironmentVariables) {
    $originalEnvironment[$variableName] = [Environment]::GetEnvironmentVariable(
        $variableName,
        [EnvironmentVariableTarget]::Process
    )
}

try {
    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null

    @'
param(
    [Parameter(Position = 0, Mandatory = $true)]
    [string]$Mode,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ClientArguments
)
$ErrorActionPreference = "Stop"

if ($ClientArguments.Count -eq 1 -and $ClientArguments[0] -eq "--version") {
    Write-Output "fake-$Mode 8.4.0 contract"
    exit 0
}

if ($ClientArguments.Count -eq 0 -or -not $ClientArguments[0].StartsWith("--defaults-extra-file=")) {
    exit 31
}
$credentialArgumentPrefix = "--defaults-extra-file="
$optionPath = $ClientArguments[0].Substring($credentialArgumentPrefix.Length).Trim('"')
$ClientArguments[0] = "$credentialArgumentPrefix$optionPath"
if (-not (Test-Path -LiteralPath $optionPath -PathType Leaf)) {
    $parentPath = Split-Path -Parent $optionPath
    $parentExists = Test-Path -LiteralPath $parentPath -PathType Container -ErrorAction SilentlyContinue
    Write-Error "Option file do contrato nao esta acessivel; parent_exists=$parentExists; path_length=$($optionPath.Length)." -ErrorAction Continue
    exit 32
}
$optionDirectory = [IO.Directory]::GetParent([IO.Path]::GetFullPath($optionPath)).FullName
if (-not (Test-Path -LiteralPath $optionDirectory -PathType Container)) { exit 33 }

function Convert-AclRules {
    param([Parameter(Mandatory = $true)]$Acl)
    return @($Acl.Access | ForEach-Object {
        [ordered]@{
            sid = $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
            inherited = $_.IsInherited
            type = "$($_.AccessControlType)"
            rights = "$($_.FileSystemRights)"
            inheritance = "$($_.InheritanceFlags)"
        }
    })
}

$capture = [ordered]@{
    first_argument = $ClientArguments[0]
    option_path = $optionPath
    option_directory = $optionDirectory
    directory_entries = @(Get-ChildItem -LiteralPath $optionDirectory -Force | ForEach-Object { $_.Name })
    option_content = [IO.File]::ReadAllText($optionPath)
    current_sid = $null
    directory_owner_sid = $null
    directory_acl_protected = $null
    directory_acl_rules = @()
    file_owner_sid = $null
    file_acl_protected = $null
    file_acl_rules = @()
    directory_unix_mode = $null
    file_unix_mode = $null
}
if ($env:OS -eq "Windows_NT") {
    $capture.current_sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $directoryAcl = Get-Acl -LiteralPath $optionDirectory
    $capture.directory_owner_sid = $directoryAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value
    $capture.directory_acl_protected = $directoryAcl.AreAccessRulesProtected
    $capture.directory_acl_rules = @(Convert-AclRules -Acl $directoryAcl)
    $fileAcl = Get-Acl -LiteralPath $optionPath
    $capture.file_owner_sid = $fileAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value
    $capture.file_acl_protected = $fileAcl.AreAccessRulesProtected
    $capture.file_acl_rules = @(Convert-AclRules -Acl $fileAcl)
}
else {
    $capture.directory_unix_mode = [int][IO.File]::GetUnixFileMode($optionDirectory)
    $capture.file_unix_mode = [int][IO.File]::GetUnixFileMode($optionPath)
}
$capture | ConvertTo-Json -Depth 8 -Compress | Add-Content -LiteralPath $env:FAKE_CAPTURE_FILE -Encoding UTF8

$database = ($ClientArguments | Where-Object { $_ -like "--database=*" } | Select-Object -Last 1)
if ($database) { $database = $database.Substring("--database=".Length) }
$execute = $null
for ($argumentIndex = 0; $argumentIndex -lt $ClientArguments.Count; $argumentIndex++) {
    if ($ClientArguments[$argumentIndex] -like "--execute=*") {
        $executeParts = @($ClientArguments[$argumentIndex..($ClientArguments.Count - 1)])
        $executeParts[0] = $executeParts[0].Substring("--execute=".Length)
        $execute = ($executeParts -join " ")
        break
    }
}

function Get-Inventory {
    param([string]$DatabaseName)
    $restored = Test-Path -LiteralPath $env:FAKE_MYSQL_STATE
    $isSource = $DatabaseName -eq "cesta_source"
    $tables = @()
    $views = @()
    $routines = @()
    $events = @()
    $triggers = @()
    $revisions = @()

    if ($isSource -or $restored) {
        $tables = @("alembic_version", "items")
        $views = @("active_items")
        $routines = @("PROCEDURE`trefresh_summary")
        $events = @("purge_expired_reservations")
        $triggers = @("items_before_insert`tINSERT`titems`tBEFORE")
        $revisions = @("head_revision")
    }
    elseif ($env:FAKE_TARGET_PRESET -eq "event") {
        $events = @("unexpected_event")
    }

    if ($isSource -and $env:FAKE_SOURCE_MUTATES -eq "1" -and (Test-Path -LiteralPath $env:FAKE_DUMP_MARKER)) {
        $tables += "mutated_table"
    }
    if ($restored) {
        if ($env:FAKE_RESTORE_VARIANT -eq "inventory-mismatch") { $routines = @() }
        if ($env:FAKE_RESTORE_VARIANT -eq "revision-mismatch") { $revisions = @("different_revision") }
    }
    return [pscustomobject]@{
        Tables = $tables
        Views = $views
        Routines = $routines
        Events = $events
        Triggers = $triggers
        Revisions = $revisions
    }
}

if ($Mode -eq "dump") {
    $resultArgument = $ClientArguments | Where-Object { $_ -like "--result-file=*" } | Select-Object -Last 1
    if (-not $resultArgument) { exit 11 }
    $resultFile = $resultArgument.Substring("--result-file=".Length)
    $dumpExit = if ([string]::IsNullOrWhiteSpace($env:FAKE_DUMP_EXIT)) { 0 } else { [int]$env:FAKE_DUMP_EXIT }
    if ($dumpExit -ne 0) { exit $dumpExit }
    if ($env:FAKE_DUMP_MODE -eq "empty") {
        [IO.File]::WriteAllBytes($resultFile, [byte[]]@())
    }
    else {
        [IO.File]::WriteAllText(
            $resultFile,
            "-- contract dump`nCREATE TABLE alembic_version (version_num varchar(32));`nCREATE TABLE items (id int);`nCREATE VIEW active_items AS SELECT id FROM items;`nCREATE PROCEDURE refresh_summary() SELECT 1;`nCREATE EVENT purge_expired_reservations ON SCHEDULE EVERY 1 DAY DO SELECT 1;`nCREATE TRIGGER items_before_insert BEFORE INSERT ON items FOR EACH ROW SET NEW.id = NEW.id;`n",
            [Text.UTF8Encoding]::new($false)
        )
    }
    [IO.File]::WriteAllText($env:FAKE_DUMP_MARKER, "done")
    exit 0
}

if ($execute -and $execute.StartsWith("source ")) {
    $restoreExit = if ([string]::IsNullOrWhiteSpace($env:FAKE_MYSQL_RESTORE_EXIT)) { 0 } else { [int]$env:FAKE_MYSQL_RESTORE_EXIT }
    if ($restoreExit -ne 0) { exit $restoreExit }
    [IO.File]::WriteAllText($env:FAKE_MYSQL_STATE, "restored")
    exit 0
}

$inventory = Get-Inventory -DatabaseName $database
if ($execute -match "information_schema\.tables") {
    foreach ($table in $inventory.Tables) { Write-Output "BASE TABLE`t$table" }
    foreach ($view in $inventory.Views) { Write-Output "VIEW`t$view" }
    exit 0
}
if ($execute -match "information_schema\.routines") {
    $inventory.Routines | ForEach-Object { Write-Output $_ }
    exit 0
}
if ($execute -match "information_schema\.events") {
    $inventory.Events | ForEach-Object { Write-Output $_ }
    exit 0
}
if ($execute -match "information_schema\.triggers") {
    $inventory.Triggers | ForEach-Object { Write-Output $_ }
    exit 0
}
if ($execute -match "SELECT version_num FROM alembic_version") {
    $inventory.Revisions | ForEach-Object { Write-Output $_ }
    exit 0
}
exit 39
'@ | Set-Content -LiteralPath $fakeHandler -Encoding UTF8

    @'
@echo off
"%FAKE_POWERSHELL_COMMAND%" -NoProfile -ExecutionPolicy Bypass -File "%FAKE_MYSQL_HANDLER%" dump %*
exit /b %ERRORLEVEL%
'@ | Set-Content -LiteralPath $fakeDumpCommand -Encoding Ascii
    @'
@echo off
"%FAKE_POWERSHELL_COMMAND%" -NoProfile -ExecutionPolicy Bypass -File "%FAKE_MYSQL_HANDLER%" mysql %*
exit /b %ERRORLEVEL%
'@ | Set-Content -LiteralPath $fakeMySqlCommand -Encoding Ascii

    Push-Location -LiteralPath $temporaryRoot
    $temporaryLocationActive = $true

    $env:CESTA_DB_PASSWORD = 'contract\password"quote'
    $env:MYSQL_PWD = "sentinel-must-remain"
    $env:FAKE_POWERSHELL_COMMAND = (Get-Process -Id $PID).Path
    $env:FAKE_MYSQL_HANDLER = $fakeHandler
    $env:FAKE_MYSQL_STATE = $script:FakeRestoreState
    $env:FAKE_DUMP_MARKER = $fakeDumpMarker
    $env:FAKE_CAPTURE_FILE = $fakeCaptureFile
    $env:FAKE_DUMP_EXIT = "0"
    $env:FAKE_DUMP_MODE = "valid"
    $env:FAKE_SOURCE_MUTATES = "0"
    Reset-FakeTarget

    $validOutputDir = Join-Path $temporaryRoot "valid"
    Remove-Item -LiteralPath $fakeDumpMarker -Force -ErrorAction SilentlyContinue
    $captureStart = Get-CredentialCaptureCount -CaptureFile $fakeCaptureFile
    $backupResult = & $backupScript `
        -Database "cesta_source" `
        -User "contract_user" `
        -OutputDir $validOutputDir `
        -SslMode DISABLED `
        -MySqlCommand $fakeMySqlCommand `
        -MySqlDumpCommand $fakeDumpCommand
    Assert-NewCredentialArtifactsRemoved -CaptureFile $fakeCaptureFile -SinceCount $captureStart -Scenario "backup com sucesso"

    Assert-True (Test-Path -LiteralPath $backupResult.BackupFile -PathType Leaf) "backup SQL deve existir"
    Assert-True ((Get-Item -LiteralPath $backupResult.BackupFile).Length -gt 0) "backup SQL deve ser nao vazio"
    Assert-True ($backupResult.ExitCode -eq 0) "backup deve registrar exit code zero"
    Assert-True ($env:MYSQL_PWD -eq "sentinel-must-remain") "backup nao deve alterar MYSQL_PWD"
    Assert-True ($env:CESTA_DB_PASSWORD -ceq 'contract\password"quote') "backup nao deve alterar a variavel de senha"

    $manifest = Get-Content -LiteralPath $backupResult.ManifestFile -Raw | ConvertFrom-Json
    Assert-True ($manifest.schema_version -eq 2) "manifesto deve usar schema v2"
    Assert-True ($manifest.source_database -eq "cesta_source") "manifesto deve registrar banco de origem"
    Assert-True (@($manifest.source_inventory.tables).Count -eq 2) "manifesto deve registrar tabelas"
    Assert-True (@($manifest.source_inventory.views).Count -eq 1) "manifesto deve registrar views"
    Assert-True (@($manifest.source_inventory.routines).Count -eq 1) "manifesto deve registrar rotinas"
    Assert-True (@($manifest.source_inventory.events).Count -eq 1) "manifesto deve registrar eventos"
    Assert-True (@($manifest.source_inventory.triggers).Count -eq 1) "manifesto deve registrar triggers"
    Assert-True ($manifest.source_inventory.alembic_revisions[0] -eq "head_revision") "manifesto deve registrar revisao Alembic"
    Assert-True ($manifest.binaries.mysql.version -match "8\.4\.0") "manifesto deve registrar versao do mysql"
    Assert-True (-not [string]::IsNullOrWhiteSpace("$($manifest.binaries.mysqldump.path)")) "manifesto deve registrar caminho do mysqldump"
    $checksumLines = @(Get-Content -LiteralPath $backupResult.ChecksumFile)
    Assert-True ($checksumLines.Count -eq 2) "checksum deve cobrir dump e manifesto"
    Assert-True (($checksumLines -join "`n") -match [regex]::Escape([IO.Path]::GetFileName($backupResult.BackupFile))) "checksum deve nomear dump"
    Assert-True (($checksumLines -join "`n") -match [regex]::Escape([IO.Path]::GetFileName($backupResult.ManifestFile))) "checksum deve nomear manifesto"

    $failedOutputDir = Join-Path $temporaryRoot "failed"
    $env:FAKE_DUMP_EXIT = "7"
    Remove-Item -LiteralPath $fakeDumpMarker -Force -ErrorAction SilentlyContinue
    $captureStart = Get-CredentialCaptureCount -CaptureFile $fakeCaptureFile
    Assert-ThrowsLike -Pattern "*exit code 7*" -Action {
        & $backupScript -Database "cesta_failed" -User "contract_user" -OutputDir $failedOutputDir `
            -SslMode DISABLED -MySqlCommand $fakeMySqlCommand -MySqlDumpCommand $fakeDumpCommand | Out-Null
    }
    Assert-True (@(Get-ChildItem -LiteralPath $failedOutputDir -File).Count -eq 0) "falha nativa nao deve deixar artefato"
    Assert-NewCredentialArtifactsRemoved -CaptureFile $fakeCaptureFile -SinceCount $captureStart -Scenario "backup com falha nativa"

    $emptyOutputDir = Join-Path $temporaryRoot "empty"
    $env:FAKE_DUMP_EXIT = "0"
    $env:FAKE_DUMP_MODE = "empty"
    Remove-Item -LiteralPath $fakeDumpMarker -Force -ErrorAction SilentlyContinue
    Assert-ThrowsLike -Pattern "*backup vazio*" -Action {
        & $backupScript -Database "cesta_empty" -User "contract_user" -OutputDir $emptyOutputDir `
            -SslMode DISABLED -MySqlCommand $fakeMySqlCommand -MySqlDumpCommand $fakeDumpCommand | Out-Null
    }
    Assert-True (@(Get-ChildItem -LiteralPath $emptyOutputDir -File).Count -eq 0) "backup vazio nao deve deixar artefato"

    $mutatedOutputDir = Join-Path $temporaryRoot "mutated"
    $env:FAKE_DUMP_MODE = "valid"
    $env:FAKE_SOURCE_MUTATES = "1"
    Remove-Item -LiteralPath $fakeDumpMarker -Force -ErrorAction SilentlyContinue
    Assert-ThrowsLike -Pattern "*inventario do banco de origem mudou*" -Action {
        & $backupScript -Database "cesta_source" -User "contract_user" -OutputDir $mutatedOutputDir `
            -SslMode DISABLED -MySqlCommand $fakeMySqlCommand -MySqlDumpCommand $fakeDumpCommand | Out-Null
    }
    Assert-True (@(Get-ChildItem -LiteralPath $mutatedOutputDir -File).Count -eq 0) "origem instavel deve invalidar todos os artefatos"
    $env:FAKE_SOURCE_MUTATES = "0"

    $evidenceDir = Join-Path $temporaryRoot "evidence"
    Reset-FakeTarget
    $env:FAKE_MYSQL_RESTORE_EXIT = "6"
    $captureStart = Get-CredentialCaptureCount -CaptureFile $fakeCaptureFile
    Assert-ThrowsLike -Pattern "*exit code 6*" -Action {
        & $restoreScript -InputFile $backupResult.BackupFile -TargetDatabase "cesta_native_failure" `
            -User "contract_user" -EvidenceDir $evidenceDir -SslMode DISABLED -MySqlCommand $fakeMySqlCommand | Out-Null
    }
    Assert-True (-not (Test-Path -LiteralPath $script:FakeRestoreState)) "falha nativa nao deve marcar restore"
    Assert-NewCredentialArtifactsRemoved -CaptureFile $fakeCaptureFile -SinceCount $captureStart -Scenario "restore com falha nativa"
    Assert-True ($env:MYSQL_PWD -eq "sentinel-must-remain") "restore nao deve alterar MYSQL_PWD"

    Reset-FakeTarget
    $captureStart = Get-CredentialCaptureCount -CaptureFile $fakeCaptureFile
    $restoreResult = & $restoreScript -InputFile $backupResult.BackupFile -TargetDatabase "cesta_restore_drill" `
        -User "contract_user" -EvidenceDir $evidenceDir -SslMode DISABLED -MySqlCommand $fakeMySqlCommand
    Assert-NewCredentialArtifactsRemoved -CaptureFile $fakeCaptureFile -SinceCount $captureStart -Scenario "restore com sucesso"
    Assert-True ($restoreResult.ExitCode -eq 0) "restore deve registrar exit code zero"
    Assert-True ($restoreResult.ObjectsBefore -eq 0) "destino deve iniciar sem qualquer tipo de objeto"
    Assert-True ($restoreResult.TablesAfter -eq 2) "restore deve validar tabelas"
    $evidence = Get-Content -LiteralPath $restoreResult.EvidenceFile -Raw | ConvertFrom-Json
    Assert-True ($evidence.verification_mode -eq "exact-manifest-v2") "restore v2 deve usar igualdade exata"
    Assert-True ($evidence.inventory_after.routines[0].name -eq "refresh_summary") "destino deve conter rotina esperada"
    Assert-True ($evidence.inventory_after.events[0] -eq "purge_expired_reservations") "destino deve conter evento esperado"
    Assert-True ($evidence.inventory_after.alembic_revisions[0] -eq "head_revision") "destino deve manter revisao Alembic"
    Assert-True ($evidence.mysql_binary.version -match "8\.4\.0") "evidencia deve registrar versao do mysql"

    Reset-FakeTarget
    $env:FAKE_TARGET_PRESET = "event"
    Assert-ThrowsLike -Pattern "*banco-alvo possui*objeto*" -Action {
        & $restoreScript -InputFile $backupResult.BackupFile -TargetDatabase "cesta_nonempty_event" `
            -User "contract_user" -SslMode DISABLED -MySqlCommand $fakeMySqlCommand | Out-Null
    }

    Reset-FakeTarget
    Assert-ThrowsLike -Pattern "*banco de origem foi recusado*" -Action {
        & $restoreScript -InputFile $backupResult.BackupFile -TargetDatabase "cesta_source" `
            -User "contract_user" -SslMode DISABLED -MySqlCommand $fakeMySqlCommand | Out-Null
    }

    Reset-FakeTarget
    $env:FAKE_RESTORE_VARIANT = "inventory-mismatch"
    Assert-ThrowsLike -Pattern "*Inventario ou revisao Alembic*" -Action {
        & $restoreScript -InputFile $backupResult.BackupFile -TargetDatabase "cesta_inventory_diff" `
            -User "contract_user" -SslMode DISABLED -MySqlCommand $fakeMySqlCommand | Out-Null
    }

    Reset-FakeTarget
    $env:FAKE_RESTORE_VARIANT = "revision-mismatch"
    Assert-ThrowsLike -Pattern "*Inventario ou revisao Alembic*" -Action {
        & $restoreScript -InputFile $backupResult.BackupFile -TargetDatabase "cesta_revision_diff" `
            -User "contract_user" -SslMode DISABLED -MySqlCommand $fakeMySqlCommand | Out-Null
    }

    $dumpTamper = Copy-BackupSet -BackupResult $backupResult -Destination (Join-Path $temporaryRoot "dump-tamper")
    Add-Content -LiteralPath $dumpTamper.Dump -Value "-- tampered"
    Assert-ThrowsLike -Pattern "*Checksum SHA-256 divergente para dump*" -Action {
        & $restoreScript -InputFile $dumpTamper.Dump -TargetDatabase "cesta_dump_tamper" `
            -User "contract_user" -SslMode DISABLED -MySqlCommand $fakeMySqlCommand | Out-Null
    }

    $manifestTamper = Copy-BackupSet -BackupResult $backupResult -Destination (Join-Path $temporaryRoot "manifest-tamper")
    Add-Content -LiteralPath $manifestTamper.Manifest -Value " "
    Assert-ThrowsLike -Pattern "*Checksum SHA-256 divergente para manifesto*" -Action {
        & $restoreScript -InputFile $manifestTamper.Dump -TargetDatabase "cesta_manifest_tamper" `
            -User "contract_user" -SslMode DISABLED -MySqlCommand $fakeMySqlCommand | Out-Null
    }

    $legacyDir = Join-Path $temporaryRoot "legacy"
    New-Item -ItemType Directory -Path $legacyDir -Force | Out-Null
    $legacyDump = Join-Path $legacyDir "legacy.sql"
    Set-Content -LiteralPath $legacyDump -Value "CREATE TABLE alembic_version (version_num varchar(32));" -Encoding UTF8
    $legacyHash = (Get-FileHash -LiteralPath $legacyDump -Algorithm SHA256).Hash.ToUpperInvariant()
    "$legacyHash  $([IO.Path]::GetFileName($legacyDump))" | Set-Content -LiteralPath "$legacyDump.sha256" -Encoding Ascii

    Assert-ThrowsLike -Pattern "*Manifesto nao encontrado*" -Action {
        & $restoreScript -InputFile $legacyDump -TargetDatabase "legacy_source" -User "contract_user" `
            -AllowInPlaceRestore -SslMode DISABLED -MySqlCommand $fakeMySqlCommand | Out-Null
    }
    Assert-ThrowsLike -Pattern "*Backup legado exige -LegacySourceDatabase*" -Action {
        & $restoreScript -InputFile $legacyDump -TargetDatabase "legacy_target" -User "contract_user" `
            -AllowLegacyBackupWithoutManifest -SslMode DISABLED -MySqlCommand $fakeMySqlCommand | Out-Null
    }
    Assert-ThrowsLike -Pattern "*modo legado in-place exige*" -Action {
        & $restoreScript -InputFile $legacyDump -TargetDatabase "legacy_source" -LegacySourceDatabase "legacy_source" `
            -User "contract_user" -AllowLegacyBackupWithoutManifest -SslMode DISABLED -MySqlCommand $fakeMySqlCommand | Out-Null
    }
    Reset-FakeTarget
    $legacyResult = & $restoreScript -InputFile $legacyDump -TargetDatabase "legacy_source" `
        -LegacySourceDatabase "legacy_source" -User "contract_user" -AllowLegacyBackupWithoutManifest `
        -AllowInPlaceRestore -SslMode DISABLED -MySqlCommand $fakeMySqlCommand
    $legacyEvidence = Get-Content -LiteralPath $legacyResult.EvidenceFile -Raw | ConvertFrom-Json
    Assert-True ($legacyEvidence.verification_mode -eq "legacy-minimum-only") "bypass legado deve ficar explicito na evidencia"

    $expectedOptionContent = @'
[client]
password="contract\\password\"quote"
'@ + "`n"
    Assert-CredentialCaptures -CaptureFile $fakeCaptureFile -ExpectedOptionContent $expectedOptionContent
    Assert-True ($env:MYSQL_PWD -eq "sentinel-must-remain") "MYSQL_PWD deve permanecer intacta em todo o contrato"
    Assert-True ($env:CESTA_DB_PASSWORD -ceq 'contract\password"quote') "variavel de senha deve permanecer intacta"

    Write-Host "backup_restore_contract: PASS"
}
finally {
    foreach ($variableName in $managedEnvironmentVariables) {
        [Environment]::SetEnvironmentVariable(
            $variableName,
            $originalEnvironment[$variableName],
            [EnvironmentVariableTarget]::Process
        )
    }

    if ($temporaryLocationActive) {
        Pop-Location
        $temporaryLocationActive = $false
    }

    if (Test-Path -LiteralPath $temporaryRoot) {
        $resolvedTemporaryRoot = (Resolve-Path -LiteralPath $temporaryRoot).ProviderPath
        $systemTempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
        if (-not $resolvedTemporaryRoot.StartsWith($systemTempRoot, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Recusa de limpeza fora da pasta temporaria: $resolvedTemporaryRoot"
        }
        Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force
    }
}
