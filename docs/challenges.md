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

### 25. Booking a slot on behalf of a prosumer
- **Problem:** Staff bookings must name the prosumer (the API asks for the NIC), and only active accounts may book.
  The first version listed the search results as radio buttons, so moving through them with the arrow keys
  already picked a person.
- **Fix:** The wizard searches active prosumers only and shows the matches as ordinary buttons; the chosen person
  stays at the top with a "Choose someone else" button. When a booking is changed, the prosumer cannot change.
- **Where:** `web/src/pages/reservations/BookingWizardPage.jsx`.

### 26. Changing a booking whose slot is now full
- **Problem:** The wizard only lists slots with a free bay. A booking in a full slot could not see its own slot, so
  staff could not change just the energy or the trade type.
- **Fix:** When a booking is changed, its own slot is always added to the list and marked "This booking's slot".
- **Where:** `web/src/pages/reservations/BookingWizardPage.jsx` (`slotChoicesFor`).

### 27. Slots of the previous day stayed on screen while loading
- **Problem:** The data hook keeps the old answer while a new one loads, so after picking another day the old
  day's slots could still be clicked for a moment.
- **Fix:** Each slot answer is tagged with its station and day, and only an answer that matches the current choice
  is shown; otherwise a loading placeholder appears.
- **Where:** `web/src/pages/reservations/BookingWizardPage.jsx` (`loadFreeSlots`).

### 28. Demo bookings change while the browser tests run
- **Problem:** The demo bookings move with the clock, and other tests change them (the check-in test completes
  `RSV-DEMO-0006`). Tests that edit them would fail depending on the order and the time of day.
- **Fix:** The booking tests create their own active prosumers and bookings through the API and pick slots by time
  ("starts within 11 hours", "starts after 36 hours"). The demo bookings are only read.
- **Where:** `web/e2e/reservations.spec.js`, `web/e2e/helpers.js`.

### 29. Dashboard numbers linked to pages that did not exist yet
- **Problem:** The dashboards (built earlier) already linked to `/reservations?tab=pending` and `?tab=current`.
- **Fix:** The booking list keeps its tab in the address, so these links open the right list, and the back button
  returns to it. A browser test clicks the dashboard number to prove it.
- **Where:** `web/src/pages/reservations/ReservationsPage.jsx`.

### 30. The booking filters filled a phone screen
- **Problem:** Five stacked filter fields pushed the bookings below the first screen on a phone.
- **Fix:** On phones the filters fold away behind a "Filters" button that also shows how many are in use.
- **Where:** `web/src/pages/reservations/ReservationsPage.jsx`.

### 31. Printing only the QR code
- **Problem:** Printing the booking page printed every card, not a slip the prosumer can take away.
- **Fix:** Everything except the page heading and the QR code card is marked `no-print`, and the Print button opens
  the browser's print dialog.
- **Where:** `web/src/pages/reservations/ReservationDetailsPage.jsx`, `web/src/components/qr/QrCodeCard.jsx`.

### 32. Serving the portal files from IIS
- **Problem:** IIS only sends files whose extension it knows, and without cache settings a browser may keep an old
  `index.html` after a new deployment, which then asks for script files that no longer exist.
- **Fix:** `deploy-web.ps1` checks the MIME types the portal needs and adds missing ones, sends pages with
  `Cache-Control: no-cache` and lets the hashed files in `/assets` be cached for a year. The web smoke test checks
  the page, every script, style sheet and font, both cache headers, the API address and CORS.
- **Where:** `deploy/iis/deploy-web.ps1`, `deploy/iis/smoke-test-web.ps1`.

### 33. Clean screenshots for the report
- **Problem:** The Google Maps key did not allow the test address (`http://localhost:5174`), so the map pictures showed
  the "switched to OpenStreetMap" note, and a map tooltip stayed visible where the mouse had clicked.
- **Fix:** `E2E_MAPS_PROVIDER=osm` takes the screenshots with OpenStreetMap on purpose (Google Maps is used once the
  key allows that address), and the screenshot helper moves the mouse away before each picture.
- **Where:** `web/playwright.config.js`, `web/e2e/screens.js`.

## Android app

