<#
    File:    run-e2e.ps1
    Module:  Android tests
    Owner:   Ravindu
    Purpose: Runs the Android tests that talk to a real Web API. It starts the
             API on its own port with a throw-away MongoDB database and demo
             data, waits until it answers, runs the tests marked @LiveApi on
             the emulator, then stops the API and removes the database. The
             IIS demo data is never touched.
    Usage:   powershell -ExecutionPolicy Bypass -File android\scripts\run-e2e.ps1
             Add -KeepDatabase to look at the data after a failure.
    Source:  AND-15 (Espresso), WEB-13 (the same idea as the Playwright set-up).
#>
[CmdletBinding()]
param(
    [int]$ApiPort = 5090,
    [string]$MongoUrl = "mongodb://localhost:27017",
    [switch]$KeepDatabase
)

$ErrorActionPreference = "Stop"

$scriptFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidFolder = Split-Path -Parent $scriptFolder
$repoFolder = Split-Path -Parent $androidFolder

$databaseName = "SolarGridDb_AndroidE2E_$(Get-Date -Format yyyyMMddHHmmss)"
$apiUrl = "http://localhost:$ApiPort"
# The emulator reaches this computer on 10.0.2.2.
$apiUrlForEmulator = "http://10.0.2.2:$ApiPort/"

# Java comes with Android Studio; the team does not need a separate install.
if (-not $env:JAVA_HOME) {
    $studioJava = "C:\Program Files\Android\Android Studio\jbr"
    if (Test-Path $studioJava) {
        $env:JAVA_HOME = $studioJava
    }
}

# Waits until the API answers its health endpoint, or gives up.
function Wait-ForApi {
    param([string]$Url, [int]$Seconds = 180)

    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $answer = Invoke-RestMethod -Uri "$Url/api/health" -TimeoutSec 5
            if ($answer.status -eq "Healthy") {
                return $true
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    return $false
}

# Removes the throw-away database using the MongoDB driver of the web app.
function Remove-TestDatabase {
    param([string]$Name)

    $driver = Join-Path $repoFolder "web\node_modules\mongodb"
    if (-not (Test-Path $driver)) {
        Write-Warning "Cannot remove $Name automatically: run 'npm install' in web\ first."
        return
    }
    $driverPath = ($driver -replace "\\", "/")
    $code = "const { MongoClient } = require('$driverPath');" +
            "(async () => { const c = new MongoClient('$MongoUrl', { serverSelectionTimeoutMS: 5000 });" +
            "await c.connect(); await c.db('$Name').dropDatabase(); await c.close(); })();"
    & node -e $code
    Write-Host "Removed test database $Name"
}

Write-Host "Starting the API on $apiUrl with database $databaseName"

$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = $apiUrl
$env:MongoDb__DatabaseName = $databaseName
$env:App__SeedDemoData = "true"

$apiProject = Join-Path $repoFolder "api\src\SolarGrid.Api\SolarGrid.Api.csproj"
$apiLog = Join-Path $env:TEMP "solargrid-android-e2e-api.log"
$apiErrorLog = Join-Path $env:TEMP "solargrid-android-e2e-api-errors.log"

# The repository folder name has a space in it, and Start-Process does not put
# quotes around an argument by itself, so the path is quoted here.
$api = Start-Process -FilePath "dotnet" `
    -ArgumentList @("run", "--project", "`"$apiProject`"", "--no-launch-profile") `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $apiLog `
    -RedirectStandardError $apiErrorLog

$testsPassed = $false
try {
    if (-not (Wait-ForApi -Url $apiUrl)) {
        Write-Host "The last lines the API wrote:"
        Get-Content $apiLog -Tail 20 -ErrorAction SilentlyContinue
        Get-Content $apiErrorLog -Tail 20 -ErrorAction SilentlyContinue
        throw "The API did not answer on $apiUrl. Is MongoDB running?"
    }
    Write-Host "The API is ready. Running the live tests on the emulator."

    $gradle = Join-Path $androidFolder "gradlew.bat"
    & $gradle -p $androidFolder connectedDebugAndroidTest `
        "-Pandroid.testInstrumentationRunnerArguments.annotation=lk.sliit.solargrid.live.LiveApi" `
        "-Pandroid.testInstrumentationRunnerArguments.apiBaseUrl=$apiUrlForEmulator" `
        --console=plain
    $testsPassed = ($LASTEXITCODE -eq 0)
} finally {
    if ($api -and -not $api.HasExited) {
        # "dotnet run" starts the API as a second process, so the whole tree
        # is stopped; stopping only the first one leaves the API running.
        & taskkill /PID $api.Id /T /F | Out-Null
        Write-Host "Stopped the API"
    }
    if ($KeepDatabase) {
        Write-Host "Keeping test database $databaseName"
    } else {
        Remove-TestDatabase -Name $databaseName
    }
}

if (-not $testsPassed) {
    Write-Error "The live tests failed. The report is in android\app\build\reports\androidTests\connected\debug\index.html"
    exit 1
}

Write-Host "Live tests passed."
