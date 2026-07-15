[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputFile,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9_$-]+$')]
    [string]$TargetDatabase,

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

    [string]$ChecksumFile,

    [string]$ManifestFile,

    [string]$EvidenceDir,

    [ValidateSet("DISABLED", "REQUIRED", "VERIFY_CA", "VERIFY_IDENTITY")]
    [string]$SslMode = "VERIFY_IDENTITY",

    [string]$SslCa,

    [ValidateRange(1, 100000)]
    [int]$MinimumTableCount = 1,

    [string[]]$RequiredTables = @("alembic_version"),

    [switch]$AllowNonEmptyTarget,

    [switch]$AllowInPlaceRestore,

    [switch]$AllowLegacyBackupWithoutManifest,

    [ValidatePattern('^[A-Za-z0-9_$-]+$')]
    [string]$LegacySourceDatabase,

    [string]$MySqlCommand = "mysql"
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

function ConvertTo-NativeProcessArgument {
    param([AllowEmptyString()][string]$Value)

    if ($Value.Length -eq 0) { return '""' }
    if ($Value -notmatch '[\s"]') { return $Value }

    $builder = [Text.StringBuilder]::new()
    [void]$builder.Append('"')
    $backslashes = 0

    foreach ($character in $Value.ToCharArray()) {
        if ($character -eq '\') {
            $backslashes++
            continue
        }

        if ($character -eq '"') {
            [void]$builder.Append(('\' * (($backslashes * 2) + 1)))
            [void]$builder.Append('"')
            $backslashes = 0
            continue
        }

        if ($backslashes -gt 0) {
            [void]$builder.Append(('\' * $backslashes))
            $backslashes = 0
        }
        [void]$builder.Append($character)
    }

    if ($backslashes -gt 0) {
        [void]$builder.Append(('\' * ($backslashes * 2)))
    }
    [void]$builder.Append('"')
    return $builder.ToString()
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
    return [pscustomobject]@{ Path = $resolved.Source; Version = $version }
}

function Read-ChecksumEntries {
    param([Parameter(Mandatory = $true)][string]$Path)

    $entries = @{}
    $lines = @(Get-Content -LiteralPath $Path | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    foreach ($line in $lines) {
        $match = [regex]::Match($line, '^(?<hash>[A-Fa-f0-9]{64})[ \t]+\*?(?<file>[A-Za-z0-9._-]+)$')
        if (-not $match.Success) {
            throw "Formato de checksum invalido em $Path."
        }
        $fileName = $match.Groups["file"].Value
        if ($entries.ContainsKey($fileName)) {
            throw "Entrada duplicada no arquivo de checksum: $fileName"
        }
        $entries[$fileName] = $match.Groups["hash"].Value.ToUpperInvariant()
    }
    return $entries
}

function Assert-FileChecksum {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$ExpectedHash,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $actualHash = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($actualHash -cne $ExpectedHash) {
        throw "Checksum SHA-256 divergente para $Label; restore recusado."
    }
    return $actualHash
}

function Invoke-MySqlRows {
    param(
        [Parameter(Mandatory = $true)][string]$DatabaseName,
        [Parameter(Mandatory = $true)][string]$Query,
        [Parameter(Mandatory = $true)][string]$Operation
    )

    $arguments = @($script:CredentialArgument)
    $arguments += $script:BaseMySqlArguments
    $arguments += "--database=$DatabaseName"
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
    param([Parameter(Mandatory = $true)][string]$DatabaseName)

    $tableRows = @(Invoke-MySqlRows -DatabaseName $DatabaseName -Operation "Inventario de tabelas e views" -Query "SELECT CONCAT(TABLE_TYPE, CHAR(9), TABLE_NAME) FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_TYPE IN ('BASE TABLE', 'VIEW') ORDER BY TABLE_TYPE, TABLE_NAME;")
    $routineRows = @(Invoke-MySqlRows -DatabaseName $DatabaseName -Operation "Inventario de rotinas" -Query "SELECT CONCAT(ROUTINE_TYPE, CHAR(9), ROUTINE_NAME) FROM information_schema.routines WHERE routine_schema = DATABASE() ORDER BY ROUTINE_TYPE, ROUTINE_NAME;")
    $eventRows = @(Invoke-MySqlRows -DatabaseName $DatabaseName -Operation "Inventario de eventos" -Query "SELECT EVENT_NAME FROM information_schema.events WHERE event_schema = DATABASE() ORDER BY EVENT_NAME;")
    $triggerRows = @(Invoke-MySqlRows -DatabaseName $DatabaseName -Operation "Inventario de triggers" -Query "SELECT CONCAT(TRIGGER_NAME, CHAR(9), EVENT_MANIPULATION, CHAR(9), EVENT_OBJECT_TABLE, CHAR(9), ACTION_TIMING) FROM information_schema.triggers WHERE trigger_schema = DATABASE() ORDER BY TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING;")

    $tables = @()
    $views = @()
    foreach ($row in $tableRows) {
        $parts = $row.Split([char]9)
        if ($parts.Count -ne 2) { throw "Linha invalida no inventario de tabelas/views." }
        if ($parts[0] -eq "BASE TABLE") { $tables += $parts[1] }
        elseif ($parts[0] -eq "VIEW") { $views += $parts[1] }
        else { throw "Tipo inesperado no inventario: $($parts[0])" }
    }

    $routines = @()
    foreach ($row in $routineRows) {
        $parts = $row.Split([char]9)
        if ($parts.Count -ne 2) { throw "Linha invalida no inventario de rotinas." }
        $routines += [pscustomobject][ordered]@{ type = $parts[0]; name = $parts[1] }
    }

    $triggers = @()
    foreach ($row in $triggerRows) {
        $parts = $row.Split([char]9)
        if ($parts.Count -ne 4) { throw "Linha invalida no inventario de triggers." }
        $triggers += [pscustomobject][ordered]@{
            name = $parts[0]
            event = $parts[1]
            table = $parts[2]
            timing = $parts[3]
        }
    }

    $alembicRevisions = @()
    if ($tables -contains "alembic_version") {
        $alembicRevisions = @(Invoke-MySqlRows -DatabaseName $DatabaseName -Operation "Inventario Alembic" -Query "SELECT version_num FROM alembic_version ORDER BY version_num;")
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

function Assert-InventoryShape {
    param([Parameter(Mandatory = $true)]$Inventory)

    $requiredProperties = @("tables", "views", "routines", "events", "triggers", "alembic_revisions")
    foreach ($propertyName in $requiredProperties) {
        if ($Inventory.PSObject.Properties.Name -notcontains $propertyName) {
            throw "Manifesto sem o campo source_inventory.$propertyName."
        }
    }
    foreach ($routine in @($Inventory.routines)) {
        if ($routine.type -notin @("PROCEDURE", "FUNCTION") -or [string]::IsNullOrWhiteSpace("$($routine.name)")) {
            throw "Rotina invalida no inventario do manifesto."
        }
    }
    foreach ($trigger in @($Inventory.triggers)) {
        if (
            [string]::IsNullOrWhiteSpace("$($trigger.name)") -or
            [string]::IsNullOrWhiteSpace("$($trigger.event)") -or
            [string]::IsNullOrWhiteSpace("$($trigger.table)") -or
            [string]::IsNullOrWhiteSpace("$($trigger.timing)")
        ) {
            throw "Trigger invalida no inventario do manifesto."
        }
    }
}

function Get-InventoryObjectCount {
    param([Parameter(Mandatory = $true)]$Inventory)

    return @($Inventory.tables).Count +
        @($Inventory.views).Count +
        @($Inventory.routines).Count +
        @($Inventory.events).Count +
        @($Inventory.triggers).Count +
        @($Inventory.alembic_revisions).Count
}

$resolvedInputFile = $null
$resolvedChecksumFile = $null
$resolvedManifestFile = $null
$resolvedEvidenceDir = $null
$optionContext = $null
$plainTextPassword = $null
$sourceDatabase = $null
$manifest = $null
$expectedInventory = $null
$manifestHash = $null
$restoreStartedAt = (Get-Date).ToUniversalTime()

try {
    $resolvedInputFile = Resolve-Path -LiteralPath $InputFile -ErrorAction Stop
    if (-not (Test-Path -LiteralPath $resolvedInputFile.ProviderPath -PathType Leaf)) {
        throw "Arquivo de backup nao encontrado: $InputFile"
    }
    $inputItem = Get-Item -LiteralPath $resolvedInputFile.ProviderPath
    if ($inputItem.Length -le 0) { throw "Arquivo de backup vazio; restore recusado." }
    if ($inputItem.Name -notmatch '^[A-Za-z0-9._-]+\.sql$') {
        throw "O nome do dump deve usar apenas letras, numeros, ponto, sublinhado ou hifen e terminar em .sql."
    }

    if ([string]::IsNullOrWhiteSpace($ChecksumFile)) {
        $ChecksumFile = "$($resolvedInputFile.ProviderPath).sha256"
    }
    $resolvedChecksumFile = Resolve-Path -LiteralPath $ChecksumFile -ErrorAction Stop
    if (-not (Test-Path -LiteralPath $resolvedChecksumFile.ProviderPath -PathType Leaf)) {
        throw "Arquivo de checksum nao encontrado: $ChecksumFile"
    }
    if ([string]::IsNullOrWhiteSpace($ManifestFile)) {
        $ManifestFile = "$($resolvedInputFile.ProviderPath).manifest.json"
    }

    $checksumEntries = Read-ChecksumEntries -Path $resolvedChecksumFile.ProviderPath
    $manifestExists = Test-Path -LiteralPath $ManifestFile -PathType Leaf
    if ($manifestExists) {
        $resolvedManifestFile = Resolve-Path -LiteralPath $ManifestFile -ErrorAction Stop
        $manifestItem = Get-Item -LiteralPath $resolvedManifestFile.ProviderPath
        if (
            $checksumEntries.Count -ne 2 -or
            -not $checksumEntries.ContainsKey($inputItem.Name) -or
            -not $checksumEntries.ContainsKey($manifestItem.Name)
        ) {
            throw "O checksum de um backup v2 deve cobrir exatamente o dump e o manifesto."
        }
        $actualHash = Assert-FileChecksum -Path $inputItem.FullName -ExpectedHash $checksumEntries[$inputItem.Name] -Label "dump"
        $manifestHash = Assert-FileChecksum -Path $manifestItem.FullName -ExpectedHash $checksumEntries[$manifestItem.Name] -Label "manifesto"

        try {
            $manifest = Get-Content -LiteralPath $manifestItem.FullName -Raw | ConvertFrom-Json
        }
        catch {
            throw "Manifesto de backup invalido: $($_.Exception.Message)"
        }
        if ($manifest.schema_version -ne 2) {
            throw "Versao de manifesto nao suportada: $($manifest.schema_version)"
        }
        if ($manifest.dump.file_name -cne $inputItem.Name) { throw "O manifesto referencia outro arquivo de backup." }
        if ([int64]$manifest.dump.size_bytes -ne $inputItem.Length) { throw "O tamanho do arquivo diverge do manifesto." }
        if ("$($manifest.dump.sha256)".ToUpperInvariant() -cne $actualHash) { throw "O checksum do manifesto diverge do dump." }

        $sourceDatabase = "$($manifest.source_database)"
        if ($sourceDatabase -notmatch '^[A-Za-z0-9_$-]+$') { throw "Manifesto nao informa um banco de origem valido." }
        $expectedInventory = $manifest.source_inventory
        Assert-InventoryShape -Inventory $expectedInventory
        [void](ConvertTo-CanonicalInventoryJson -Inventory $expectedInventory)
    }
    else {
        if (-not $AllowLegacyBackupWithoutManifest) {
            throw "Manifesto nao encontrado. Use somente backups v2 ou assuma explicitamente o risco com -AllowLegacyBackupWithoutManifest."
        }
        if ([string]::IsNullOrWhiteSpace($LegacySourceDatabase)) {
            throw "Backup legado exige -LegacySourceDatabase explicito."
        }
        if ($checksumEntries.Count -ne 1 -or -not $checksumEntries.ContainsKey($inputItem.Name)) {
            throw "O checksum legado deve cobrir exatamente o dump."
        }
        $actualHash = Assert-FileChecksum -Path $inputItem.FullName -ExpectedHash $checksumEntries[$inputItem.Name] -Label "dump"
        $sourceDatabase = $LegacySourceDatabase
    }

    if (
        $sourceDatabase.Equals($TargetDatabase, [StringComparison]::OrdinalIgnoreCase) -and
        -not $AllowInPlaceRestore
    ) {
        throw "Restore no banco de origem foi recusado. O modo legado in-place exige -AllowLegacyBackupWithoutManifest e -AllowInPlaceRestore; backups v2 tambem exigem -AllowInPlaceRestore."
    }

    foreach ($requiredTable in $RequiredTables) {
        if ($requiredTable -notmatch '^[A-Za-z0-9_$-]+$') { throw "Nome de tabela obrigatoria invalido: $requiredTable" }
    }

    if ([string]::IsNullOrWhiteSpace($EvidenceDir)) { $EvidenceDir = $inputItem.DirectoryName }
    if (-not (Test-Path -LiteralPath $EvidenceDir)) {
        New-Item -ItemType Directory -Path $EvidenceDir -Force | Out-Null
    }
    if (-not (Test-Path -LiteralPath $EvidenceDir -PathType Container)) {
        throw "EvidenceDir deve apontar para uma pasta: $EvidenceDir"
    }
    $resolvedEvidenceDir = (Resolve-Path -LiteralPath $EvidenceDir -ErrorAction Stop).ProviderPath

    $script:MySqlMetadata = Resolve-CommandMetadata -Command $MySqlCommand -Label "mysql"
    $tlsArguments = @(Resolve-TlsArguments)
    $plainTextPassword = Get-PlainTextPassword
    $optionContext = New-PrivateMySqlOptionContext -PlainTextPassword $plainTextPassword
    $script:CredentialArgument = "--defaults-extra-file=$($optionContext.FilePath)"
    $script:BaseMySqlArguments = @(
        "--host=$Server",
        "--port=$Port",
        "--user=$User",
        "--protocol=TCP",
        "--default-character-set=utf8mb4",
        "--binary-mode=1",
        "--show-warnings"
    )
    $script:BaseMySqlArguments += $tlsArguments

    $inventoryBefore = Get-DatabaseInventory -DatabaseName $TargetDatabase
    $objectsBefore = Get-InventoryObjectCount -Inventory $inventoryBefore
    if ($objectsBefore -gt 0 -and -not $AllowNonEmptyTarget) {
        throw "O banco-alvo possui $objectsBefore objeto(s), considerando tabelas, views, rotinas, eventos, triggers e revisoes. Restore seguro exige banco vazio."
    }

    $restoreArguments = @($script:CredentialArgument)
    $restoreArguments += $script:BaseMySqlArguments
    $restoreArguments += "--database=$TargetDatabase"
    $nativeArguments = @(
        $restoreArguments | ForEach-Object {
            ConvertTo-NativeProcessArgument -Value $_
        }
    )
    $restoreProcess = Start-Process `
        -FilePath $script:MySqlMetadata.Path `
        -ArgumentList $nativeArguments `
        -RedirectStandardInput $inputItem.FullName `
        -NoNewWindow `
        -Wait `
        -PassThru
    $restoreExitCode = $restoreProcess.ExitCode
    if ($restoreExitCode -ne 0) { throw "mysql restore falhou com exit code $restoreExitCode." }

    $inventoryAfter = Get-DatabaseInventory -DatabaseName $TargetDatabase
    $afterTableCount = @($inventoryAfter.tables).Count
    if ($afterTableCount -lt $MinimumTableCount) {
        throw "Restore terminou sem a estrutura minima: $afterTableCount tabela(s), esperado ao menos $MinimumTableCount."
    }
    foreach ($requiredTable in $RequiredTables) {
        if (@($inventoryAfter.tables) -cnotcontains $requiredTable) {
            throw "Tabela obrigatoria ausente apos restore: $requiredTable"
        }
    }

    $verificationMode = "legacy-minimum-only"
    if ($expectedInventory) {
        $verificationMode = "exact-manifest-v2"
        $expectedCanonical = ConvertTo-CanonicalInventoryJson -Inventory $expectedInventory
        $actualCanonical = ConvertTo-CanonicalInventoryJson -Inventory $inventoryAfter
        if ($actualCanonical -cne $expectedCanonical) {
            throw "Inventario ou revisao Alembic do destino diverge do manifesto apos o restore."
        }
    }

    $completedAt = (Get-Date).ToUniversalTime()
    $evidenceName = "$($inputItem.BaseName)-restore-$($completedAt.ToString('yyyyMMdd-HHmmssfff')).json"
    $evidenceFile = Join-Path $resolvedEvidenceDir $evidenceName
    $evidence = [ordered]@{
        schema_version = 2
        result = "success"
        verification_mode = $verificationMode
        started_at_utc = $restoreStartedAt.ToString("o")
        completed_at_utc = $completedAt.ToString("o")
        source_database = $sourceDatabase
        target_database = $TargetDatabase
        backup_file = $inputItem.Name
        size_bytes = $inputItem.Length
        dump_sha256 = $actualHash
        manifest_sha256 = $manifestHash
        mysql_exit_code = $restoreExitCode
        inventory_before = $inventoryBefore
        inventory_after = $inventoryAfter
        expected_inventory = $expectedInventory
        required_tables_verified = @($RequiredTables)
        mysql_binary = [ordered]@{ path = $script:MySqlMetadata.Path; version = $script:MySqlMetadata.Version }
        ssl_mode = $SslMode
    }
    $evidence | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $evidenceFile -Encoding UTF8

    Write-Host "Restore verificado em banco isolado: $TargetDatabase"
    Write-Host "Objetos antes/depois: $objectsBefore/$(Get-InventoryObjectCount -Inventory $inventoryAfter)"
    Write-Host "SHA-256 do dump validado: $actualHash"
    Write-Host "Modo de verificacao: $verificationMode"
    Write-Host "Evidencia: $evidenceFile"

    [pscustomobject]@{
        TargetDatabase = $TargetDatabase
        BackupFile = $resolvedInputFile.ProviderPath
        EvidenceFile = $evidenceFile
        ObjectsBefore = $objectsBefore
        ObjectsAfter = Get-InventoryObjectCount -Inventory $inventoryAfter
        TablesBefore = @($inventoryBefore.tables).Count
        TablesAfter = $afterTableCount
        Sha256 = $actualHash
        ExitCode = 0
    }
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
