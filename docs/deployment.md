# Deployment Guide

This guide runs the Web API and the web portal locally and hosts both on **IIS** with **MongoDB**.

| Part | IIS site | Address |
|---|---|---|
| Web API | `SolarGridApi` | `http://localhost:8080` (Swagger at `/swagger`) |
| Web portal (Backoffice and Grid Operators) | `SolarGridWeb` | `http://localhost:8081` |

## 1. Prerequisites

| Software | Version used | Notes |
|---|---|---|
| Windows 10/11 or Windows Server with IIS | IIS 10 | Turn on *Internet Information Services* in "Windows Features" |
| .NET SDK | 10.0 | To build the API |
| ASP.NET Core **Hosting Bundle** | 10.0 | Install **after** IIS; it adds the ASP.NET Core Module to IIS |
| MongoDB Community Server | 8.x | Running as a Windows service on `localhost:27017` |
| MongoDB Compass | any | Optional, for viewing data |
| Node.js (with npm) | 24.19 (22 or newer works) | To build the web portal |
| IIS *Static Content* and *Default Document* | part of IIS | Installed with the standard IIS web server role |

Check the tools from a terminal:

```powershell
dotnet --list-sdks
Get-Service MongoDB, W3SVC
```

## 2. Run locally (development)

```powershell
cd api
dotnet run --project src/SolarGrid.Api
```

- Swagger opens at `http://localhost:5080/swagger`.
- On first start the API creates the indexes, the default admin and the demo data.
- Settings are in `api/src/SolarGrid.Api/appsettings.json`. The development-only token key is in `appsettings.Development.json`.

The web portal in development mode (with the API running on IIS or with `dotnet run`):

```powershell
cd web
npm install
npm run dev
```

- The portal opens at `http://localhost:5173`. It calls the API at `http://localhost:8080` unless
  `web/.env.local` sets another `VITE_API_URL` (use `http://localhost:5080` with `dotnet run`).
- Optional: `VITE_GOOGLE_MAPS_API_KEY` in `web/.env.local` shows Google Maps; without it the maps use OpenStreetMap.
  `.env.local` is ignored by Git.

## 3. Host the API on IIS (automatic)

Open **PowerShell as Administrator** in the repository folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\iis\deploy-api.ps1
```

The script (`deploy/iis/deploy-api.ps1`):

1. Publishes a Release build to `api/publish`.
2. Stops the site if it is already running.
3. Copies the files to `C:\inetpub\SolarGridApi`.
4. Creates `appsettings.Production.json` there with random keys for signing login tokens (`Jwt:Key`) and booking QR codes (`Qr:SigningKey`). The file is kept on later deployments, so existing QR codes stay valid, and it never goes into Git.
5. Creates the application pool **SolarGridApiPool** with *.NET CLR version = No Managed Code*.
6. Creates the website **SolarGridApi** on **port 8080**.
7. Turns **WebDAV** off for this site only, if WebDAV is installed. WebDAV answers PUT and DELETE with 405 before
   the API sees them. The change is written to `applicationHost.config`, because many IIS installs lock the
   `modules` section for `web.config` files.
8. Gives the application pool read access to the folder, and write access to `logs`.
9. Optional `-OpenFirewall`: opens TCP 8080 for devices on the same local network (needed for a real Android phone).

Then check the deployment:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\iis\smoke-test.ps1
```

All checks should print `PASS`. Swagger is available at `http://localhost:8080/swagger`.

## 4. Host the API on IIS (manual steps, for the report)

1. **IIS Manager → Application Pools → Add Application Pool**: name `SolarGridApiPool`, .NET CLR version **No Managed Code**.
2. Run `dotnet publish api/src/SolarGrid.Api -c Release -o C:\inetpub\SolarGridApi`.
3. **Sites → Add Website**: name `SolarGridApi`, physical path `C:\inetpub\SolarGridApi`, application pool `SolarGridApiPool`, port `8080`.
4. Create `C:\inetpub\SolarGridApi\appsettings.Production.json`:

   ```json
   {
     "Jwt": { "Key": "<a random string of at least 32 characters>" },
     "Qr": { "SigningKey": "<another random string of at least 32 characters>" }
   }
   ```

5. Give `IIS AppPool\SolarGridApiPool` *Read & execute* permission on the folder.
6. If WebDAV is installed: select the site, open **Modules**, remove **WebDAVModule**; open **Handler Mappings**,
   remove **WebDAV**. Or run as Administrator:

   ```powershell
   & "$env:windir\System32\inetsrv\appcmd.exe" set config SolarGridApi "-section:system.webServer/modules" "/-[name='WebDAVModule']" "/commit:apphost"
   & "$env:windir\System32\inetsrv\appcmd.exe" set config SolarGridApi "-section:system.webServer/handlers" "/-[name='WebDAV']" "/commit:apphost"
   ```

7. Browse to `http://localhost:8080/api/health`.

## 5. Host the web portal on IIS (automatic)

The API must already be running on IIS (section 3). Open **PowerShell as Administrator** in the repository
folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\iis\deploy-web.ps1
```

The script (`deploy/iis/deploy-web.ps1`):

1. Installs the packages (`npm ci`) and builds the portal (`npm run build`) with `VITE_API_URL=http://localhost:8080`.
   Use `-ApiUrl http://<PC IP address>:8080` when other devices open the portal, and `-SkipInstall` to reuse
   `web/node_modules`. If `web/.env.local` has a Google Maps key, the build uses Google Maps; the script only says
   whether a key is there and never prints it.
