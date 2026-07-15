[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9_$-]+$')]
    [string]$Database,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[^\r\n]+$')]
    [string]$User,

    [Security.SecureString]$Password,

    [ValidatePattern('^[A-Za-z_][A-Za-z0-9_]*$')]
    [string]$PasswordEnvironmentVariable = "CESTA_DB_PASSWORD",

    [Alias("Host")]
    [ValidatePattern('^[A-Za-z0-9.:-]+$')]
    [string]$Server = "127.0.0.1",

    [ValidateRange(1, 65535)]
    [int]$Port = 3306,

    [string]$OutputDir = "backups",

    [ValidateSet("DISABLED", "REQUIRED", "VERIFY_CA", "VERIFY_IDENTITY")]
    [string]$SslMode = "VERIFY_IDENTITY",

    [string]$SslCa,

    [string]$MySqlCommand = "mysql",

    [string]$MySqlDumpCommand = "mysqldump"
)

$ErrorActionPreference = "Stop"

function Get-PlainTextPassword {
    if ($Password) {
        $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
        try {
            return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
        }
    }

    $environmentPassword = [Environment]::GetEnvironmentVariable(
        $PasswordEnvironmentVariable,
        [EnvironmentVariableTarget]::Process
    )
    if ([string]::IsNullOrWhiteSpace($environmentPassword)) {
        throw "Informe -Password como SecureString ou defina a variavel de processo $PasswordEnvironmentVariable. Senha em texto na linha de comando nao e aceita."
    }

    return $environmentPassword
}

