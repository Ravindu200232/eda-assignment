# Web App — Code Sources

Every entry below is referenced in the code with a comment such as `// Source: WEB-04`.
All links were opened and checked when the entry was written (September 2026).
Numbers were given when the web work was planned, and each team member adds their entries in their own pull request.
Microsoft Learn and MDN pages are published under Creative Commons licences; their code samples are free to reuse.

---

## WEB-01 · The "clay" look (design system)

| | |
|---|---|
| **What it does** | A written design guide ("High-Fidelity Claymorphism") that describes a soft, toy-like look: pale lavender background, bright candy colours, very round corners, four-layer shadows, floating background blobs and buttons that "squish" when pressed. |
| **Where we used it** | `web/src/styles/theme.css` (colours, shadows, radii, fonts, animations), `web/src/components/ui/styles.js`, `Card.jsx`, `Button.jsx`, `IconOrb.jsx`, `StatOrb.jsx`, `BackgroundBlobs.jsx`, `web/src/layouts/AuthLayout.jsx` |
| **Source** | Design Prompts — *Clay* style, "Get the AI prompt for this design" |
| **Link** | https://www.designprompts.dev/claymorphism |
| **How much we used** | The design values: colour codes, the four shadow recipes, corner sizes, font choice and the animation timings. We turned them into our own Tailwind theme tokens and components; the page layouts are our own. |
| **Licence** | No licence is stated on the site. The prompt is offered for use in building interfaces, and we credit it here. |
| **Added by** | Ravindu |

## WEB-02 · Starting a React project with Vite

| | |
|---|---|
| **What it does** | Vite is the tool that runs the web app during development and builds the final files. The guide shows how to create a React project and how to change build settings. |
| **Where we used it** | `web/vite.config.js`, `web/index.html`, `web/src/main.jsx`, `web/eslint.config.js` |
| **Source** | Vite — *Getting Started* and *Build Options* |
| **Link** | https://vite.dev/guide/ · https://vite.dev/config/build-options |
| **How much we used** | The starter project from `npm create vite@latest -- --template react` (entry file, ESLint set-up) and the `build.rolldownOptions` setting. Everything inside `src/` was rewritten by us. |
| **Licence** | MIT |
| **Added by** | Ravindu |

## WEB-03 · Tailwind CSS with Vite and theme tokens

| | |
|---|---|
| **What it does** | Tailwind CSS styles pages with short class names. The guides show how to add it to Vite and how to define our own colours, shadows and animations in one `@theme` block. |
| **Where we used it** | `web/vite.config.js`, `web/src/styles/theme.css` |
| **Source** | Tailwind CSS — *Installing Tailwind CSS with Vite* and *Theme variables* |
| **Link** | https://tailwindcss.com/docs/installation/using-vite · https://tailwindcss.com/docs/theme |
| **How much we used** | The plugin set-up (2 lines) and the `@theme` / `@keyframes` syntax. The token values come from WEB-01. |
| **Licence** | MIT |
| **Added by** | Ravindu |

## WEB-04 · Page addresses (React Router)

| | |
|---|---|
| **What it does** | Connects each web address to a page. The hash router keeps the page name after `#` (for example `/#/users`), so IIS does not need extra rewrite rules. Pages are loaded only when first opened. |
| **Where we used it** | `web/src/routes/router.jsx`, `web/src/routes/guards.jsx`, `web/src/App.jsx`, `web/src/pages/errors/RouteErrorPage.jsx`, `web/src/test/render.jsx` |
| **Source** | React Router — *createHashRouter* and *Route Object* (`lazy`) |
| **Link** | https://reactrouter.com/api/data-routers/createHashRouter · https://reactrouter.com/start/data/route-object |
| **How much we used** | `createHashRouter`, `RouterProvider`, `Navigate`/`Outlet`, `errorElement` and the `lazy` route property. The route list, the role guards and the "return to the page you asked for" logic are our own. |
| **Licence** | MIT |
| **Added by** | Ravindu |

## WEB-05 · Talking to the API (Axios)

| | |
|---|---|
| **What it does** | Axios sends requests to the Web API. "Interceptors" run on every request and answer, which is where we add the login token and notice expired sessions. |
| **Where we used it** | `web/src/api/client.js` |
| **Source** | Axios documentation — *Interceptors* (the older axios-http.com address now forwards here) |
| **Link** | https://axios.rest/pages/advanced/interceptors |
| **How much we used** | `axios.create` and the two `interceptors.*.use` calls. The error-to-message rules (`getErrorMessage`, `getFieldErrors`) are our own. |
| **Licence** | MIT |
| **Added by** | Ravindu |

