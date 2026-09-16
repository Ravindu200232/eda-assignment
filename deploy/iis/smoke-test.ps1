<#
  File:    smoke-test.ps1
  Module:  Deployment
  Owner:   Ravindu
  Purpose: Quick check that the API on IIS is running, reaches MongoDB and accepts logins.
  Usage:   powershell -ExecutionPolicy Bypass -File deploy\iis\smoke-test.ps1
           powershell -ExecutionPolicy Bypass -File deploy\iis\smoke-test.ps1 -BaseUrl http://192.168.1.20:8080
#>
param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Username = "admin@solargrid.lk",
    [string]$Password = "Admin@123"
)

$ErrorActionPreference = "Stop"
$script:failures = 0
$script:headers = @{}

# Runs one check and prints PASS or FAIL with a short detail.
function Test-Step([string]$name, [scriptblock]$check) {
    try {
        $detail = & $check
        Write-Host ("PASS  {0,-28} {1}" -f $name, $detail) -ForegroundColor Green
    }
    catch {
        $script:failures++
        Write-Host ("FAIL  {0,-28} {1}" -f $name, $_.Exception.Message) -ForegroundColor Red
    }
}

Write-Host "Testing $BaseUrl`n"

Test-Step "Health" {
    $health = Invoke-RestMethod "$BaseUrl/api/health"
    if ($health.status -ne "Healthy") { throw "status is $($health.status)" }
    "database $($health.database)"
}

Test-Step "Admin login" {
    $body = @{ username = $Username; password = $Password } | ConvertTo-Json
    $login = Invoke-RestMethod "$BaseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    $script:headers = @{ Authorization = "Bearer $($login.token)" }
    "role $($login.user.role)"
}

Test-Step "Current user" {
    $me = Invoke-RestMethod "$BaseUrl/api/auth/me" -Headers $script:headers
    $me.email
}

Test-Step "Staff users" {
    $page = Invoke-RestMethod "$BaseUrl/api/users?pageSize=5" -Headers $script:headers
    "$($page.total) staff accounts"
}

# Added by Malith
Test-Step "Public summary" {
    $summary = Invoke-RestMethod "$BaseUrl/api/dashboard/public"
    "$($summary.activeStations) active stations, $($summary.totalEnergyTradedKwh) kWh traded"
}

Test-Step "Staff dashboard" {
    $summary = Invoke-RestMethod "$BaseUrl/api/dashboard/summary" -Headers $script:headers
    "$($summary.pendingReservations) pending, $($summary.pendingActivations) activations waiting"
}

Test-Step "Prosumer list" {
    $page = Invoke-RestMethod "$BaseUrl/api/prosumers?pageSize=5" -Headers $script:headers
    "$($page.total) prosumers"
}

# Added by Nimthara
Test-Step "Station list" {
    $stations = @(Invoke-RestMethod "$BaseUrl/api/stations" -Headers $script:headers)
    if ($stations.Count -gt 0) { $script:firstStationId = $stations[0].id }
    "$($stations.Count) stations"
}

Test-Step "Nearby stations (Malabe)" {
    $nearby = @(Invoke-RestMethod "$BaseUrl/api/stations/nearby?lat=6.9147&lng=79.9729&radiusKm=50" -Headers $script:headers)
    "$($nearby.Count) within 50 km"
}

Test-Step "Station slots" {
    if (-not $script:firstStationId) { throw "no station to check" }
    $slots = @(Invoke-RestMethod "$BaseUrl/api/stations/$($script:firstStationId)/slots" -Headers $script:headers)
    "$($slots.Count) slots in the next 7 days"
}

# Added by Hamnad
Test-Step "Pending reservations" {
    $page = Invoke-RestMethod "$BaseUrl/api/reservations?scope=pending&pageSize=5" -Headers $script:headers
    "$($page.total) waiting for approval"
}

Test-Step "Reservation history" {
    $page = Invoke-RestMethod "$BaseUrl/api/reservations?scope=history&pageSize=5" -Headers $script:headers
    "$($page.total) finished bookings"
}

if ($script:failures -gt 0) {
    Write-Host "`n$($script:failures) check(s) failed." -ForegroundColor Red
    exit 1
}

Write-Host "`nAll checks passed." -ForegroundColor Green