function ConvertTo-MySqlOptionValue {
    param([Parameter(Mandatory = $true)][string]$Value)

    if ($Value.Contains([char]0)) {
        throw "A senha contem caractere NUL, que nao e aceito pelo option file do MySQL."
    }

    return $Value.Replace('\', '\\').Replace('"', '\"').Replace("`r", '\r').Replace("`n", '\n').Replace("`t", '\t')
}

function Test-NormalizedPathEqual {
    param(
        [Parameter(Mandatory = $true)][string]$Left,
        [Parameter(Mandatory = $true)][string]$Right
    )

    $comparison = [StringComparison]::Ordinal
    if ($env:OS -eq "Windows_NT") {
        $comparison = [StringComparison]::OrdinalIgnoreCase
    }
    return [IO.Path]::GetFullPath($Left).Equals(
        [IO.Path]::GetFullPath($Right),
        $comparison
    )
}

function Set-AndAssertPrivateWindowsAcl {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][bool]$IsDirectory
    )

    $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $fullControl = [Security.AccessControl.FileSystemRights]::FullControl
    $allow = [Security.AccessControl.AccessControlType]::Allow
    $expectedInheritance = [Security.AccessControl.InheritanceFlags]::None

    if ($IsDirectory) {
        $security = [Security.AccessControl.DirectorySecurity]::new()
        $expectedInheritance = (
            [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
            [Security.AccessControl.InheritanceFlags]::ObjectInherit
        )
        $rule = [Security.AccessControl.FileSystemAccessRule]::new(
            $currentSid,
            $fullControl,
            $expectedInheritance,
            [Security.AccessControl.PropagationFlags]::None,
            $allow
        )
    }
    else {
        $security = [Security.AccessControl.FileSecurity]::new()
        $rule = [Security.AccessControl.FileSystemAccessRule]::new(
            $currentSid,
            $fullControl,
            $allow
        )
    }

    $security.SetOwner($currentSid)
    $security.SetAccessRuleProtection($true, $false)
    [void]$security.AddAccessRule($rule)
    Set-Acl -LiteralPath $Path -AclObject $security

    $effectiveAcl = Get-Acl -LiteralPath $Path
    $accessRules = @($effectiveAcl.Access)
    $ownerSid = $effectiveAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value
    $ruleSid = if ($accessRules.Count -eq 1) {
        $accessRules[0].IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
    }
    else {
        $null
    }
    $hasFullControl = if ($accessRules.Count -eq 1) {
        ($accessRules[0].FileSystemRights -band $fullControl) -eq $fullControl
    }
    else {
        $false
    }

    if (
        -not $effectiveAcl.AreAccessRulesProtected -or
        $ownerSid -ne $currentSid.Value -or
        $accessRules.Count -ne 1 -or
        $accessRules[0].IsInherited -or
        $accessRules[0].AccessControlType -ne $allow -or
        $ruleSid -ne $currentSid.Value -or
        -not $hasFullControl -or
        $accessRules[0].InheritanceFlags -ne $expectedInheritance
    ) {
        throw "Nao foi possivel restringir a ACL temporaria ao SID do usuario atual."
    }
}

function Remove-PrivateMySqlOptionContext {
    param([Parameter(Mandatory = $true)]$Context)

    $directoryPath = [IO.Path]::GetFullPath("$($Context.DirectoryPath)")
    $filePath = [IO.Path]::GetFullPath("$($Context.FilePath)")
    $trimCharacters = [char[]]"\/"
    $temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd($trimCharacters)
    $directoryParent = [IO.Directory]::GetParent($directoryPath).FullName.TrimEnd($trimCharacters)
    $directoryName = [IO.Path]::GetFileName($directoryPath)
    $expectedFilePath = Join-Path $directoryPath "client.cnf"

    if (
        -not (Test-NormalizedPathEqual -Left $temporaryRoot -Right $directoryParent) -or
        $directoryName -notmatch '^cesta-mysql-[a-f0-9]{32}$' -or
        -not (Test-NormalizedPathEqual -Left $filePath -Right $expectedFilePath)
    ) {
        throw "Recusa de limpeza fora do diretorio temporario privado esperado."
    }

    if (Test-Path -LiteralPath $filePath) {
        $fileItem = Get-Item -LiteralPath $filePath -Force
        if ($fileItem.PSIsContainer -or ($fileItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw "Recusa de limpeza de option file inesperado ou reparse point."
        }
        Remove-Item -LiteralPath $filePath -Force
    }

    if (Test-Path -LiteralPath $directoryPath) {
        $directoryItem = Get-Item -LiteralPath $directoryPath -Force
        if (-not $directoryItem.PSIsContainer -or ($directoryItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw "Recusa de limpeza de diretorio temporario inesperado ou reparse point."
        }
        if (@(Get-ChildItem -LiteralPath $directoryPath -Force).Count -ne 0) {
            throw "Recusa de limpeza: o diretorio temporario privado contem arquivo inesperado."
        }
        Remove-Item -LiteralPath $directoryPath -Force
    }
}

function New-PrivateMySqlOptionContext {
    param([Parameter(Mandatory = $true)][string]$PlainTextPassword)

    $directoryPath = Join-Path ([IO.Path]::GetTempPath()) ("cesta-mysql-" + [Guid]::NewGuid().ToString("N"))
    $optionPath = Join-Path $directoryPath "client.cnf"
    $context = [pscustomobject]@{
        DirectoryPath = $directoryPath
        FilePath = $optionPath
    }

    try {
        if (Test-Path -LiteralPath $directoryPath) {
            throw "Colisao no nome do diretorio temporario privado."
        }
        [void][IO.Directory]::CreateDirectory($directoryPath)
        $directoryItem = Get-Item -LiteralPath $directoryPath -Force
        if (-not $directoryItem.PSIsContainer -or ($directoryItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw "Diretorio temporario privado invalido."
        }

        if ($env:OS -eq "Windows_NT") {
            Set-AndAssertPrivateWindowsAcl -Path $directoryPath -IsDirectory $true
        }
        else {
            $directoryMode = (
                [IO.UnixFileMode]::UserRead -bor
                [IO.UnixFileMode]::UserWrite -bor
                [IO.UnixFileMode]::UserExecute
            )
            [IO.File]::SetUnixFileMode($directoryPath, $directoryMode)
            if ([IO.File]::GetUnixFileMode($directoryPath) -ne $directoryMode) {
                throw "Nao foi possivel aplicar modo 0700 ao diretorio temporario."
            }
        }

        if (@(Get-ChildItem -LiteralPath $directoryPath -Force).Count -ne 0) {
            throw "Diretorio temporario privado nao esta vazio antes da credencial."
        }

        $escapedPassword = ConvertTo-MySqlOptionValue -Value $PlainTextPassword
        $content = "[client]`npassword=`"$escapedPassword`"`n"
        [IO.File]::WriteAllText($optionPath, $content, [Text.UTF8Encoding]::new($false))

        $optionItem = Get-Item -LiteralPath $optionPath -Force
        if ($optionItem.PSIsContainer -or ($optionItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw "Option file temporario invalido."
        }
        if ($env:OS -eq "Windows_NT") {
            Set-AndAssertPrivateWindowsAcl -Path $optionPath -IsDirectory $false
        }
        else {
            $fileMode = [IO.UnixFileMode]::UserRead -bor [IO.UnixFileMode]::UserWrite
            [IO.File]::SetUnixFileMode($optionPath, $fileMode)
            if ([IO.File]::GetUnixFileMode($optionPath) -ne $fileMode) {
                throw "Nao foi possivel aplicar modo 0600 ao option file."
            }
        }

        return $context
    }
    catch {
        $originalError = $_
        try {
            Remove-PrivateMySqlOptionContext -Context $context
        }
        catch {
            throw "Falha ao criar e limpar a credencial temporaria privada: $($_.Exception.Message) Erro original: $($originalError.Exception.Message)"
        }
        throw $originalError
    }
}

function Resolve-TlsArguments {
    $arguments = @("--ssl-mode=$SslMode")
    if ($SslMode -in @("VERIFY_CA", "VERIFY_IDENTITY")) {
        if ([string]::IsNullOrWhiteSpace($SslCa)) {
            throw "-SslCa e obrigatorio quando -SslMode e $SslMode."
        }

        $resolvedCa = Resolve-Path -LiteralPath $SslCa -ErrorAction Stop
        if (-not (Test-Path -LiteralPath $resolvedCa.ProviderPath -PathType Leaf)) {
            throw "Arquivo CA nao encontrado: $SslCa"
        }
        $arguments += "--ssl-ca=$($resolvedCa.ProviderPath)"
    }

    return $arguments
}

function Resolve-CommandMetadata {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $resolved = Get-Command $Command -CommandType Application -ErrorAction Stop |
        Select-Object -First 1
    $versionOutput = @(& $resolved.Source --version 2>&1)
    $versionExitCode = $LASTEXITCODE
    if ($versionExitCode -ne 0) {
        throw "$Label --version falhou com exit code $versionExitCode."
    }
    $version = ($versionOutput -join " ").Trim()
    if ([string]::IsNullOrWhiteSpace($version)) {
        throw "$Label nao informou sua versao."
    }

    Write-Host "${Label}: $($resolved.Source)"
    Write-Host "$Label versao: $version"
    return [pscustomobject]@{
        Path = $resolved.Source
        Version = $version
    }
}

function Invoke-MySqlRows {
    param(
        [Parameter(Mandatory = $true)][string]$Query,
        [Parameter(Mandatory = $true)][string]$Operation
    )

    $arguments = @($script:CredentialArgument)
    $arguments += $script:BaseMySqlArguments
    $arguments += "--database=$Database"
    $arguments += @("--batch", "--raw", "--silent", "--skip-column-names")
    $arguments += "--execute=$Query"

    $output = @(& $script:MySqlMetadata.Path @arguments)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "$Operation falhou com exit code $exitCode."
    }
    return @($output | ForEach-Object { "$_" })
}

