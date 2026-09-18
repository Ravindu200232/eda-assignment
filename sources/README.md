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
| [android-sources.md](android-sources.md) | The Android application (Java, SQLite, Google Maps) |

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
| WEB-15 | Maps that work without an API key (Leaflet) | Nimthara | Leaflet documentation |
| WEB-16 | OpenStreetMap map pictures and credit | Nimthara | OpenStreetMap Foundation |
| WEB-17 | Drawing booking QR codes (qrcode.react) | Hamnad | qrcode.react (GitHub) |
| WEB-18 | Hosting the portal files on IIS | Ravindu | Microsoft Learn, Vite documentation |
| WEB-19 | Keyboard-friendly tabs | Ravindu | W3C WAI-ARIA Authoring Practices |
| WEB-20 | Logging out in every tab | Ravindu | MDN Web Docs |
| WEB-21 | Printing a booking slip | Hamnad | MDN Web Docs |
| WEB-22 | Reading QR codes with the camera | Ravindu | ZXing for JS (GitHub) |
| WEB-23 | Camera permission and secure pages | Ravindu | MDN Web Docs |
| WEB-24 | A pretend webcam for automatic tests | Ravindu | Chromium source, WebRTC.org |
| WEB-25 | "3 days ago" style times | Malith | MDN Web Docs |
| WEB-26 | Refreshing dashboards only when they are visible | Malith | MDN Web Docs |
| WEB-27 | Scrolling to a section of the home page | Malith | MDN Web Docs |
| WEB-28 | Google Maps in the web portal | Nimthara | Google Maps Platform documentation |
| WEB-29 | Keeping a map failure inside the map | Nimthara | React documentation |
| WEB-30 | Switches and bay meters for screen readers | Nimthara | W3C WAI-ARIA Authoring Practices |
| WEB-31 | Keeping the chosen list in the address | Hamnad | React Router documentation |
| WEB-32 | Copying the QR code text | Hamnad | MDN Web Docs |

| AND-01 | Android project and Gradle set-up | Ravindu | Android Developers, Gradle documentation |
| AND-02 | The clay look on Android | Ravindu | Design Prompts (same as WEB-01) |
| AND-03 | Keeping the Maps key out of Git | Ravindu | Google Maps Platform, Android Developers |
| AND-04 | The two fonts (Nunito, DM Sans) | Ravindu | Google Fonts, Android Developers |
| AND-05 | Material Components for Android | Ravindu | Material Components documentation |
| AND-06 | Icons drawn as Android vectors | Ravindu | Lucide, Android Developers |
| AND-07 | The app icon | Ravindu | Android Developers |
| AND-08 | Plain HTTP only for the local API | Ravindu | Android Developers |
| AND-09 | Saving data on the phone with SQLite | Ravindu | Android Developers |
| AND-10 | The bottom bar and swapping screens | Ravindu | Material Components, Android Developers |
| AND-11 | Reading the booking QR code | Ravindu | ZXing Android Embedded (GitHub) |
| AND-12 | Asking for the camera at the right moment | Ravindu | Android Developers |
| AND-13 | Running Android code in a normal unit test | Ravindu | Robolectric |
| AND-14 | A stand-in Web API for the tests | Ravindu | OkHttp MockWebServer (GitHub) |
| AND-15 | Tests that tap through the app | Ravindu | Android Developers (Espresso) |
| AND-16 | Making the tests wait for the server | Ravindu | Android Developers |
| AND-17 | Calling the Web API (Retrofit) | Ravindu | Retrofit (GitHub) |
| AND-18 | The token header, timeouts and safe logging | Ravindu | OkHttp (GitHub) |
| AND-19 | Reading the error answers of the API | Ravindu | RFC 9457, Microsoft Learn |
| AND-20 | Dates and times on Android | Ravindu | Android Developers |
| AND-21 | Doing slow work off the screen thread | Ravindu | Android Developers |
| AND-22 | Taking the screenshots for the report | Ravindu | Android Developers |
| AND-23 | Reaching the API on the local network (Android 17) | Ravindu | Android Developers |
| AND-24 | Keeping the login token out of backups | Ravindu | Android Developers |
| AND-25 | Lists of bookings (RecyclerView) | Malith | Android Developers |
| AND-26 | Pull down to refresh | Malith | Android Developers |
| AND-27 | A confirmation dialog that asks for the password | Malith | Android Developers, Material Components |
| AND-28 | Where the phone is (fused location) | Nimthara | Android Developers |
| AND-29 | The map of nearby stations | Nimthara | Google Maps Platform documentation |
| AND-30 | Picking a station and a day | Nimthara | Material Components |
| AND-31 | Plural strings ("1 bay", "12 bays") | Nimthara | Android Developers |
| AND-32 | Drawing the booking QR code | Hamnad | ZXing Android Embedded (GitHub), ZXing API documentation |
| AND-33 | Booking tabs, the date range filter and the step bar | Hamnad | Material Components |
| AND-34 | A bright screen while the QR code is shown | Hamnad | Android Developers |
| AND-35 | Moving between the booking screens | Hamnad | Android Developers |

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
| **Map tiles** | The small square pictures a web map is made of; the map downloads the ones on screen. |
| **API key** | A code that identifies our app to an online service such as Google Maps. It is kept out of Git and limited to our own web addresses. |
| **Error boundary** | A React component that catches a crash in one part of the page and shows something else there, so the rest of the page keeps working. |
| **APK** | The single file an Android app is installed from, like a `.exe` on Windows. |
| **SQLite** | The small database that lives inside the phone, used for the login and for data the app shows offline. |
| **Emulator** | A pretend phone that runs on the computer, used to run and test the Android app. |
| **Activity / Fragment** | An Activity is one screen of an Android app; a Fragment is a piece of a screen, such as one tab. |
| **Vector drawable** | An icon stored as lines and curves instead of pixels, so it stays sharp on any screen. |
| **Instrumented test** | A test that runs on a real phone or emulator, tapping the app like a person would. |
