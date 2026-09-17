# Challenges and How We Solved Them

A running log of problems we met while building the system. The report's "Challenges" section is written from this
page. Each entry says what went wrong, why it happened, and what we changed.

## Web API and hosting

### 1. IIS refused to start the API (HTTP 500.19, error 0x80070021)
- **Problem:** The API worked in Visual Studio. On IIS, every request returned *HTTP Error 500.19 – Internal Server Error*.
- **Why:** Our `web.config` removed the WebDAV module in a `<modules>` section. On this PC, IIS locks that section at
  server level, so a site's own `web.config` may not change it.
- **Fix:** `web.config` no longer touches `<modules>`. The deploy script turns WebDAV off for the API site with
  `appcmd ... /commit:apphost`, which writes the change to the server-level file where it is allowed.
- **Where:** `api/src/SolarGrid.Api/web.config`, `deploy/iis/deploy-api.ps1` (step 7), `docs/deployment.md`.

### 2. PUT and DELETE requests failed with HTTP 405 on IIS
- **Problem:** Updating or deleting a record worked locally but returned *405 Method Not Allowed* on IIS.
- **Why:** The IIS WebDAV module handles PUT and DELETE itself, before the request reaches ASP.NET Core.
- **Fix:** WebDAV is removed for the API site only (see challenge 1). The smoke test now sends a PUT and a DELETE and
  expects the API's own 404 answer, so the problem is caught straight after a deployment.
- **Where:** `deploy/iis/smoke-test.ps1` ("PUT and DELETE reach the API").

### 3. The smoke test counted one station instead of five
- **Problem:** The IIS smoke test reported the wrong number of stations and built a wrong slots address.
- **Why:** Windows PowerShell 5.1 passes a JSON array from `Invoke-RestMethod` down the pipeline as a single object.
- **Fix:** A small `Get-JsonList` helper sends the items one by one before they are counted.
- **Where:** `deploy/iis/smoke-test.ps1`.

### 4. No database transactions for bookings
- **Problem:** Two prosumers booking the last free bay at the same moment could both succeed.
- **Why:** Our MongoDB runs as a single server, and multi-document transactions need a replica set.
- **Fix:** The bay counter is updated with one atomic `$inc` that only matches while a bay is still free. Status
  changes (approve, cancel, complete) use "replace only if the status is still X". If nothing matched, the API
  answers 409 and asks the user to try again.
- **Where:** `SlotRepository`, `ReservationRepository.ReplaceIfStatusAsync`, `ReservationService`, `CheckInService`.

### 5. "Today" and the 7-day / 12-hour rules depend on the time zone
- **Problem:** Dates saved in UTC showed the wrong day around midnight, and rules were hard to test.
- **Why:** The server clock and the users' clocks are not always in the same time zone.
- **Fix:** Times are stored in UTC and every rule uses Sri Lanka time (`Asia/Colombo`) through one `AppClock` class.
  Tests replace the clock with `FakeTimeProvider`, so a rule such as "12 hours before the start" can be tested at
  an exact moment. The web app also shows every time in Sri Lanka time.
- **Where:** `api/src/SolarGrid.Api/Common/AppClock.cs`, `web/src/utils/format.js`.

### 6. An invalid role gave a confusing error message
- **Problem:** Sending `"role": "Admin"` returned "The request field is required."
- **Why:** When JSON cannot be read, ASP.NET Core adds two errors, and the less helpful one was shown first.
- **Fix:** The error response now prefers the JSON error and says which field has an invalid value.
- **Where:** `api/src/SolarGrid.Api/Common/ValidationResponse.cs`.

### 7. Saving an unchanged record looked like a failure
- **Problem:** Saving a station without changing anything returned "not found".
- **Why:** MongoDB reports `ModifiedCount = 0` when the new document is identical to the old one.
- **Fix:** Repositories check `MatchedCount` (the record exists) instead of `ModifiedCount`.

### 8. Development keys ended up on the IIS server
- **Problem:** The published folder contained `appsettings.Development.json` with the development signing keys.
- **Fix:** The project file excludes that file from publishing. The deploy script creates random production keys
  once, in `appsettings.Production.json` on the server; this file is never committed to Git.
- **Where:** `SolarGrid.Api.csproj`, `deploy/iis/deploy-api.ps1` (step 4), `.gitignore`.

### 9. Tokens stayed valid after an account was deactivated
- **Problem:** A login token lasts 8 hours, so a deactivated user could keep working until it expired.
- **Fix:** On every request the API checks that the account is still active and still has the same role. If not,
  it answers 401 with a clear message, and the web app returns to the login page and shows that message.
- **Where:** `api/src/SolarGrid.Api/Extensions/AuthSetup.cs`, `web/src/api/client.js`.

### 10. The deploy command did not run
- **Problem:** Running the deploy script from Command Prompt gave "'Start-Process' is not recognized".
- **Fix:** The documentation now gives one command that works from any Administrator window:
  `powershell -ExecutionPolicy Bypass -File deploy\iis\deploy-api.ps1`.
- **Where:** `docs/deployment.md`.

## Web app

### 11. Page refresh gave "404 Not Found" on IIS
- **Problem:** A single-page app needs the web server to return `index.html` for addresses such as `/users`.
- **Why:** The IIS on the host PC has no URL Rewrite module.
- **Fix:** The web app uses hash addresses (`/#/users`). The part after `#` never reaches the server, so no
  rewrite rules are needed.
- **Where:** `web/src/routes/router.jsx`.

