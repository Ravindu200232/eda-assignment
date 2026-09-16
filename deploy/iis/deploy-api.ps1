<#
  File:    deploy-api.ps1
  Module:  Deployment
  Owner:   Ravindu
  Purpose: Publishes the Web API and hosts it on IIS (site "SolarGridApi", port 8080).
  Usage:   Open PowerShell as Administrator in the repository folder and run
             powershell -ExecutionPolicy Bypass -File deploy\iis\deploy-api.ps1
           Add -OpenFirewall so phones on the same Wi-Fi can reach the API.
  Source:  API-04 (sources/api-sources.md)
#>
#Requires -RunAsAdministrator
param(
    [string]$SiteName = "SolarGridApi",
    [string]$AppPoolName = "SolarGridApiPool",
    [int]$Port = 8080,
    [string]$SitePath = "C:\inetpub\SolarGridApi",
    [switch]$OpenFirewall
)

$ErrorActionPreference = "Stop"
Import-Module WebAdministration

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$project = Join-Path $repoRoot "api\src\SolarGrid.Api\SolarGrid.Api.csproj"
$publishDir = Join-Path $repoRoot "api\publish"

# Prints a step heading so the output is easy to follow.
function Write-Step([string]$message) {
    Write-Host "`n==> $message" -ForegroundColor Cyan
}

# Returns a random 64-character secret for signing tokens.
function New-Secret {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

# Adds a secret to the settings object only if it is not there yet.
function Add-SecretIfMissing($settings, [string]$section, [string]$name) {
    if (-not $settings.PSObject.Properties[$section]) {
        $settings | Add-Member -NotePropertyName $section -NotePropertyValue ([pscustomobject]@{})
    }
    if (-not $settings.$section.PSObject.Properties[$name]) {
        $settings.$section | Add-Member -NotePropertyName $name -NotePropertyValue (New-Secret)
        Write-Host "   Created ${section}:${name}"
    }
}

Write-Step "1. Publishing the API (Release build)"
dotnet publish $project -c Release -o $publishDir
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed." }

Write-Step "2. Stopping the site so files can be replaced"
if ((Test-Path "IIS:\Sites\$SiteName") -and (Get-WebsiteState -Name $SiteName).Value -ne "Stopped") {
    Stop-Website -Name $SiteName
}
if ((Test-Path "IIS:\AppPools\$AppPoolName") -and (Get-WebAppPoolState -Name $AppPoolName).Value -ne "Stopped") {
    Stop-WebAppPool -Name $AppPoolName
    Start-Sleep -Seconds 3
}

Write-Step "3. Copying files to $SitePath"
New-Item -ItemType Directory -Force -Path $SitePath | Out-Null
robocopy $publishDir $SitePath /MIR /XF appsettings.Production.json /XD logs /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Copying files failed (robocopy exit code $LASTEXITCODE)." }
New-Item -ItemType Directory -Force -Path (Join-Path $SitePath "logs") | Out-Null

Write-Step "4. Checking production secrets (kept between deployments)"
$secretsFile = Join-Path $SitePath "appsettings.Production.json"
$secrets = if (Test-Path $secretsFile) { Get-Content $secretsFile -Raw | ConvertFrom-Json } else { [pscustomobject]@{} }
Add-SecretIfMissing $secrets "Jwt" "Key"
Add-SecretIfMissing $secrets "Qr" "SigningKey"
$secrets | ConvertTo-Json -Depth 5 | Set-Content -Path $secretsFile -Encoding UTF8

Write-Step "5. Preparing the application pool '$AppPoolName'"
if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
    New-WebAppPool -Name $AppPoolName | Out-Null
}
# ASP.NET Core runs its own runtime, so the pool uses "No Managed Code".
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name processModel.loadUserProfile -Value $true

Write-Step "6. Preparing the website '$SiteName' on port $Port"
if (-not (Test-Path "IIS:\Sites\$SiteName")) {
    New-Website -Name $SiteName -Port $Port -PhysicalPath $SitePath -ApplicationPool $AppPoolName | Out-Null
}
else {
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $SitePath
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $AppPoolName
}

Write-Step "7. Giving the application pool access to the files"
icacls $SitePath /grant "IIS AppPool\${AppPoolName}:(OI)(CI)RX" /T /Q | Out-Null
icacls (Join-Path $SitePath "logs") /grant "IIS AppPool\${AppPoolName}:(OI)(CI)M" /T /Q | Out-Null

if ($OpenFirewall) {
    Write-Step "8. Allowing devices on the local network to reach port $Port"
    $ruleName = "SolarGrid API (TCP $Port)"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port `
            -RemoteAddress LocalSubnet -Action Allow | Out-Null
    }
}

Write-Step "Starting the site"
if ((Get-WebAppPoolState -Name $AppPoolName).Value -ne "Started") { Start-WebAppPool -Name $AppPoolName }
if ((Get-WebsiteState -Name $SiteName).Value -ne "Started") { Start-Website -Name $SiteName }

Write-Host "`nDone. Swagger: http://localhost:$Port/swagger" -ForegroundColor Green
Write-Host "Check it with: powershell -ExecutionPolicy Bypass -File deploy\iis\smoke-test.ps1"
