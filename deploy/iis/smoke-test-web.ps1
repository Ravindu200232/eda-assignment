<#
  File:    smoke-test-web.ps1
  Module:  Deployment
  Owner:   Ravindu
  Purpose: Quick check that the web portal on IIS is served correctly (page, scripts, styles,
           fonts, cache headers) and that the API it uses is up and accepts the portal (CORS).
  Usage:   powershell -ExecutionPolicy Bypass -File deploy\iis\smoke-test-web.ps1
           powershell -ExecutionPolicy Bypass -File deploy\iis\smoke-test-web.ps1 -WebUrl http://192.168.1.20:8081 -ApiUrl http://192.168.1.20:8080
#>
param(
    [string]$WebUrl = "http://localhost:8081",
    [string]$ApiUrl = "http://localhost:8080"
)

$ErrorActionPreference = "Stop"
$script:failures = 0
$script:html = ""
$script:assets = @()
$script:css = ""

# Runs one check and prints PASS or FAIL with a short detail.
function Test-Step([string]$name, [scriptblock]$check) {
    try {
        $detail = & $check
        Write-Host ("PASS  {0,-30} {1}" -f $name, $detail) -ForegroundColor Green
    }
    catch {
        $script:failures++
        Write-Host ("FAIL  {0,-30} {1}" -f $name, $_.Exception.Message) -ForegroundColor Red
    }
}

# Downloads one file of the portal.
function Get-PortalFile([string]$path) {
    Invoke-WebRequest "$WebUrl$path" -UseBasicParsing -TimeoutSec 15
}

Write-Host "Testing $WebUrl (API $ApiUrl)`n"

Test-Step "Start page" {
    $page = Get-PortalFile "/"
    if ($page.Content -notmatch '<div id="root">') { throw "the page has no #root element" }
    $script:html = $page.Content
    "HTTP $($page.StatusCode), $($page.Content.Length) bytes"
}

Test-Step "Start page is not cached" {
    $cache = (Get-PortalFile "/").Headers["Cache-Control"]
    if ($cache -notmatch "no-cache") { throw "Cache-Control is '$cache'" }
    "Cache-Control: $cache"
}

Test-Step "Scripts and styles" {
    $script:assets = @([regex]::Matches($script:html, '(?:src|href)="(/assets/[^"]+\.(?:js|css))"') |
        ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
    if ($script:assets.Count -eq 0) { throw "the page links no /assets files" }

    foreach ($file in $script:assets) {
        $response = Get-PortalFile $file
        $type = $response.Headers["Content-Type"]
        if ($file.EndsWith(".js") -and $type -notmatch "javascript") { throw "$file is sent as '$type'" }
        if ($file.EndsWith(".css")) {
            if ($type -notmatch "text/css") { throw "$file is sent as '$type'" }
            $script:css += $response.Content
        }
    }
    "$($script:assets.Count) files"
}

Test-Step "Hashed files are cached" {
    $cache = (Get-PortalFile $script:assets[0]).Headers["Cache-Control"]
    if ($cache -notmatch "max-age=\d+") { throw "Cache-Control is '$cache'" }
    "Cache-Control: $cache"
}

Test-Step "Fonts" {
    $fonts = @([regex]::Matches($script:css, 'url\(\s*"?(/assets/[^")]+\.woff2)') |
        ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
    if ($fonts.Count -eq 0) { throw "the style sheet names no .woff2 fonts" }
    $type = (Get-PortalFile $fonts[0]).Headers["Content-Type"]
    if ($type -notmatch "woff2") { throw "$($fonts[0]) is sent as '$type'" }
    "$($fonts.Count) fonts, sent as $type"
}

Test-Step "Browser icon" {
    $type = (Get-PortalFile "/favicon.svg").Headers["Content-Type"]
    if ($type -notmatch "svg") { throw "favicon.svg is sent as '$type'" }
    $type
}

Test-Step "Portal calls this API" {
    $scripts = $script:assets | Where-Object { $_.EndsWith(".js") }
    $found = $scripts | Where-Object { (Get-PortalFile $_).Content.Contains($ApiUrl) } | Select-Object -First 1
    if (-not $found) { throw "no script contains $ApiUrl (deploy again with -ApiUrl $ApiUrl)" }
    "address found in $found"
}

Test-Step "API health" {
    $health = Invoke-RestMethod "$ApiUrl/api/health"
    if ($health.status -ne "Healthy") { throw "status is $($health.status)" }
    "database $($health.database)"
}

Test-Step "API accepts the portal (CORS)" {
    $origin = ([Uri]$WebUrl).GetLeftPart([UriPartial]::Authority)
    $response = Invoke-WebRequest "$ApiUrl/api/health" -UseBasicParsing -Headers @{ Origin = $origin }
    $allowed = $response.Headers["Access-Control-Allow-Origin"]
    if ($allowed -ne $origin) { throw "the API does not allow $origin; add it to Cors:AllowedOrigins" }
    "Access-Control-Allow-Origin: $allowed"
}

if ($script:failures -gt 0) {
    Write-Host "`n$($script:failures) check(s) failed." -ForegroundColor Red
    exit 1
}

Write-Host "`nAll checks passed." -ForegroundColor Green
