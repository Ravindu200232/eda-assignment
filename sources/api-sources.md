# Web API — Code Sources

Every entry below is referenced in the code with a comment such as `// Source: API-01`.
All links were opened and checked when the entry was written.
Microsoft Learn articles are published under CC BY 4.0, with code samples under the MIT licence.

---

## API-01 · Connecting the API to MongoDB

| | |
|---|---|
| **What it does** | Shows how a C# web service reads the database address from a settings file and keeps one shared connection to MongoDB. |
| **Where we used it** | `api/src/SolarGrid.Api/Data/MongoDbContext.cs` (constructor), `api/src/SolarGrid.Api/Data/MongoSettings.cs` |
| **Source** | Microsoft Learn — *Create a web API with ASP.NET Core and MongoDB* |
| **Link** | https://learn.microsoft.com/en-us/aspnet/core/tutorials/first-mongo-app |
| **How much we used** | The pattern only: a settings class bound from `appsettings.json` and a single `MongoClient` registered once. The four collections, the time-out setting and everything else are our own. |
| **Added by** | Ravindu |

## API-02 · Login tokens (JWT)

| | |
|---|---|
| **What it does** | Explains how an ASP.NET Core API checks the signed "pass" (JWT) that a logged-in user sends with each request. |
| **Where we used it** | `api/src/SolarGrid.Api/Extensions/AuthSetup.cs`, `api/src/SolarGrid.Api/Security/JwtTokenService.cs` |
| **Source** | Microsoft Learn — *Configure JWT bearer authentication in ASP.NET Core* |
| **Link** | https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-jwt-bearer-authentication |
| **How much we used** | `AddJwtBearer`, the validation settings (issuer, audience, signing key, lifetime) and `MapInboundClaims = false`. Our own additions: the NIC/role claims, friendly 401/403 messages and the 8-hour expiry. |
| **Note** | The article recommends an external identity provider for production systems. For this assignment the API issues its own tokens; this is listed as a limitation in the report. |
| **Added by** | Ravindu |

## API-03 · Standard error messages (ProblemDetails)

| | |
|---|---|
| **What it does** | Describes a standard JSON shape for errors (`title`, `status`, `detail`) and how to change the automatic "invalid input" response. |
| **Where we used it** | `api/src/SolarGrid.Api/Middleware/ErrorHandlingMiddleware.cs`, `api/src/SolarGrid.Api/Common/ProblemResponse.cs`, `api/src/SolarGrid.Api/Common/ValidationResponse.cs` |
| **Source** | Microsoft Learn — *Handle errors in ASP.NET Core APIs* |
| **Link** | https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api |
| **How much we used** | `Results.Problem(...)`, `AddProblemDetails()` and replacing `InvalidModelStateResponseFactory`. The mapping of our own exception types to status codes is our own. |
| **Added by** | Ravindu |

## API-04 · Hosting the API on IIS

| | |
|---|---|
| **What it does** | Step-by-step guide for running an ASP.NET Core app on Windows IIS: the Hosting Bundle, the `web.config` file and an application pool set to "No Managed Code". |
| **Where we used it** | `api/src/SolarGrid.Api/web.config`, `deploy/iis/deploy-api.ps1`, `docs/deployment.md` |
| **Source** | Microsoft Learn — *Host ASP.NET Core on Windows with IIS* |
| **Link** | https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/ |
| **How much we used** | The required settings. The script that automates them (secrets file, permissions, firewall option) is our own. |
| **Added by** | Ravindu |

## API-05 · Swagger test page with a login button

| | |
|---|---|
| **What it does** | Shows how to add an "Authorize" button to the Swagger page so testers can paste a login token. |
| **Where we used it** | `api/src/SolarGrid.Api/Extensions/SwaggerSetup.cs` |
| **Source** | Swashbuckle.AspNetCore documentation — *Add Security Definitions and Requirements for Bearer authentication* |
| **Link** | https://github.com/domaindrivendev/Swashbuckle.AspNetCore/blob/master/docs/configure-and-customize-swaggergen.md |
| **How much we used** | The `AddSecurityDefinition` / `AddSecurityRequirement` example (about 10 lines), with our own titles and descriptions. |
| **Licence** | MIT |
| **Added by** | Ravindu |

## API-06 · Safe password storage (BCrypt)