### 12. API field errors did not appear under the right form fields
- **Problem:** The API names fields like `FullName` or `$.role`; the forms use `fullName` and `role`.
- **Fix:** One helper converts the names, so every form shows the API's message under the matching field and a
  short summary at the top.
- **Where:** `web/src/api/client.js` (`getFieldErrors`), `web/src/components/ui/FormAlert.jsx`.

### 13. Unit tests could not open dialogs
- **Problem:** The test browser (jsdom) has no `showModal()` for `<dialog>` and no `matchMedia`.
- **Fix:** The test set-up file adds small stand-ins for both, so dialogs and the phone/desktop table layouts can be
  tested.
- **Where:** `web/src/test/setup.js`.

### 14. The camera only works on secure pages
- **Problem:** Browsers allow the camera only on `https://` pages or on `http://localhost`. A tablet opening the
  portal through the PC's network address (for example `http://192.168.1.20:8081`) cannot use the camera.
- **Fix:** The check-in page explains this and always offers two other ways: a USB barcode scanner (it types the
  code and presses Enter) or pasting the code text.
- **Where:** `web/src/pages/checkin/CameraScanner.jsx`.

### 15. Testing the camera scanner without a camera
- **Problem:** The automatic browser tests run on a PC without a webcam pointed at a phone.
- **Fix:** The test creates a short video that shows a real booking QR code and starts Chromium with that video as a
  pretend webcam. The test then checks that the code is read and checked by the API.
- **Where:** `web/e2e/fake-camera.js`, `web/e2e/checkin.spec.js`.

### 16. Screen readers and tests read "Password*" instead of "Password"
- **Problem:** The red star for required fields was part of the label text.
- **Fix:** The star is now drawn with CSS, so the label's name stays "Password". The field is still marked as
  required for screen readers.
- **Where:** `web/src/components/ui/Field.jsx`.

### 17. A map library's licence did not suit the project
- **Problem:** `react-leaflet` (Leaflet maps as React components) uses the Hippocratic licence, which adds conditions
  beyond the usual open-source terms.
- **Fix:** It was removed. The maps use plain Leaflet (BSD licence) through two small components of our own.
- **Where:** `web/src/components/maps/LeafletStationMap.jsx`, `LeafletPickerMap.jsx`, `sources/libraries.md`.

### 18. Keeping the Google Maps key out of GitHub
- **Problem:** Google Maps needs an API key, and a key pushed to GitHub can be copied and misused.
- **Fix:** The key lives only in `web/.env.local`, which Git ignores; `web/.env.example` explains the setting. A key
  in a web page can always be read in the browser, so it is also restricted in Google Cloud to our local web
  addresses and to the Maps JavaScript API. Without a key the portal uses OpenStreetMap.
- **Where:** `web/.env.example`, `web/src/components/maps/mapProvider.js`.

### 19. The page crashed when Google refused the key
- **Problem:** The browser tests run on port 5174, which was not in the key's list of allowed addresses. Google
  reported `RefererNotAllowedMapError`, and removing its broken pins then threw an error that took down the whole page.
- **Fix:** Google's `gm_authFailure` callback now switches every map to OpenStreetMap with a short note, pins are
  removed safely, and an error boundary replaces a failing Google map with OpenStreetMap. Normal test runs use
  OpenStreetMap on purpose (`VITE_MAPS_PROVIDER=osm`), so they do not depend on Google or use the key's free quota;
  only the screenshot run tries Google Maps.
- **Where:** `web/src/components/maps/googleMaps.js`, `MapErrorBoundary.jsx`, `web/playwright.config.js`.

### 20. Testing maps without a real browser
- **Problem:** Unit tests run in jsdom, which cannot load Google Maps.
- **Fix:** Leaflet works in jsdom, so its tests use the real library. The Google map components are tested with a
  small pretend Google library that records pins, clicks and drags.
- **Where:** `web/src/components/maps/LeafletStationMap.test.jsx`, `GoogleMaps.test.jsx`, `web/src/test/fakeGoogleMaps.js`.

### 21. A 24-hour station made a very long page
- **Problem:** Malabe is open all day, so its seven days hold 84 slots and the details page became several screens long.
- **Fix:** The slots card shows one day at a time with day tabs (each with its number of slots). It opens on the first
  day that still has slots to come, and jumps to the day of a slot that was just added.
- **Where:** `web/src/pages/stations/SlotsPanel.jsx`.

### 22. Layout problems found in the screenshots
- **Problem:** The "switched to OpenStreetMap" note became its own grid column beside the map, and full-page
  screenshots showed the sticky top bar in the middle of the page after the test had scrolled.
- **Fix:** The map component wraps the note and the map in one box, and the screenshot helper scrolls back to the
  top before taking a picture.
- **Where:** `web/src/components/maps/StationMap.jsx`, `web/e2e/screens.js`.

### 23. The code checker rejected reading the clock while drawing
- **Problem:** The React rules in ESLint do not allow `Date.now()` while a component is drawn, because the result
  changes on every draw.
- **Fix:** Whether a slot has already ended is worked out once, when the slots are loaded.
- **Where:** `web/src/pages/stations/SlotsPanel.jsx` (`loadSlots`).

### 24. Tests that failed only on a busy computer
- **Problem:** Long station forms typed key by key needed more than the default 5 seconds when all test files ran
  together, and one prosumer test checked the bookings request before the page had started it.
- **Fix:** Unit tests may take up to 15 seconds, and the prosumer test now waits for the bookings table first (fixed
  on Malith's branch).
- **Where:** `web/vite.config.js`, `web/src/pages/prosumers/ProsumerDetailsPage.test.jsx`.