## WEB-06 · Sharing the signed-in user between pages (React)

| | |
|---|---|
| **What it does** | React "context" lets every page read the signed-in user without passing it through each component. `useSyncExternalStore` connects React to our small session store, `useId` creates safe ids for linking labels and messages, and `useEffectEvent` lets the camera code call the latest callback. |
| **Where we used it** | `web/src/context/AuthContext.jsx`, `web/src/context/ToastContext.jsx`, `web/src/components/ui/Field.jsx`, `web/src/components/ui/fieldContext.js`, `web/src/pages/checkin/CameraScanner.jsx` |
| **Source** | React documentation — *createContext*, *useSyncExternalStore*, *useId*, *useEffectEvent* (stable since React 19.2) |
| **Link** | https://react.dev/reference/react/createContext · https://react.dev/reference/react/useSyncExternalStore · https://react.dev/reference/react/useId · https://react.dev/reference/react/useEffectEvent |
| **How much we used** | The standard usage of each function. The session rules (prosumer refusal, expiry timer, other-tab logout) are our own. |
| **Licence** | React docs: CC BY 4.0 · React: MIT |
| **Added by** | Ravindu |

## WEB-07 · Fonts that work offline (Fontsource)

| | |
|---|---|
| **What it does** | Packages the Nunito and DM Sans fonts with the app, so the portal looks right even without internet (for example during the viva). |
| **Where we used it** | `web/src/main.jsx`, `web/src/styles/theme.css` (`--font-heading`, `--font-sans`) |
| **Source** | Fontsource — *Nunito* and *DM Sans* |
| **Link** | https://fontsource.org/fonts/nunito · https://fontsource.org/fonts/dm-sans |
| **How much we used** | One import line per font. |
| **Licence** | SIL Open Font License 1.1 (read from the package files) |
| **Added by** | Ravindu |

## WEB-08 · Icons (Lucide)

| | |
|---|---|
| **What it does** | A set of simple line icons (menu, camera, battery, etc.) used as React components. |
| **Where we used it** | Most components and pages, for example `web/src/routes/navigation.js`, `web/src/components/ui/Alert.jsx`, `web/src/pages/checkin/CheckInPage.jsx` |
| **Source** | Lucide |
| **Link** | https://lucide.dev/license |
| **How much we used** | We only import icons by name; no icon was changed. |
| **Licence** | ISC (some icons come from Feather and are MIT) |
| **Added by** | Ravindu |

## WEB-09 · Dialog windows (`<dialog>`)

| | |
|---|---|
| **What it does** | The browser's own dialog element opens pop-up windows that keep keyboard focus inside, close with the Esc key and dim the page behind them. |
| **Where we used it** | `web/src/components/ui/Modal.jsx`, `web/src/components/ui/Drawer.jsx`, `web/src/styles/theme.css` (`::backdrop`), `web/src/test/setup.js` |
| **Source** | MDN Web Docs — *The Dialog element* |
| **Link** | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog |
| **How much we used** | `showModal()`, `close()`, the `cancel` event and `::backdrop`. The "click outside to close" check and the test stand-in are our own. |
| **Added by** | Ravindu |

## WEB-10 · Showing Sri Lanka time

| | |
|---|---|
| **What it does** | `Intl.DateTimeFormat` formats dates in a chosen time zone, so every screen shows Sri Lanka time (`Asia/Colombo`) whatever the computer is set to. |
| **Where we used it** | `web/src/utils/format.js`, `web/src/layouts/TopBar.jsx` |
| **Source** | MDN Web Docs — *Intl.DateTimeFormat() constructor* |
| **Link** | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat |
| **How much we used** | The `timeZone` and `hourCycle` options. The helpers (for example "the next 7 Sri Lanka dates") are our own. |
| **Added by** | Ravindu |

## WEB-11 · Respecting "reduce motion"

| | |
|---|---|
| **What it does** | Some people turn on "reduce motion" in their system settings. This media query lets the page switch off its floating and breathing animations for them. |
| **Where we used it** | `web/src/styles/theme.css` |
| **Source** | MDN Web Docs — *prefers-reduced-motion* |
| **Link** | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion |
| **How much we used** | The `@media (prefers-reduced-motion: reduce)` rule. |
| **Added by** | Ravindu |