| | |
|---|---|
| **What it does** | A library that turns passwords into salted one-way hashes and checks them at login. |
| **Where we used it** | `api/src/SolarGrid.Api/Security/PasswordHasher.cs` |
| **Source** | BCrypt.Net-Next — project README |
| **Link** | https://github.com/BcryptNet/bcrypt.net |
| **How much we used** | The two calls `BCrypt.HashPassword` and `BCrypt.Verify`. We wrapped them in our own `IPasswordHasher` so tests can use a faster setting. |
| **Licence** | MIT |
| **Added by** | Ravindu |

## API-07 · Running the whole API inside tests

| | |
|---|---|
| **What it does** | Explains `WebApplicationFactory`, which starts the real API in memory so tests can call it over HTTP. |
| **Where we used it** | `api/tests/SolarGrid.Api.E2ETests/Infrastructure/ApiFactory.cs` |
| **Source** | Microsoft Learn — *Integration tests in ASP.NET Core* |
| **Link** | https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests |
| **How much we used** | `WebApplicationFactory<Program>` with `ConfigureWebHost`. The throw-away database per run and the helper methods are our own. |
| **Added by** | Ravindu |

## API-08 · A controllable clock for time rules

| | |
|---|---|
| **What it does** | `TimeProvider` lets code ask "what time is it?" through an object that tests can replace with a fake clock (`FakeTimeProvider`). |
| **Where we used it** | `api/src/SolarGrid.Api/Common/AppClock.cs`, `api/tests/SolarGrid.Api.UnitTests/TestSupport/TestClock.cs` |
| **Source** | Microsoft Learn — *What is the TimeProvider class* |
| **Link** | https://learn.microsoft.com/en-us/dotnet/standard/datetime/timeprovider-overview |
| **How much we used** | The idea and the two classes. The Sri Lanka time-zone helpers in `AppClock` are our own. |
| **Added by** | Ravindu |

## API-09 · Sri Lankan NIC number format

| | |
|---|---|
| **What it does** | Explains the old NIC (9 digits + V/X) and the new NIC (12 digits), and that digits for the day of birth add 500 for women. |
| **Where we used it** | `api/src/SolarGrid.Api/Common/NicValidator.cs` |
| **Sources** | Wikipedia — *National identity card (Sri Lanka)*; The Sri Lanka — *Understanding Sri Lanka's National Identity Card System* |
| **Links** | https://en.wikipedia.org/wiki/National_identity_card_(Sri_Lanka) · https://thesrilanka.lk/docs/national-identity-card/understanding-sri-lankan-nic-system/ |
| **How much we used** | Facts only (the number layout). No code was copied; the checking code is our own. |
| **Added by** | Ravindu |

## API-10 · How data is saved in MongoDB (naming and enums)

