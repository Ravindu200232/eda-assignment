# Code Sources and References

## What is this folder?

The SE4040 assignment rules say that any code we did not write entirely on our own must be credited, and that the
program files must say where it came from. This folder is that record. It lists every outside source we used —
official guides, ready-made libraries and reference articles — in plain language, so that anyone, including a
reader without a programming background, can see **what** we used, **where** we used it and **why**.

## How to read it

1. Every source has a short code such as **API-04**.
2. The same code is written as a comment in the program file that uses it, for example:

   ```csharp
   // Source: API-04 (sources/api-sources.md) - hosting ASP.NET Core on IIS.
   ```

3. Search this folder for the code to find the full details: the link, what we took and the licence.

| File | What it covers |
|---|---|
| [api-sources.md](api-sources.md) | The central Web API (C#, MongoDB, IIS) |
| [libraries.md](libraries.md) | Every ready-made software package (library) we installed, with version and licence |
| `web-sources.md` | The React web application (added when the web app is built) |
| `android-sources.md` | The Android application (added when the mobile app is built) |

## All sources at a glance

| Code | Topic | Added by | Source |
|---|---|---|---|
| API-01 | Connecting the API to MongoDB | Ravindu | Microsoft Learn |
| API-02 | Login tokens (JWT) | Ravindu | Microsoft Learn |
| API-03 | Standard error messages (ProblemDetails) | Ravindu | Microsoft Learn |
| API-04 | Hosting the API on IIS | Ravindu | Microsoft Learn |
| API-05 | Swagger test page with a login button | Ravindu | Swashbuckle documentation (GitHub) |
| API-06 | Safe password storage (BCrypt) | Ravindu | BCrypt.Net-Next (GitHub) |
| API-07 | Running the whole API inside tests | Ravindu | Microsoft Learn |
| API-08 | A controllable clock for time rules | Ravindu | Microsoft Learn |
| API-09 | Sri Lankan NIC number format | Ravindu | Wikipedia, The Sri Lanka (thesrilanka.lk) |
| API-10 | How data is saved in MongoDB (naming, enums) | Ravindu | MongoDB Docs |
| API-11 | Turning off WebDAV on IIS | Ravindu | Microsoft Learn |
| API-12 | Database indexes | Ravindu | MongoDB Docs |
| API-13 | Adding up completed transfers (aggregation) | Malith | MongoDB Docs |

## Glossary (plain English)

| Term | Meaning |
|---|---|
| **API / Web API** | A program on a server that other apps talk to over the internet. Our web and Android apps never touch the database themselves; they ask the API. |
| **REST / JSON** | The style (REST) and text format (JSON) the apps use to send requests and receive answers. |
| **FAT service** | A design where all business rules (for example "bookings must be within 7 days") live in the central API, not in the apps. |
| **MongoDB / NoSQL** | The database. Instead of tables it stores flexible *documents* grouped into *collections*. |
| **Collection / Document** | A collection is like a folder (e.g. all reservations); a document is one record inside it. |
| **NIC** | Sri Lankan National Identity Card number. It is the unique key of every user in our system. |
| **JWT (token)** | A signed digital pass the API gives after login. The app sends it with each request to prove who the user is. |
| **Hash / BCrypt** | A one-way scramble of a password. We store the scramble, never the real password. |
| **IIS** | Internet Information Services — Microsoft's web server on Windows, where our API is hosted. |
| **Swagger** | A web page that lists every API endpoint and lets you try them in the browser. |
| **GeoJSON / 2dsphere** | A standard way to save GPS points, and the MongoDB index that makes "find the nearest station" fast. |
| **QR code** | A square barcode. Approved bookings get one; operators scan it at the station. |
| **Unit test** | An automatic check of one small piece of code on its own. |
| **E2E (end-to-end) test** | An automatic check that runs a full journey through the real API and database. |
| **Library / package** | Ready-made code written by others that we install instead of writing it ourselves. |
| **Licence** | The legal terms that say how a library or article may be reused. |
