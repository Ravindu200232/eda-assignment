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

   In the web app the code sits in the file header, for example `Source:  WEB-09 (MDN dialog element).`

3. Search this folder for the code to find the full details: the link, what we took and the licence.

| File | What it covers |
|---|---|
| [api-sources.md](api-sources.md) | The central Web API (C#, MongoDB, IIS) |
| [libraries.md](libraries.md) | Every ready-made software package (library) we installed, with version and licence |
| [web-sources.md](web-sources.md) | The React web application (staff portal) |
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
| API-14 | Finding the nearest stations ($geoNear) | Nimthara | MongoDB Manual |
| API-15 | Never overbooking a slot (atomic update) | Hamnad | MongoDB Manual |
| API-16 | Signing the booking QR code (HMAC) | Hamnad | Microsoft Learn |
| WEB-01 | The "clay" look (design system) | Ravindu | Design Prompts (designprompts.dev) |
| WEB-02 | Starting a React project with Vite | Ravindu | Vite documentation |
| WEB-03 | Tailwind CSS with Vite and theme tokens | Ravindu | Tailwind CSS documentation |
| WEB-04 | Page addresses (React Router) | Ravindu | React Router documentation |
| WEB-05 | Talking to the API (Axios) | Ravindu | Axios documentation |
| WEB-06 | Sharing the signed-in user between pages | Ravindu | React documentation |
| WEB-07 | Fonts that work offline | Ravindu | Fontsource |
| WEB-08 | Icons | Ravindu | Lucide |
| WEB-09 | Dialog windows | Ravindu | MDN Web Docs |
| WEB-10 | Showing Sri Lanka time | Ravindu | MDN Web Docs |
| WEB-11 | Respecting "reduce motion" | Ravindu | MDN Web Docs |
| WEB-12 | Unit tests (Vitest, Testing Library) | Ravindu | Vitest, Testing Library |
| WEB-13 | Browser tests (Playwright) | Ravindu | Playwright documentation |
| WEB-14 | Removing the test database | Ravindu | MongoDB Node.js driver docs |
| WEB-19 | Keyboard-friendly tabs | Ravindu | W3C WAI-ARIA Authoring Practices |
| WEB-20 | Logging out in every tab | Ravindu | MDN Web Docs |
| WEB-22 | Reading QR codes with the camera | Ravindu | ZXing for JS (GitHub) |
| WEB-23 | Camera permission and secure pages | Ravindu | MDN Web Docs |
| WEB-24 | A pretend webcam for automatic tests | Ravindu | Chromium source, WebRTC.org |
| WEB-25 | "3 days ago" style times | Malith | MDN Web Docs |
| WEB-26 | Refreshing dashboards only when they are visible | Malith | MDN Web Docs |
| WEB-27 | Scrolling to a section of the home page | Malith | MDN Web Docs |

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
| **Web app / SPA** | A single-page application: the browser downloads the app once and then swaps pages without reloading. |
| **React / component** | React is the library that builds the web pages. A component is one reusable piece of a page, such as a button or a table. |
| **JSX** | The HTML-like way of writing React components inside JavaScript files (`.jsx`). |
| **Tailwind CSS** | A styling tool where short class names (for example `rounded-card`) describe how something looks. |
| **Design tokens** | Named design values (colours, shadows, corner sizes) kept in one file so every page looks the same. |
| **Vite** | The tool that runs the web app while we develop it and builds the final files for IIS. |
| **Hash routing** | Page addresses written after a `#` (for example `/#/users`), so the web server always serves the same single page. |
| **Browser test** | An end-to-end test where a program clicks through the real web app in a real browser. |