### 34. The clay look needs Android 9
- **Problem:** The app was set to run from Android 8.0, but lint reported errors: the coloured shadows
  (`outlineAmbientShadowColor`, `outlineSpotShadowColor`) and the variable font weights (`fontVariationSettings`)
  only work from Android 9.
- **Why:** Those attributes were added in API 28. On Android 8 the shadows would be grey and every heading would fall
  back to one weight, so the app would not match the web portal.
- **Fix:** The lowest supported version is Android 9 (minSdk 28). It still covers the phones people use, and the design
  is the same on every one of them.
- **Where:** `android/app/build.gradle.kts`.

### 35. Icons drawn in a browser did not draw on Android
- **Problem:** Some screens crashed with *"a needs to be followed by a multiple of 7 floats. However, 6 float(s) are
  found"* while the layout was being inflated.
- **Why:** The icons are the Lucide set used by the web portal. In SVG the two yes/no flags of an arc may be written
  without a separator (`a1.5 1.5 0 00-2.4-1.5`). Browsers accept that; Android's path reader counts six numbers instead
  of seven and refuses the whole file.
- **Fix:** The converter now reads each path command itself and writes every number with a space in between, treating
  the two arc flags as single digits. All icons were made again with it.
- **Where:** `android/scripts/make-icons.mjs`, `android/app/src/main/res/drawable/ic_*.xml`.

### 36. Saving the screenshots off the phone
- **Problem:** The screenshot test ran and passed, but no pictures arrived on the computer.
- **Why:** The test asked Android for the app's own folder on the shared storage, and on this emulator that folder is
  not given out, so the pictures were written to a read-only place. The failure was silent because the screenshot call
  only returns true or false.
- **Fix:** The test now hands each picture to the test runner's own storage (the AndroidX test services), which copies
  it into `app/build/outputs`, and the script moves the files into `docs/screenshots/android`. A picture that cannot be
  saved now fails the test instead of being lost.
- **Where:** `android/app/src/androidTest/java/lk/sliit/solargrid/screens/ScreensTest.java`,
  `android/scripts/take-screenshots.ps1`.

### 37. The title sat under the phone's clock
- **Problem:** On the check-in screen the back arrow and the title were drawn behind the status bar.
- **Why:** From Android 15 an app is always drawn edge to edge, behind the status bar and the navigation bar.
- **Fix:** Every screen asks the system how much room those bars need and pads itself by that much, so the content
  starts below the clock and ends above the gesture bar.
- **Where:** `android/app/src/main/java/lk/sliit/solargrid/ui/common/BaseActivity.java`.

### 38. The live test script started nothing
- **Problem:** `android\scripts\run-e2e.ps1` said it was starting the API, then waited three minutes and gave up.
- **Why:** The repository folder is `C:\eda assignment`, with a space in the name. PowerShell's `Start-Process` does not
  put quotes around the values in `-ArgumentList`, so `dotnet` was told the project was `C:\eda`. The window was
  hidden, so the message never reached the screen.
- **Fix:** The project path is quoted, and the API now writes to a log file that the script prints when the server does
  not answer in time.
- **Where:** `android/scripts/run-e2e.ps1`.

### 39. The app could not reach the API that the emulator could
- **Problem:** Against a real server, every request from the app ran for 20 seconds and then failed with
  *"failed to connect to /10.0.2.2 (port 8080)"*, although the emulator itself reached the same port at once.
- **Why:** From Android 17, an app that targets it may not connect to the local network (private addresses such as
  `10.0.2.2` or `192.168.x.x`) until the user allows the "Nearby devices" permission `ACCESS_LOCAL_NETWORK`. The
  blocked connection does not fail quickly; it just never answers. Our tests with the stand-in server passed because
  that server runs on the phone itself, which does not count as the local network.
- **Fix:** The app declares the permission and asks for it before its first request when the API address is on the
  local network; an API on the internet needs nothing. If the user says no, the login screen explains how to allow it.
  The live tests grant the permission before they start.
- **Where:** `android/app/src/main/java/lk/sliit/solargrid/util/LocalNetwork.java`, `ui/common/BaseActivity.java`,
  `ui/auth/LoginActivity.java`, `ui/auth/SplashActivity.java`, `AndroidManifest.xml`.