## WEB-12 · Unit tests (Vitest and Testing Library)

| | |
|---|---|
| **What it does** | Vitest runs small automatic checks. Testing Library draws a component and lets the test click and type like a user; jest-dom adds readable checks such as "is visible". |
| **Where we used it** | `web/vite.config.js` (`test` block), `web/src/test/setup.js`, `web/src/test/render.jsx`, all `*.test.js(x)` files |
| **Source** | Vitest — *Configuring Vitest*; Testing Library — *React Testing Library*; jest-dom README — *With Vitest* |
| **Link** | https://vitest.dev/config/ · https://testing-library.com/docs/react-testing-library/intro/ · https://github.com/testing-library/jest-dom |
| **How much we used** | The set-up lines (`defineConfig` from `vitest/config`, `import '@testing-library/jest-dom/vitest'`). All test cases are our own. |
| **Licence** | MIT |
| **Added by** | Ravindu |

## WEB-13 · Browser tests (Playwright)

| | |
|---|---|
| **What it does** | Playwright drives a real Chromium browser through the portal. Its settings can start our API and web app before the tests, clean up afterwards and save screenshots for the report. |
| **Where we used it** | `web/playwright.config.js`, `web/e2e/*.js` |
| **Source** | Playwright — *Web server*, *Global setup and teardown*, *Screenshots*, *Browsers* (full Chromium in headless mode) |
| **Link** | https://playwright.dev/docs/test-webserver · https://playwright.dev/docs/test-global-setup-teardown · https://playwright.dev/docs/screenshots · https://playwright.dev/docs/browsers |
| **How much we used** | The configuration options (`webServer` list, `globalTeardown`, `screenshot({ fullPage })`, `channel: 'chromium'`). The test journeys are our own. |
| **Licence** | Apache-2.0 |
| **Added by** | Ravindu |

## WEB-14 · Removing the test database

| | |
|---|---|
| **What it does** | After the browser tests, a small script deletes the temporary MongoDB database that the tests used. |
| **Where we used it** | `web/e2e/global-teardown.js` |
| **Source** | MongoDB Node.js driver documentation and API reference — `Db.dropDatabase()` |
| **Link** | https://www.mongodb.com/docs/drivers/node/current/ · https://mongodb.github.io/node-mongodb-native/7.6/classes/Db.html |
| **How much we used** | `new MongoClient(...)`, `db(name).dropDatabase()`. The safety check (only `SolarGridDb_WebE2E_*` names) is our own. |
| **Licence** | Apache-2.0 |
| **Added by** | Ravindu |

## WEB-15 · Maps that work without an API key (Leaflet)

| | |
|---|---|
| **What it does** | Leaflet is a small library for interactive maps. We use it when no Google Maps key is set, or when Google Maps cannot be used: it draws the stations as pins, lets a pin be clicked or reached with the keyboard, and lets staff click the map or drag a pin to choose a station's GPS position. |
| **Where we used it** | `web/src/components/maps/leafletSetup.js`, `LeafletStationMap.jsx`, `LeafletPickerMap.jsx`, `LeafletStationMap.test.jsx` |
| **Source** | Leaflet — *API reference (1.9.4)*: `L.map`, `L.marker` (`title`, `alt`, `keyboard`, `draggable`), `L.divIcon`, `L.layerGroup`, `bindTooltip`, `fitBounds`, the map `click` and marker `dragend` events; *Accessibility* guide (every pin needs its own title) |
| **Link** | https://leafletjs.com/reference.html · https://leafletjs.com/examples/accessibility/ |
| **How much we used** | The library calls listed above. The clay pin design, the "choose a location" behaviour and the switch between map services are our own. We use plain Leaflet instead of the `react-leaflet` wrapper, because that wrapper's Hippocratic licence adds conditions we did not want in a university project. |
| **Licence** | BSD-2-Clause |
| **Added by** | Nimthara |

## WEB-16 · OpenStreetMap map pictures and credit

