# Deployment Guide

This guide runs the Web API locally and hosts it on **IIS** with **MongoDB**.

## 1. Prerequisites

| Software | Version used | Notes |
|---|---|---|
| Windows 10/11 or Windows Server with IIS | IIS 10 | Turn on *Internet Information Services* in "Windows Features" |
| .NET SDK | 10.0 | To build the API |
| ASP.NET Core **Hosting Bundle** | 10.0 | Install **after** IIS; it adds the ASP.NET Core Module to IIS |
| MongoDB Community Server | 8.x | Running as a Windows service on `localhost:27017` |
| MongoDB Compass | any | Optional, for viewing data |

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

## 3. Host on IIS (automatic)

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

## 4. Host on IIS (manual steps, for the report)

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

## 5. Reaching the API from the Android app

| Where the app runs | API address to use |
|---|---|
| Android emulator | `http://10.0.2.2:8080/` (the emulator's name for the PC) |
| Real phone on the same Wi-Fi | `http://<PC IP address>:8080/` — find the IP with `ipconfig`, and deploy with `-OpenFirewall` |

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| HTTP **500.19**, code `0x8007000d` | Hosting Bundle missing, or installed before IIS | Install or repair the .NET Hosting Bundle, then run `iisreset` |
| HTTP **500.19**, code `0x80070021` | `web.config` changes a section that IIS has locked (for example `<modules>`) | Keep such settings out of `web.config`; our script sets them for the site in `applicationHost.config` |
| HTTP **500.30** / app fails to start | Missing or short `Jwt:Key` / `Qr:SigningKey`, or a settings error | Check `appsettings.Production.json`; set `stdoutLogEnabled="true"` in `web.config` and read `logs\` |
| **405** on PUT/DELETE | WebDAV module handles the request | Re-run the deploy script (step 7) or remove WebDAV for the site as shown above; the smoke test checks this |
| `/api/health` returns **503** | MongoDB service stopped | `Start-Service MongoDB` |
| Phone cannot connect | Firewall or wrong address | Deploy with `-OpenFirewall`; use the PC's LAN IP, not `localhost` |

Sources: API-04 and API-11 in [sources/api-sources.md](../sources/api-sources.md).
