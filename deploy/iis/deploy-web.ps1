<#
  File:    deploy-web.ps1
  Module:  Deployment
  Owner:   Ravindu
  Purpose: Builds the React web portal and hosts it on IIS (site "SolarGridWeb", port 8081).
           The portal is only static files; the browser talks to the Web API on port 8080.
  Usage:   Open PowerShell as Administrator in the repository folder and run
             powershell -ExecutionPolicy Bypass -File deploy\iis\deploy-web.ps1
           -ApiUrl http://192.168.1.20:8080   when the browser must reach the API through another address
           -SkipInstall                         to reuse the packages already in web\node_modules
           -OpenFirewall                        so other devices on the same Wi-Fi can open the portal
  Source:  WEB-02 (Vite build), WEB-18 (IIS MIME types and client cache),
           API-04 and API-11 (IIS site set-up and appcmd, sources/api-sources.md)
#>
#Requires -RunAsAdministrator
param(
    [string]$SiteName = "SolarGridWeb",
    [string]$AppPoolName = "SolarGridWebPool",
    [int]$Port = 8081,
    [string]$SitePath = "C:\inetpub\SolarGridWeb",
    [string]$ApiUrl = "http://localhost:8080",
    [switch]$SkipInstall,
    [switch]$OpenFirewall
)

$ErrorActionPreference = "Stop"
Import-Module WebAdministration

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$webDir = Join-Path $repoRoot "web"
$distDir = Join-Path $webDir "dist"
$appcmd = Join-Path $env:windir "System32\inetsrv\appcmd.exe"

# File types in the portal. IIS only sends files whose extension has a MIME type.
$mimeTypes = [ordered]@{
    ".js"    = "text/javascript"
    ".css"   = "text/css"
    ".svg"   = "image/svg+xml"
    ".woff2" = "font/woff2"
    ".json"  = "application/json"
}

# Prints a step heading so the output is easy to follow.
function Write-Step([string]$message) {
    Write-Host "`n==> $message" -ForegroundColor Cyan
}

# Runs appcmd and stops the script if it fails.
function Invoke-AppCmd([string[]]$arguments) {
    & $appcmd @arguments | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "appcmd $($arguments -join ' ') failed (exit code $LASTEXITCODE)."
    }
}

# Adds a MIME type for this site unless IIS already knows the extension. Like the WebDAV fix
# of the API, the change is written to applicationHost.config.
# Source: WEB-18 (staticContent/mimeMap), API-11 ("/commit:apphost").
function Add-MimeTypeIfMissing([string]$extension, [string]$mimeType) {
    $effective = & $appcmd list config $SiteName "-section:system.webServer/staticContent" "/config:*" | Out-String
    if ($effective -match "fileExtension=""$([regex]::Escape($extension))""") {
        Write-Host "   $extension is already known."
        return
    }

    Invoke-AppCmd @("set", "config", $SiteName, "-section:system.webServer/staticContent",
        "/+[fileExtension='$extension',mimeType='$mimeType']", "/commit:apphost")
    Write-Host "   Added $extension ($mimeType)"
}

# Sets the browser cache header for one path of the site.
# Source: WEB-18 (staticContent/clientCache: DisableCache and UseMaxAge).
function Set-ClientCache([string]$path, [string]$mode, [string]$maxAge) {
    $arguments = @("set", "config", $path, "-section:system.webServer/staticContent", "/clientCache.cacheControlMode:$mode")
    if ($maxAge) {
        $arguments += "/clientCache.cacheControlMaxAge:$maxAge"
    }
    Invoke-AppCmd ($arguments + "/commit:apphost")
    Write-Host "   $path -> $mode $maxAge"
}

Write-Step "1. Building the web portal (API address: $ApiUrl)"
Push-Location $webDir
try {
    if (-not $SkipInstall) {
        npm ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
    }
    # Values already in the environment win over the .env files, so the build uses this address.
    $env:VITE_API_URL = $ApiUrl
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed." }
}
finally {
    Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
    Pop-Location
}
# The key itself is never printed; only whether web\.env.local has one.
$keyFile = Join-Path $webDir ".env.local"
$hasMapsKey = (Test-Path -LiteralPath $keyFile) -and
    (Select-String -LiteralPath $keyFile -Pattern '^\s*VITE_GOOGLE_MAPS_API_KEY\s*=\s*\S' -Quiet)
if ($hasMapsKey) {
    Write-Host "   Maps: Google Maps (key from web\.env.local; the key must allow http://localhost:$Port/*)"
}
else {
    Write-Host "   Maps: OpenStreetMap (no Google Maps key in web\.env.local)"
}

Write-Step "2. Copying the files to $SitePath"
New-Item -ItemType Directory -Force -Path $SitePath | Out-Null
robocopy $distDir $SitePath /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Copying files failed (robocopy exit code $LASTEXITCODE)." }

Write-Step "3. Preparing the application pool '$AppPoolName'"
if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
    New-WebAppPool -Name $AppPoolName | Out-Null
}
# Static files need no .NET code in the pool.
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ""

Write-Step "4. Preparing the website '$SiteName' on port $Port"
$otherSite = Get-WebBinding -Port $Port | Where-Object { $_.ItemXPath -notmatch "@name='$SiteName'" }
if ($otherSite) {
    throw "Port $Port is already used by another IIS site. Choose a free port with -Port."
}
if (-not (Test-Path "IIS:\Sites\$SiteName")) {
    New-Website -Name $SiteName -Port $Port -PhysicalPath $SitePath -ApplicationPool $AppPoolName | Out-Null
}
else {
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $SitePath
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $AppPoolName
}

Write-Step "5. Making sure IIS sends every file type of the portal"
foreach ($entry in $mimeTypes.GetEnumerator()) {
    Add-MimeTypeIfMissing $entry.Key $entry.Value
}

Write-Step "6. Browser cache: pages always fresh, hashed files kept for a year"
# index.html (and the site root) must never be cached, otherwise a new deployment would not show.
Set-ClientCache $SiteName "DisableCache" $null
# Files in /assets have a content hash in their name, so they can be cached for a long time.
Set-ClientCache "$SiteName/assets" "UseMaxAge" "365.00:00:00"

Write-Step "7. Giving IIS read access to the files"
icacls $SitePath /grant "IIS AppPool\${AppPoolName}:(OI)(CI)RX" /T /Q | Out-Null
icacls $SitePath /grant "IUSR:(OI)(CI)RX" /T /Q | Out-Null

if ($OpenFirewall) {
    Write-Step "8. Allowing devices on the local network to reach port $Port"
    $ruleName = "SolarGrid Web (TCP $Port)"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port `
            -RemoteAddress LocalSubnet -Action Allow | Out-Null
    }
    Write-Host "   Other devices also need their portal address in the API's Cors:AllowedOrigins setting."
}

Write-Step "Starting the site"
if ((Get-WebAppPoolState -Name $AppPoolName).Value -ne "Started") { Start-WebAppPool -Name $AppPoolName }
if ((Get-WebsiteState -Name $SiteName).Value -ne "Started") { Start-Website -Name $SiteName }

Write-Host "`nDone. Web portal: http://localhost:$Port" -ForegroundColor Green
Write-Host "The portal calls the API at $ApiUrl"
Write-Host "Check it with: powershell -ExecutionPolicy Bypass -File deploy\iis\smoke-test-web.ps1"