| | |
|---|---|
| **What it does** | The OpenStreetMap map pictures (tiles) behind the Leaflet maps, and the rules for using them: show the "© OpenStreetMap contributors" credit, use the official tile address, and do not download tiles in bulk. |
| **Where we used it** | `web/src/components/maps/leafletSetup.js` (tile address and credit link), the offline note in `LeafletStationMap.jsx` and `LeafletPickerMap.jsx` |
| **Source** | OpenStreetMap Foundation — *Tile Usage Policy*; OpenStreetMap — *Copyright and License* |
| **Link** | https://operations.osmfoundation.org/policies/tiles/ · https://www.openstreetmap.org/copyright |
| **How much we used** | The tile address `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and the credit text with its link. The maps only load the tiles a person is looking at; nothing is downloaded in advance. |
| **Licence** | Map data: Open Database License (ODbL). The tile service may be used under the policy above. |
| **Added by** | Nimthara |

## WEB-17 · Drawing booking QR codes (qrcode.react)

| | |
|---|---|
| **What it does** | A React component that turns a text into a QR code picture (SVG). The booking page draws the signed code text that the API gives for an approved booking. |
| **Where we used it** | `web/src/components/qr/QrCodeCard.jsx` |
| **Source** | qrcode.react — README (`QRCodeSVG` and its `value`, `size`, `level`, `marginSize` and `title` props) |
| **Link** | https://github.com/zpao/qrcode.react |
| **How much we used** | One `QRCodeSVG` element with those props. The card around it, the booking details and the print and copy buttons are our own. |
| **Licence** | ISC (the bundled QR generator is MIT) |
| **Added by** | Hamnad |

## WEB-19 · Keyboard-friendly tabs

| | |
|---|---|
| **What it does** | Describes how tab lists should work for keyboard and screen-reader users: arrow keys move between tabs, Home/End jump to the ends, and the chosen tab is marked as selected. |
| **Where we used it** | `web/src/components/ui/Tabs.jsx` |
| **Source** | W3C WAI-ARIA Authoring Practices Guide — *Tabs Pattern* |
| **Link** | https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ |
| **How much we used** | The key behaviour and the `tablist` / `tab` / `aria-selected` roles. The component code is our own. |
| **Added by** | Ravindu |

## WEB-20 · Logging out in every tab

| | |
|---|---|
| **What it does** | The browser's `storage` event tells other open tabs when the saved session changes, so logging out in one tab logs out the others too. |
| **Where we used it** | `web/src/context/AuthContext.jsx`, `web/src/context/sessionStore.js` |
| **Source** | MDN Web Docs — *Window: storage event* |
| **Link** | https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event |
| **How much we used** | Listening for the event (a few lines). |
| **Added by** | Ravindu |

## WEB-21 · Printing a booking slip

| | |
|---|---|
| **What it does** | `window.print()` opens the browser's print dialog, and CSS inside `@media print` decides what is printed. The booking page prints only the heading and the QR code card, so staff can hand the prosumer a paper slip. |
| **Where we used it** | `web/src/components/qr/QrCodeCard.jsx` (Print button), `web/src/pages/reservations/ReservationDetailsPage.jsx` (`no-print` on the other cards), `web/src/styles/theme.css` (`@media print`) |
| **Source** | MDN Web Docs — *Window: print() method*; *@media* (the `print` media type) |
| **Link** | https://developer.mozilla.org/en-US/docs/Web/API/Window/print · https://developer.mozilla.org/en-US/docs/Web/CSS/@media#print |
| **How much we used** | The `print()` call and a `print` media rule that hides everything marked `no-print`. Which parts of the page are printed is our own choice. |
| **Added by** | Hamnad |

## WEB-22 · Reading QR codes with the camera (ZXing)

| | |
|---|---|
| **What it does** | ZXing is a well-known barcode reader. Its browser version reads QR codes from a webcam picture; its core library can also create QR codes, which our tests use to make a pretend camera video. |
| **Where we used it** | `web/src/pages/checkin/CameraScanner.jsx`, `web/e2e/fake-camera.js` |
| **Source** | ZXing for JS — `@zxing/browser` and `@zxing/library` (GitHub) |
| **Link** | https://github.com/zxing-js/browser · https://github.com/zxing-js/library |
| **How much we used** | `BrowserQRCodeReader.decodeFromVideoDevice`, `listVideoInputDevices` and `controls.stop()` in the app; `QRCodeWriter` in the test. The camera choice, error advice and "one preview per session" handling are our own. |
| **Licence** | `@zxing/browser`: MIT · `@zxing/library`: Apache-2.0 |
| **Added by** | Ravindu |

## WEB-23 · Camera permission and secure pages

| | |
|---|---|
| **What it does** | Explains how a page asks for the camera, which errors can happen (blocked, no camera, camera busy) and that browsers only allow it on secure pages (`https://` or `http://localhost`). |
| **Where we used it** | `web/src/pages/checkin/CameraScanner.jsx` |
| **Source** | MDN Web Docs — *MediaDevices: getUserMedia()* and *Secure contexts* |
| **Link** | https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia · https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts |
| **How much we used** | The error names and the secure-page check (`window.isSecureContext`). The messages for operators are our own. |
| **Added by** | Ravindu |