### 40. The last boxes of the sign-up form could not be reached
- **Problem:** On the sign-up screen the tests could not scroll to the solar panel box: *"Scrolling to view was attempted,
  but the view is not displayed"*.
- **Why:** The screen leaves room for the status bar, the navigation bar and the keyboard by adding padding. That
  padding was put on the ScrollView itself, but a ScrollView ignores its own padding when it works out how far to
  scroll, so a box could end up hidden behind the keyboard.
- **Fix:** The screens whose top view is a ScrollView now have a plain frame around it. The frame takes the padding, so
  the scrolling area itself becomes shorter and every box can be scrolled into view.
- **Where:** `android/app/src/main/res/layout/activity_login.xml`, `activity_register.xml`, `activity_registered.xml`.

### 41. A tap on a tab was sometimes lost in the emulator tests
- **Problem:** The operator bay test tapped the Bays tab straight after the screen opened, and now and then the Scan
  tab stayed on screen, so the test could not find the counter.
- **Why:** The tap arrived while Android was still running the window animation of the new screen, and was dropped.
  Espresso cannot wait for those system animations.
- **Fix:** The emulator tests run with the window animations switched off (`testOptions.animationsDisabled`), as the
  Espresso guide advises. During one long run the emulator's own Android system also restarted, which has nothing to
  do with the app; restarting the emulator before a full run avoids it.
- **Where:** `android/app/build.gradle.kts`.

### 42. The first map on the emulator stayed empty in the screenshots
- **Problem:** The map picture showed a beige area with the Google logo, but no streets and no station markers.
- **Why:** The key and the markers were fine: on the emulator the first map needs several seconds to load its drawing
  code and tiles, and the picture was taken after four.
- **Fix:** The screenshot walk waits twelve seconds for the map before the picture. The station card was also made
  solid, because the see-through clay card let the streets show through its words.
- **Where:** `android/app/src/androidTest/java/lk/sliit/solargrid/screens/ScreensTest.java`,
  `android/app/src/main/res/layout/fragment_stations.xml`.

### 43. Changing a booking whose own slot is now full
- **Problem:** In "Change booking" the slot the booking already held would be missing from the list whenever the
  booking's own bay was the last one, so the prosumer could not keep the slot and only change the energy.
- **Why:** For prosumers the API only lists slots that can still be booked: open, not started and with a free bay. The
  booking itself uses one of the bays of its slot, so a slot filled by it is left out.
- **Fix:** The form adds the booking's own slot back when it shows the booking's own station and day, marked "your
  booking", and chooses it at the start - the same answer the web portal gives (challenge 26). The API still checks
  everything when the change is saved.
- **Where:** `android/app/src/main/java/lk/sliit/solargrid/ui/booking/SlotChoices.java`, `BookingWizardActivity.java`.

### 44. The summary screen opened a second copy of the booking page
- **Problem:** Every booking action ends on the summary screen, but the booking page that started a change or a
  cancel is still open underneath it. Opening the booking from the summary would add a second copy of the page, and
  pressing back would show the booking as it was before.
- **Why:** Starting a screen normally always adds a new copy, and the old page does not know the booking changed.
- **Fix:** The summary screen asks Android to bring back the page that is already open
  (`FLAG_ACTIVITY_CLEAR_TOP` with `FLAG_ACTIVITY_SINGLE_TOP`), and the booking page loads the booking again whenever
  it comes back to the front. "Back to my bookings" does the same with the prosumer home and opens the list where the
  booking now is: waiting after a new booking or a change, history after a cancel. The home screen only switches tab
  once it is on screen again, because a tab cannot be swapped while Android is still restoring the screen.
- **Where:** `ui/booking/BookingResultActivity.java`, `ui/booking/BookingDetailsActivity.java`,
  `ui/prosumer/MainActivity.java`, `ui/operator/OperatorActivity.java`.

### 45. Turning the picked dates back into days
- **Problem:** The first version of the date filter did not build for Android 9, and on a phone set to a time zone
  behind UTC it would have filtered by the day before the one that was tapped.
- **Why:** The Material date picker answers with midnight UTC of each chosen day, as milliseconds. Reading those in
  the phone's own time zone moves the moment back a day wherever the clock is behind UTC. The easy
  `LocalDate.ofInstant` method is also missing on Android 9, the oldest version the app supports.