2. Copies `web/dist` to `C:\inetpub\SolarGridWeb` (old files are removed).
3. Creates the application pool **SolarGridWebPool** with *.NET CLR version = No Managed Code* (the portal is only
   static files).
4. Creates the website **SolarGridWeb** on **port 8081** (it stops if another site already uses that port).
5. Adds the MIME types the portal needs (`.js`, `.css`, `.svg`, `.woff2`, `.json`) when IIS does not know them yet.
6. Sets the browser cache: pages are sent with `Cache-Control: no-cache`, so a new deployment shows at once; files in
   `/assets` have a content hash in their names and are cached for a year. Like the WebDAV fix of the API, these
   settings are written to `applicationHost.config`.
7. Gives `IIS AppPool\SolarGridWebPool` and `IUSR` read access to the folder.
8. Optional `-OpenFirewall`: opens TCP 8081 for devices on the same local network.

Then check it:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\iis\smoke-test-web.ps1
```

The smoke test opens the start page, downloads every script, style sheet and font, checks the cache headers and the
API address inside the scripts, and asks the API whether it accepts the portal (CORS). All checks should print `PASS`.

The portal uses hash addresses (`http://localhost:8081/#/stations`), so IIS always serves the same `index.html` and
no URL Rewrite module is needed.

## 6. Host the web portal on IIS (manual steps, for the report)

1. In `web`, run `npm ci` and `npm run build`. The files are in `web/dist`.
2. Copy the contents of `web/dist` to `C:\inetpub\SolarGridWeb`.
3. **Application Pools → Add Application Pool**: name `SolarGridWebPool`, .NET CLR version **No Managed Code**.
4. **Sites → Add Website**: name `SolarGridWeb`, physical path `C:\inetpub\SolarGridWeb`, application pool
   `SolarGridWebPool`, port `8081`.
5. Select the site, open **MIME Types**, and add `.woff2` → `font/woff2` if it is missing.
6. Select the site, open **HTTP Response Headers → Set Common Headers**, tick *Expire Web content* →
   *Immediately*. Then select the `assets` folder and set *Expire Web content* → *After* 365 days.
   The same with `appcmd` (as Administrator):

   ```powershell
   & "$env:windir\System32\inetsrv\appcmd.exe" set config SolarGridWeb "-section:system.webServer/staticContent" "/clientCache.cacheControlMode:DisableCache" "/commit:apphost"
   & "$env:windir\System32\inetsrv\appcmd.exe" set config "SolarGridWeb/assets" "-section:system.webServer/staticContent" "/clientCache.cacheControlMode:UseMaxAge" "/clientCache.cacheControlMaxAge:365.00:00:00" "/commit:apphost"
   ```

7. Browse to `http://localhost:8081` and log in with a staff account.

## 7. Reaching the API from the Android app

| Where the app runs | API address to use |
|---|---|
| Android emulator | `http://10.0.2.2:8080/` (the emulator's name for the PC) |
| Real phone on the same Wi-Fi | `http://<PC IP address>:8080/` — find the IP with `ipconfig`, and deploy with `-OpenFirewall` |

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| HTTP **500.19**, code `0x8007000d` | Hosting Bundle missing, or installed before IIS | Install or repair the .NET Hosting Bundle, then run `iisreset` |
| HTTP **500.19**, code `0x80070021` | `web.config` changes a section that IIS has locked (for example `<modules>`) | Keep such settings out of `web.config`; our script sets them for the site in `applicationHost.config` |
| HTTP **500.30** / app fails to start | Missing or short `Jwt:Key` / `Qr:SigningKey`, or a settings error | Check `appsettings.Production.json`; set `stdoutLogEnabled="true"` in `web.config` and read `logs\` |
| **405** on PUT/DELETE | WebDAV module handles the request | Re-run the deploy script (step 7) or remove WebDAV for the site as shown above; the smoke test checks this |
| `/api/health` returns **503** | MongoDB service stopped | `Start-Service MongoDB` |
| Phone cannot connect | Firewall or wrong address | Deploy with `-OpenFirewall`; use the PC's LAN IP, not `localhost` |
| Portal shows an old version | The browser kept the old `index.html` | Re-run `deploy-web.ps1` (it turns caching off for pages) and refresh once |
| Portal says "Cannot reach the server" | API stopped, wrong API address in the build, or CORS | Run `smoke-test-web.ps1`; rebuild with `-ApiUrl`; add the portal address to `Cors:AllowedOrigins` in the API settings |
| Fonts look plain, or **404** for `.woff2` | IIS does not know the `.woff2` type | Re-run `deploy-web.ps1` (step 5) or add the MIME type by hand |
| Maps show "Google Maps did not accept the API key" | The key does not allow this address | In Google Cloud, add `http://localhost:8081/*` to the key's website restrictions; OpenStreetMap is used meanwhile |

Sources: API-04 and API-11 in [sources/api-sources.md](../sources/api-sources.md); WEB-02 and WEB-18 in
[sources/web-sources.md](../sources/web-sources.md).