## WEB-24 · A pretend webcam for automatic tests

| | |
|---|---|
| **What it does** | Chromium can play a video file instead of a real camera. The video must be in the simple raw "Y4M" format, which our test writes itself. |
| **Where we used it** | `web/e2e/fake-camera.js`, `web/e2e/checkin.spec.js` |
| **Source** | Chromium source code — `media/base/media_switches.cc` (the two start-up switches) and `media/capture/video/file_video_capture_device.h` (supported Y4M/MJPEG files); WebRTC — *Testing WebRTC applications* |
| **Link** | https://chromium.googlesource.com/chromium/src/+/HEAD/media/base/media_switches.cc · https://chromium.googlesource.com/chromium/src/+/HEAD/media/capture/video/file_video_capture_device.h · https://webrtc.org/getting-started/testing |
| **How much we used** | The switch names `--use-fake-device-for-media-stream` and `--use-file-for-fake-video-capture`, and the Y4M header layout. The code that draws the QR code into video frames is our own. |
| **Licence** | Chromium: BSD-3-Clause (we only used switch names, no code) |
| **Added by** | Ravindu |

## WEB-25 · "3 days ago" style times

| | |
|---|---|
| **What it does** | `Intl.RelativeTimeFormat` writes how long ago something happened in plain words ("yesterday", "3 days ago"). |
| **Where we used it** | `web/src/utils/format.js` (`formatTimeAgo`), shown on `web/src/pages/prosumers/PendingActivationsPage.jsx` |
| **Source** | MDN Web Docs — *Intl.RelativeTimeFormat* |
| **Link** | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat |
| **How much we used** | The formatter with `numeric: 'auto'`. Choosing days, hours or minutes is our own. |
| **Added by** | Malith |

## WEB-26 · Refreshing dashboards only when they are visible

| | |
|---|---|
| **What it does** | The Page Visibility API tells a page whether its browser tab is shown. The dashboards refresh their numbers on a timer only while someone can see them, and at once when the user comes back. |
| **Where we used it** | `web/src/hooks/useAutoRefresh.js` (used by the dashboards and the menu counter) |
| **Source** | MDN Web Docs — *Page Visibility API* |
| **Link** | https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API |
| **How much we used** | `document.visibilityState` and the `visibilitychange` event. The timer hook is our own. |
| **Added by** | Malith |

## WEB-27 · Scrolling to a section of the home page

| | |
|---|---|
| **What it does** | `scrollIntoView` moves the page to an element. The "How it works" button uses it because the router already uses the `#` part of the address. |
| **Where we used it** | `web/src/pages/home/HomePage.jsx` |
| **Source** | MDN Web Docs — *Element: scrollIntoView() method* |
| **Link** | https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView |
| **How much we used** | One call with the `behavior` option; it jumps instead of gliding when the user asked for reduced motion. |
| **Added by** | Malith |

## WEB-28 · Google Maps in the web portal