- **Fix:** The milliseconds are read as UTC on purpose: `Instant.ofEpochMilli(ms).atZone(ZoneOffset.UTC).toLocalDate()`,
  which works on every supported version and gives exactly the day that was tapped.
- **Where:** `ui/booking/BookingsFragment.java`.

### 46. The reason for a refused booking disappeared
- **Problem:** While writing the emulator tests we saw that when the API refused a booking because the slot had just
  filled up, its message would be hidden again a moment later.
- **Why:** After a refusal the form reloads the slots and chooses the same slot again, and choosing a slot also hid the
  message - even though the prosumer had not tapped anything.
- **Fix:** Choosing a slot no longer hides the message; it is cleared only when the prosumer moves to another step.
  An emulator test now fills the slot on purpose and checks that the message stays.
- **Where:** `ui/booking/BookingWizardActivity.java`, `android/app/src/androidTest/.../ui/booking/BookingFlowTest.java`.

### 47. The operator's day list started with the evening
- **Problem:** Straight from the API, the operator "Today" list would show the latest booking first, which is the
  wrong way round for planning the day at a station.
- **Why:** Without a list tab the API sorts bookings newest first, which suits the history lists of the web portal.
- **Fix:** The day list holds at most one day of bookings (one page of up to 100), so the app sorts that page from the
  morning on before showing it. The API and its other users are unchanged.
- **Where:** `ui/operator/TodayFragment.java`.

### 48. Test data showed slots that crossed midnight
- **Problem:** Some booking screenshots showed slots such as "22:30 - 00:30", which no real station has.
- **Why:** The sample bookings started on whole UTC hours. Sri Lanka is 5 hours 30 ahead of UTC, so every sample began
  at half past the hour in the app, and some ran past midnight.
- **Fix:** The sample bookings now start on whole Sri Lankan hours, like the real two-hour slots, and the booking
  saved in the form walk uses exactly the slot that was chosen on screen.
- **Where:** `android/app/src/testShared/java/lk/sliit/solargrid/testing/Samples.java`, `ScreensTest.java`.

### 49. An operator's booking history said "by you"
- **Problem:** In the emulator tests an operator opening a prosumer's booking read "Booked - by you".
- **Why:** The test helper signed every role in with the same NIC as the sample prosumer, so the app rightly thought
  the operator had made the booking.
- **Fix:** The helper now gives an operator a NIC and name of their own and a prosumer the sample prosumer's details.
  The screenshot script also stopped copying Espresso's "view-op-error" pictures, which it saves whenever a step fails,
  even one the test expects.
- **Where:** `android/app/src/androidTest/java/lk/sliit/solargrid/testing/AppUnderTest.java`,
  `android/scripts/take-screenshots.ps1`.

### 50. A tap on a booking tab became a long press
- **Problem:** On a busy emulator the filter test tapped the "Waiting" tab, but the list never changed, and the test
  failed twice at the same step while every other tap worked.
- **Why:** The emulator was so slow that the finger-up event arrived late. Android then reads the tap as a long press
  (the log says "Overslept and turned a tap into a long press"), and a long press on a tab only shows its tooltip.
- **Fix:** The tests choose a booking tab directly through a small Espresso action (`TabActions.selectTab`) and then
  wait for the app, so the step no longer depends on how fast the emulator is. The screen code is unchanged.
- **Where:** `android/app/src/androidTest/java/lk/sliit/solargrid/testing/TabActions.java`, `BookingFlowTest.java`,
  `ScreensTest.java`, `LiveApiTest.java`.

### 51. The emulator tests stopped after one second
- **Problem:** `connectedDebugAndroidTest` failed at once with *"The process cannot access the file because it is
  being used by another process"* for the folder of the test results.
- **Why:** The Gradle daemon and the emulator had been started from a terminal that was sitting inside that folder.
  Windows does not delete a folder that a running program uses as its working folder.
- **Fix:** Stop the Gradle daemon (`gradlew --stop`), start the emulator from its own folder, and run Gradle from the
  project folder. A slow emulator was also restarted, which brought a full emulator run back from about 45 minutes to
  about 3.
- **Where:** How the tests are run; nothing in the code changed.