| | |
|---|---|
| **What it does** | Describes "conventions" that control how C# objects are written to MongoDB — here: camelCase field names, enums saved as words and empty fields left out. |
| **Where we used it** | `api/src/SolarGrid.Api/Data/MongoDbContext.cs` (`RegisterConventions`) |
| **Source** | MongoDB Docs — *Serialization* and *POCOs* (.NET/C# Driver) |
| **Links** | https://www.mongodb.com/docs/drivers/csharp/current/serialization/ · https://www.mongodb.com/docs/drivers/csharp/current/serialization/poco/ |
| **How much we used** | The `ConventionPack` / `ConventionRegistry.Register` pattern. The choice of conventions and the namespace filter are our own. |
| **Added by** | Ravindu |

## API-11 · Turning off WebDAV on IIS

| | |
|---|---|
| **What it does** | Explains that the IIS WebDAV module answers PUT and DELETE requests with "405 Method Not Allowed" before the API sees them, and that it should be removed for the site. The appcmd guide shows how to remove a module or handler for one site and how `/commit:apphost` writes the change to `applicationHost.config` when a section is locked. |
| **Where we used it** | `deploy/iis/deploy-api.ps1` (`Remove-SiteEntry`, step 7), `docs/deployment.md` |
| **Sources** | Microsoft Learn — *Troubleshoot Web API2 apps that work in Visual Studio and fail on a production IIS server*; Microsoft Learn — *Getting Started with AppCmd.exe*; Microsoft Learn — *IIS modules with ASP.NET Core* |
| **Links** | https://learn.microsoft.com/en-us/aspnet/web-api/overview/testing-and-debugging/troubleshooting-http-405-errors-after-publishing-web-api-applications · https://learn.microsoft.com/en-us/iis/get-started/getting-started-with-iis/getting-started-with-appcmdexe · https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/modules |
| **How much we used** | The removal of the `WebDAVModule` module and `WebDAV` handler, and the appcmd `/-[name='…']` and `/commit:apphost` options. The check that runs it only when WebDAV is installed is our own. |
| **Added by** | Ravindu |

## API-12 · Database indexes

| | |
|---|---|
| **What it does** | Shows how to create unique, compound and geospatial (2dsphere) indexes from C#. Indexes make searches fast and stop duplicate values. |
| **Where we used it** | `api/src/SolarGrid.Api/Data/IndexSetup.cs` |
| **Source** | MongoDB Docs — *Create and Manage Indexes* (.NET/C# Driver) |
| **Link** | https://www.mongodb.com/docs/drivers/csharp/current/indexes/ |
| **How much we used** | `CreateIndexModel` with `Builders<T>.IndexKeys` (`Ascending`, `Geo2DSphere`) and `Unique = true`. Which fields are indexed is our own design. |
| **Added by** | Ravindu |

## API-13 · Adding up completed transfers (aggregation)

| | |
|---|---|
| **What it does** | Explains MongoDB "aggregation pipelines", which filter documents (`$match`) and total them (`$group` with `$sum`) inside the database. |
| **Where we used it** | `api/src/SolarGrid.Api/Repositories/ReservationRepository.cs` (`GetCompletedTotalsAsync`) |
| **Sources** | MongoDB Docs — *Aggregation Pipeline Stages* (.NET/C# Driver); MongoDB Manual — *$group (aggregation stage)* |
| **Links** | https://www.mongodb.com/docs/drivers/csharp/current/aggregation/stages/ · https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/ |
| **How much we used** | The `Aggregate().Match(...).Group(...)` builder calls. The totals we calculate (count and delivered kWh) are our own. |
| **Added by** | Malith |

## API-14 · Finding the nearest stations ($geoNear)

| | |
|---|---|
| **What it does** | Describes MongoDB's `$geoNear` stage, which sorts places by distance from a GPS point, can limit the search radius (in metres) and returns each distance. It needs a 2dsphere index. |
| **Where we used it** | `api/src/SolarGrid.Api/Repositories/StationRepository.cs` (`FindNearbyAsync`) |
| **Sources** | MongoDB Manual — *$geoNear (aggregation stage)*; MongoDB Docs — *Aggregation Pipeline Stages* (.NET/C# Driver) |
| **Links** | https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/ · https://www.mongodb.com/docs/drivers/csharp/current/aggregation/stages/ |
| **How much we used** | The `$geoNear` options (`distanceField`, `maxDistance`, `spherical`, `query`) through the driver's `GeoNear` builder. Converting metres to kilometres and hiding inactive stations are our own. |
| **Added by** | Nimthara |

## API-15 · Never overbooking a slot (atomic update with a condition)

| | |
|---|---|
| **What it does** | Explains that MongoDB changes a single document in one indivisible step, and that putting the expected value in the update filter prevents two people from overwriting each other. `$expr` lets a filter compare two fields of the same document (booked bays < capacity). |
| **Where we used it** | `api/src/SolarGrid.Api/Repositories/SlotRepository.cs` (`TryTakeBayAsync`), `api/src/SolarGrid.Api/Repositories/ReservationRepository.cs` (`ReplaceIfStatusAsync`) |
| **Sources** | MongoDB Manual — *Atomicity and Transactions*; MongoDB Manual — *$expr (query predicate operator)* |
| **Links** | https://www.mongodb.com/docs/manual/core/write-operations-atomicity/ · https://www.mongodb.com/docs/manual/reference/operator/query/expr/ |
| **How much we used** | The idea of a conditional single-document update. Applying it to battery bays and booking status changes is our own. |
| **Added by** | Hamnad |

## API-16 · Signing the booking QR code (HMAC)

| | |
|---|---|
| **What it does** | HMAC-SHA256 creates a "signature" from data and a secret key; anyone without the key cannot make a valid signature. `FixedTimeEquals` compares signatures without leaking timing information. |
| **Where we used it** | `api/src/SolarGrid.Api/Security/QrTokenService.cs` |
| **Sources** | Microsoft Learn — *HMACSHA256 Class*; Microsoft Learn — *CryptographicOperations.FixedTimeEquals Method* |
| **Links** | https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.hmacsha256 · https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.fixedtimeequals |
| **How much we used** | `HMACSHA256.HashData` and `CryptographicOperations.FixedTimeEquals`. The QR text format (`SSG1.id.nonce.signature`) and the nonce idea are our own design. |
| **Added by** | Hamnad |