function Get-DatabaseInventory {
    $tableRows = @(Invoke-MySqlRows -Operation "Inventario de tabelas e views" -Query "SELECT CONCAT(TABLE_TYPE, CHAR(9), TABLE_NAME) FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_TYPE IN ('BASE TABLE', 'VIEW') ORDER BY TABLE_TYPE, TABLE_NAME;")
    $routineRows = @(Invoke-MySqlRows -Operation "Inventario de rotinas" -Query "SELECT CONCAT(ROUTINE_TYPE, CHAR(9), ROUTINE_NAME) FROM information_schema.routines WHERE routine_schema = DATABASE() ORDER BY ROUTINE_TYPE, ROUTINE_NAME;")
    $eventRows = @(Invoke-MySqlRows -Operation "Inventario de eventos" -Query "SELECT EVENT_NAME FROM information_schema.events WHERE event_schema = DATABASE() ORDER BY EVENT_NAME;")
    $triggerRows = @(Invoke-MySqlRows -Operation "Inventario de triggers" -Query "SELECT CONCAT(TRIGGER_NAME, CHAR(9), EVENT_MANIPULATION, CHAR(9), EVENT_OBJECT_TABLE, CHAR(9), ACTION_TIMING) FROM information_schema.triggers WHERE trigger_schema = DATABASE() ORDER BY TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING;")

    $tables = @()
    $views = @()
    foreach ($row in $tableRows) {
        $parts = $row.Split([char]9)
        if ($parts.Count -ne 2) {
            throw "Linha invalida no inventario de tabelas/views."
        }
        if ($parts[0] -eq "BASE TABLE") {
            $tables += $parts[1]
        }
        elseif ($parts[0] -eq "VIEW") {
            $views += $parts[1]
        }
        else {
            throw "Tipo inesperado no inventario: $($parts[0])"
        }
    }

    $routines = @()
    foreach ($row in $routineRows) {
        $parts = $row.Split([char]9)
        if ($parts.Count -ne 2) {
            throw "Linha invalida no inventario de rotinas."
        }
        $routines += [pscustomobject][ordered]@{ type = $parts[0]; name = $parts[1] }
    }

    $triggers = @()
    foreach ($row in $triggerRows) {
        $parts = $row.Split([char]9)
        if ($parts.Count -ne 4) {
            throw "Linha invalida no inventario de triggers."
        }
        $triggers += [pscustomobject][ordered]@{
            name = $parts[0]
            event = $parts[1]
            table = $parts[2]
            timing = $parts[3]
        }
    }

    $alembicRevisions = @()
    if ($tables -contains "alembic_version") {
        $alembicRevisions = @(Invoke-MySqlRows -Operation "Inventario Alembic" -Query "SELECT version_num FROM alembic_version ORDER BY version_num;")
    }

    return [pscustomobject][ordered]@{
        tables = @($tables | Sort-Object)
        views = @($views | Sort-Object)
        routines = @($routines | Sort-Object type, name)
        events = @($eventRows | Sort-Object)
        triggers = @($triggers | Sort-Object name, event, table, timing)
        alembic_revisions = @($alembicRevisions | Sort-Object)
    }
}

