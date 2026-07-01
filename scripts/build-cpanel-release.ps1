$ErrorActionPreference = "Stop"

$RootDir = (Resolve-Path "$PSScriptRoot\..").Path
$DistDir = "$RootDir\dist"
$BuildDir = "$DistDir\cpanel-build"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ZipName = "opensid-cpanel-$Timestamp.zip"
$ZipPath = "$DistDir\$ZipName"

# Cleanup build dir if it exists
if (Test-Path $BuildDir) {
    Remove-Item -Recurse -Force $BuildDir
}

# Create dirs
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

Write-Host "Copying files to build directory..."

# Get all files except excluded ones
$ExcludeList = @(
    "\.git$",
    "\.git[/\\]",
    "\.github[/\\]",
    "\.idea[/\\]",
    "\.vscode[/\\]",
    "\.cache-rector[/\\]",
    "\.expo[/\\]",
    "\.env$",
    "\.env\..*$",
    "\.envrc$",
    "\.e2e\.env\.example$",
    "\.gitattributes$",
    "\.gitignore$",
    "\.dockerignore$",
    "\.prettierrc\.json$",
    "Dockerfile$",
    "docker[/\\]",
    "docker-compose\.yml$",
    "README-DEVELOPMENT\.md$",
    "scripts[/\\]",
    "mobile[/\\]",
    "node_modules[/\\]",
    "dist[/\\]",
    "backup_inkremental[/\\]",
    "tests[/\\]",
    "test-results[/\\]",
    "playwright\.config\.ts$",
    "phpunit\.xml$",
    "rector\.php$",
    "\.php-cs-fixer\.php$",
    "\.php-cs-fixer\.cache$",
    "\.phpunit\.result\.cache$",
    "\.log$",
    "\.sql$",
    "\.sql\.gz$"
)

# Function to copy files recursively with exclusions
function Copy-FilesWithExclusion($Source, $Destination, $ExcludeRegexes) {
    $AllFiles = Get-ChildItem -Path $Source -Recurse -File
    foreach ($File in $AllFiles) {
        $RelativePath = $File.FullName.Substring($Source.Length + 1)
        
        $IsExcluded = $false
        foreach ($Regex in $ExcludeRegexes) {
            # Special check to include opensid-dummy.sql
            if ($RelativePath -replace '\\', '/' -eq "database/dummy/opensid-dummy.sql") {
                continue
            }
            if ($RelativePath -replace '\\', '/' -eq "database/dummy/README.md") {
                continue
            }

            if ($RelativePath -match $Regex) {
                $IsExcluded = $true
                break
            }
        }

        if (-not $IsExcluded) {
            $TargetFile = Join-Path $Destination $RelativePath
            $TargetDir = Split-Path $TargetFile
            if (-not (Test-Path $TargetDir)) {
                New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
            }
            Copy-Item -Path $File.FullName -Destination $TargetFile -Force
        }
    }
}

Copy-FilesWithExclusion $RootDir $BuildDir $ExcludeList

# Copy htaccess as .htaccess
Copy-Item "$RootDir\htaccess.apache.txt" "$BuildDir\.htaccess" -Force
# Copy README-HOSTING-CPANEL.md
Copy-Item "$RootDir\README-HOSTING-CPANEL.md" "$BuildDir\README-HOSTING-CPANEL.md" -Force

# Remove database.php and create database.php.example
if (Test-Path "$BuildDir\desa\config\database.php") {
    Remove-Item -Force "$BuildDir\desa\config\database.php"
}

$DatabaseConfigExample = @"
<?php

// Salin file ini menjadi database.php, lalu sesuaikan koneksi database cPanel.

`$db['default']['hostname'] = 'localhost';
`$db['default']['username'] = 'cpaneluser_dbuser';
`$db['default']['password'] = 'password_database';
`$db['default']['database'] = 'cpaneluser_dbname';
`$db['default']['port']     = 3306;
`$db['default']['dbcollat'] = 'utf8mb4_general_ci';
`$db['default']['stricton'] = true;
"@

$DatabaseConfigExample | Out-File -FilePath "$BuildDir\desa\config\database.php.example" -Encoding utf8

# Create zip
Write-Host "Creating zip archive..."
if (Test-Path $ZipPath) {
    Remove-Item -Force $ZipPath
}

# Compress using PowerShell's built-in Compress-Archive
Compress-Archive -Path "$BuildDir\*" -DestinationPath $ZipPath -Force

# Cleanup build directory
Remove-Item -Recurse -Force $BuildDir

Write-Host "Release ZIP created successfully at:"
Write-Host $ZipPath