| | |
|---|---|
| **What it does** | The Google Maps JavaScript API shows the station map and the location chooser when a key is set in `web/.env.local`. The official loader downloads the map code only when a map is opened. Coloured "advanced marker" pins show each station, a click or drag reports the position, and a special callback tells us when Google refuses the key. |
| **Where we used it** | `web/src/components/maps/googleMaps.js`, `mapProvider.js`, `GoogleStationMap.jsx`, `GooglePickerMap.jsx`, `web/.env.example` |
| **Source** | Google Maps Platform documentation — *Load the Maps JavaScript API* (`@googlemaps/js-api-loader`, `importLibrary`), *Get started with advanced markers* (map ID, `DEMO_MAP_ID`), *Basic marker customization* (`PinElement` colours), *Advanced markers reference* (`gmp-click`, `gmp-dragend`, `gmpClickable`, `gmpDraggable`), *Events* (`gm_authFailure`), *Error messages* (`RefererNotAllowedMapError`), *API security best practices* (website and API restrictions) |
| **Link** | https://developers.google.com/maps/documentation/javascript/load-maps-js-api · https://developers.google.com/maps/documentation/javascript/advanced-markers/start · https://developers.google.com/maps/documentation/javascript/advanced-markers/basic-customization · https://developers.google.com/maps/documentation/javascript/reference/advanced-markers · https://developers.google.com/maps/documentation/javascript/events · https://developers.google.com/maps/documentation/javascript/error-messages · https://developers.google.com/maps/api-security-best-practices |
| **How much we used** | The loader set-up (`setOptions`, `importLibrary`), the map, marker and pin options, the two marker events and the `gm_authFailure` callback. Choosing between Google Maps and OpenStreetMap, switching over when Google fails, and keeping the key out of Git are our own. The key is restricted to our local web addresses and to the Maps JavaScript API. |
| **Licence** | Documentation: Creative Commons Attribution 4.0, code samples Apache-2.0. The loader package is Apache-2.0. Using the maps follows the Google Maps Platform Terms of Service. |
| **Added by** | Nimthara |

## WEB-29 · Keeping a map failure inside the map (error boundary)

| | |
|---|---|
| **What it does** | A React error boundary catches errors thrown while a part of the page is drawn. If the Google map code fails, only the map is replaced (by OpenStreetMap) instead of the whole page showing the error screen. |
| **Where we used it** | `web/src/components/maps/MapErrorBoundary.jsx`, used by `StationMap.jsx` and `PickerMap.jsx` |
| **Source** | React documentation — *Component*: "Catching rendering errors with an error boundary" (`static getDerivedStateFromError`, `componentDidCatch`) |
| **Link** | https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary |
| **How much we used** | The class shape with the two methods (React has no function-component version). What the boundary shows and the switch to OpenStreetMap are our own. |
| **Licence** | Documentation: Creative Commons Attribution 4.0; React is MIT |
| **Added by** | Nimthara |

## WEB-30 · Switches and bay meters for screen readers

| | |
|---|---|
| **What it does** | The WAI-ARIA patterns say how an on/off switch and a meter should be marked up so screen readers announce them properly ("switch, on" and "8 of 12 bays available"). |
| **Where we used it** | `web/src/components/ui/Switch.jsx` (opening days, open/closed slots), `web/src/pages/stations/BayMeter.jsx` (battery bays) |
| **Source** | W3C WAI — ARIA Authoring Practices Guide: *Switch pattern* and *Meter pattern* |
| **Link** | https://www.w3.org/WAI/ARIA/apg/patterns/switch/ · https://www.w3.org/WAI/ARIA/apg/patterns/meter/ |
| **How much we used** | The roles and attributes: a `<button>` with `role="switch"` and `aria-checked`; `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext`. The clay look is our own. |
| **Licence** | W3C Software and Document License |
| **Added by** | Nimthara |

## WEB-31 · Keeping the chosen list in the address

| | |
|---|---|
| **What it does** | React Router's `useSearchParams` reads and changes the `?tab=` part of the address, so a dashboard number can open the right booking list and the browser's back button works. |
| **Where we used it** | `web/src/pages/reservations/ReservationsPage.jsx` |
| **Source** | React Router — *useSearchParams* (the `setSearchParams` navigate options, such as `replace`, are listed in the library's own type definition `SetURLSearchParams`) |
| **Link** | https://reactrouter.com/api/hooks/useSearchParams |
| **How much we used** | Reading `tab` and setting it with `{ replace: true }`. The tab names and what each tab asks the API for are our own. |
| **Licence** | MIT |
| **Added by** | Hamnad |

## WEB-32 · Copying the QR code text

| | |
|---|---|
| **What it does** | `navigator.clipboard.writeText()` puts text on the clipboard. Staff can copy a booking's code text and paste it on the check-in page when the prosumer cannot show the QR code. It only works on secure pages (such as `localhost`), so the page shows a message when copying is not allowed. |
| **Where we used it** | `web/src/components/qr/QrCodeCard.jsx` |
| **Source** | MDN Web Docs — *Clipboard: writeText() method* |
| **Link** | https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText |
| **How much we used** | One `writeText` call with error handling. |
| **Added by** | Hamnad |