function ConvertTo-CanonicalInventoryJson {
    param([Parameter(Mandatory = $true)]$Inventory)

    return ([ordered]@{
        tables = @($Inventory.tables | Sort-Object)
        views = @($Inventory.views | Sort-Object)
        routines = @($Inventory.routines | Sort-Object type, name | ForEach-Object { [ordered]@{ type = $_.type; name = $_.name } })
        events = @($Inventory.events | Sort-Object)
        triggers = @($Inventory.triggers | Sort-Object name, event, table, timing | ForEach-Object { [ordered]@{ name = $_.name; event = $_.event; table = $_.table; timing = $_.timing } })
        alembic_revisions = @($Inventory.alembic_revisions | Sort-Object)
    } | ConvertTo-Json -Depth 8 -Compress)
}

$resolvedOutputDir = $null
$backupFile = $null
$checksumFile = $null
$manifestFile = $null
$optionContext = $null
$plainTextPassword = $null

try {
    if (-not (Test-Path -LiteralPath $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    if (-not (Test-Path -LiteralPath $OutputDir -PathType Container)) {
        throw "OutputDir deve apontar para uma pasta: $OutputDir"
    }

    $resolvedOutputDir = (Resolve-Path -LiteralPath $OutputDir -ErrorAction Stop).ProviderPath
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmssfff")
    $backupFile = Join-Path $resolvedOutputDir "$Database-$timestamp.sql"
    $checksumFile = "$backupFile.sha256"
    $manifestFile = "$backupFile.manifest.json"

    if (@($backupFile, $checksumFile, $manifestFile) | Where-Object { Test-Path -LiteralPath $_ }) {
        throw "Ja existe um artefato para o timestamp atual; tente novamente."
    }

    $script:MySqlMetadata = Resolve-CommandMetadata -Command $MySqlCommand -Label "mysql"
    $dumpMetadata = Resolve-CommandMetadata -Command $MySqlDumpCommand -Label "mysqldump"
    $tlsArguments = @(Resolve-TlsArguments)
    $plainTextPassword = Get-PlainTextPassword
    $optionContext = New-PrivateMySqlOptionContext -PlainTextPassword $plainTextPassword
    $script:CredentialArgument = "--defaults-extra-file=$($optionContext.FilePath)"
    $script:BaseMySqlArguments = @(
        "--host=$Server",
        "--port=$Port",
        "--user=$User",
        "--protocol=TCP",
        "--default-character-set=utf8mb4"
    )
    $script:BaseMySqlArguments += $tlsArguments

    $inventoryBefore = Get-DatabaseInventory
    $canonicalInventoryBefore = ConvertTo-CanonicalInventoryJson -Inventory $inventoryBefore

    $dumpArguments = @($script:CredentialArgument)
    $dumpArguments += @(
        "--host=$Server",
        "--port=$Port",
        "--user=$User",
        "--protocol=TCP",
        "--default-character-set=utf8mb4",
        "--single-transaction",
        "--quick",
        "--routines",
        "--triggers",
        "--events",
        "--hex-blob",
        "--set-gtid-purged=OFF",
        "--no-tablespaces"
    )
    $dumpArguments += $tlsArguments
    $dumpArguments += "--result-file=$backupFile"
    # Sem --databases: nao inclui CREATE DATABASE/USE e permite o drill isolado.
    $dumpArguments += $Database

    & $dumpMetadata.Path @dumpArguments
    $dumpExitCode = $LASTEXITCODE
    if ($dumpExitCode -ne 0) {
        throw "mysqldump falhou com exit code $dumpExitCode."
    }

    if (-not (Test-Path -LiteralPath $backupFile -PathType Leaf)) {
        throw "Arquivo de backup nao foi gerado."
    }
    $backupItem = Get-Item -LiteralPath $backupFile
    if ($backupItem.Length -le 0) {
        throw "Arquivo de backup vazio; o artefato foi rejeitado."
    }

    $inventoryAfter = Get-DatabaseInventory
    $canonicalInventoryAfter = ConvertTo-CanonicalInventoryJson -Inventory $inventoryAfter
    if ($canonicalInventoryBefore -cne $canonicalInventoryAfter) {
        throw "O inventario do banco de origem mudou durante o dump; artefato recusado."
    }

    $dumpHash = (Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash.ToUpperInvariant()
    $manifest = [ordered]@{
        schema_version = 2
        created_at_utc = (Get-Date).ToUniversalTime().ToString("o")
        source_database = $Database
        dump_format = "mysql-logical-sql"
        dump = [ordered]@{
            file_name = $backupItem.Name
            size_bytes = $backupItem.Length
            sha256 = $dumpHash
        }
        source_inventory = $inventoryBefore
        binaries = [ordered]@{
            mysql = [ordered]@{ path = $script:MySqlMetadata.Path; version = $script:MySqlMetadata.Version }
            mysqldump = [ordered]@{ path = $dumpMetadata.Path; version = $dumpMetadata.Version }
        }
        ssl_mode = $SslMode
    }
    $manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $manifestFile -Encoding UTF8
    $manifestItem = Get-Item -LiteralPath $manifestFile
    $manifestHash = (Get-FileHash -LiteralPath $manifestFile -Algorithm SHA256).Hash.ToUpperInvariant()
    @(
        "$dumpHash  $($backupItem.Name)",
        "$manifestHash  $($manifestItem.Name)"
    ) | Set-Content -LiteralPath $checksumFile -Encoding Ascii

    Write-Host "Backup verificado: $backupFile"
    Write-Host "Tamanho (bytes): $($backupItem.Length)"
    Write-Host "SHA-256 dump: $dumpHash"
    Write-Host "SHA-256 manifesto: $manifestHash"
    Write-Host "Manifesto: $manifestFile"

    [pscustomobject]@{
        BackupFile = $backupFile
        ChecksumFile = $checksumFile
        ManifestFile = $manifestFile
        SizeBytes = $backupItem.Length
        Sha256 = $dumpHash
        ManifestSha256 = $manifestHash
        ExitCode = 0
    }
}
catch {
    foreach ($artifact in @($backupFile, $checksumFile, $manifestFile)) {
        if ($artifact -and (Test-Path -LiteralPath $artifact -PathType Leaf)) {
            Remove-Item -LiteralPath $artifact -Force
        }
    }
    throw
}
finally {
    if ($optionContext) {
        Remove-PrivateMySqlOptionContext -Context $optionContext
    }
    $plainTextPassword = $null
    Remove-Variable -Scope Script -Name CredentialArgument -ErrorAction SilentlyContinue
    Remove-Variable -Scope Script -Name BaseMySqlArguments -ErrorAction SilentlyContinue
    Remove-Variable -Scope Script -Name MySqlMetadata -ErrorAction SilentlyContinue
}
