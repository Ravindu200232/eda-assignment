# Android App — Code Sources

Every entry below is referenced in the code with a comment such as `// Source: AND-09`.
All links were opened and checked when the entry was written (September 2026).
Numbers were given when the Android work was planned, and each team member adds their entries in their own pull request.
Android Developers pages are published under the Creative Commons Attribution 4.0 licence and their code samples under Apache 2.0, so they are free to reuse with credit.

---

## AND-01 · Android project and Gradle set-up

| | |
|---|---|
| **What it does** | Explains how an Android Studio project is put together (settings file, root build file, `app` module) and how the build is described in Kotlin, including the version catalog that keeps every library version in one file. |
| **Where we used it** | `android/settings.gradle.kts`, `android/build.gradle.kts`, `android/app/build.gradle.kts`, `android/gradle/libs.versions.toml`, `android/gradle.properties` |
| **Source** | Android Developers — *Android build overview* · Gradle — *Sharing dependency versions between projects* |
| **Link** | https://developer.android.com/build/gradle-build-overview · https://docs.gradle.org/current/userguide/platforms.html |
| **How much we used** | The shape of the three build files and the `libs.versions.toml` format. The SDK levels, library list and the way we read `local.properties` are our own. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-02 · The "clay" look on Android

| | |
|---|---|
| **What it does** | The same written design guide the web portal uses: pale lavender background, violet and pink accents, very round corners, soft layered shadows, floating background blobs and buttons that squish when pressed. |
| **Where we used it** | `res/values/colors.xml`, `dimens.xml`, `styles.xml`, `themes.xml`, `res/drawable/bg_*.xml`, `res/animator/clay_press.xml`, `res/color/*.xml`, and every layout in `res/layout/` |
| **Source** | Design Prompts — *Clay* style (the same source as WEB-01 in `web-sources.md`) |
| **Link** | https://www.designprompts.dev/claymorphism |
| **How much we used** | The colour codes, shadow recipes, corner sizes and the press animation, turned by hand into Android themes, styles and drawables so the phone app matches the web portal. |
| **Licence** | No licence is stated on the site. The prompt is offered for use in building interfaces, and we credit it here. |
| **Added by** | Ravindu |

## AND-03 · Keeping the Maps key and the API address out of Git

| | |
|---|---|
| **What it does** | Shows the usual way to keep a key out of the repository: put it in `local.properties` (which Git ignores), read it in the build file and pass it on as a manifest placeholder or a `BuildConfig` value. |
| **Where we used it** | `android/app/build.gradle.kts`, `android/local.properties.example`, `AndroidManifest.xml` (the Maps key placeholder is added with Nimthara's map work) |
| **Source** | Google Maps Platform — *Use the Secrets Gradle Plugin* · Android Developers — *Inject build variables into the manifest* |
| **Link** | https://developers.google.com/maps/documentation/android-sdk/secrets-gradle-plugin · https://developer.android.com/build/manage-manifests |
| **How much we used** | The idea and the `manifestPlaceholders` / `buildConfigField` lines. We read `local.properties` with a few lines of Kotlin instead of adding the plugin, so the build has one dependency less. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-04 · The two fonts (Nunito and DM Sans)

| | |
|---|---|
| **What it does** | The heading and body fonts of the app, bundled with the APK so it looks the same on every phone, and the Android way of describing a font family in XML. |
| **Where we used it** | `res/font/nunito.ttf`, `res/font/dm_sans.ttf`, `res/font/heading.xml`, `heading_black.xml`, `body.xml`, `body_medium.xml`, `body_bold.xml`, `android/licenses/OFL-Nunito.txt`, `OFL-DMSans.txt` |
| **Source** | Google Fonts — *Nunito* and *DM Sans* · Android Developers — *Fonts in XML* |
| **Link** | https://fonts.google.com/specimen/Nunito · https://fonts.google.com/specimen/DM+Sans · https://developer.android.com/develop/ui/views/text-and-emoji/fonts-in-xml |
| **How much we used** | The two font files as they are, and the `<font-family>` file format. The weights we picked and where each font is used are our own. |
| **Licence** | SIL Open Font License 1.1 (both fonts). The licence text is kept in `android/licenses/`. |
| **Added by** | Ravindu |

## AND-05 · Material Components for Android (theme, buttons, cards, text fields)

| | |
|---|---|
| **What it does** | The widget library behind our buttons, cards, chips, text fields, dialogs and the bottom bar, and the documentation that says which theme attributes control their colours and shapes. |
| **Where we used it** | `res/values/themes.xml`, `styles.xml`, and every layout that uses `MaterialButton`, `MaterialCardView`, `TextInputLayout` or `MaterialAlertDialogBuilder` |
| **Source** | Material Components for Android — *Color theming*, *Text fields*, *Buttons* |
| **Link** | https://github.com/material-components/material-components-android/blob/master/docs/theming/Color.md · https://github.com/material-components/material-components-android/blob/master/docs/components/TextField.md |
| **How much we used** | The list of theme attributes (`colorPrimary`, `shapeAppearance*`, `materialButtonStyle`, `textInputStyle`, …) and the widget names. Every value in our styles comes from AND-02. |
| **Licence** | Apache 2.0 |
| **Added by** | Ravindu |

## AND-06 · Icons (Lucide drawn as Android vectors)

| | |
|---|---|
| **What it does** | Lucide is the icon set the web portal uses. Android needs the same drawings as `VectorDrawable` XML files, which have their own tag and path format. |
| **Where we used it** | `android/scripts/make-icons.mjs` and the `res/drawable/ic_*.xml` files it writes (each member adds the icons of their screens) |
| **Source** | Lucide — *Icons* · Android Developers — *Vector drawables overview* |
| **Link** | https://lucide.dev/icons/ · https://developer.android.com/develop/ui/views/graphics/vector-drawable-resources |
| **How much we used** | The icon shapes (path data) from the Lucide package that is already installed for the web portal, and the `<vector>` file format. The converter script is ours. |
| **Licence** | ISC (Lucide) — https://github.com/lucide-icons/lucide/blob/main/LICENSE |
| **Added by** | Ravindu |

## AND-07 · The app icon (adaptive launcher icon)

| | |
|---|---|
| **What it does** | Explains the two layers (background and foreground) that Android uses to draw a launcher icon in any shape, plus the monochrome layer for themed icons. |
| **Where we used it** | `res/mipmap-anydpi/ic_launcher.xml`, `ic_launcher_round.xml`, `res/drawable/ic_launcher_background.xml`, `ic_launcher_foreground.xml`, `ic_launcher_monochrome.xml` |
| **Source** | Android Developers — *Create app icons (adaptive icons)* |
| **Link** | https://developer.android.com/develop/ui/views/launch/icon_design_adaptive |
| **How much we used** | The file layout, the sizes and the safe area rules. The sun drawing is ours, in the colours of AND-02. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-08 · Allowing plain HTTP only for the local API

| | |
|---|---|
| **What it does** | Android blocks plain `http://` traffic by default. A network security configuration file allows it for named hosts only, which is what we need for the IIS server on the development machine. |
| **Where we used it** | `res/xml/network_security_config.xml`, `AndroidManifest.xml` |
| **Source** | Android Developers — *Network security configuration* |
| **Link** | https://developer.android.com/privacy-and-security/security-config |
| **How much we used** | The file format and the `cleartextTrafficPermitted` rule. We list only `10.0.2.2`, `localhost` and `127.0.0.1`; everything else must use HTTPS. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-09 · Saving data on the phone with SQLite

| | |
|---|---|
| **What it does** | The plain Android way of using SQLite: a helper class that creates the tables, `ContentValues` for writing and a `Cursor` for reading. The brief asks for SQLite without a wrapper such as Room. |
| **Where we used it** | `data/local/SolarGridDbHelper.java`, `data/local/SessionDao.java` (each member adds their own table and DAO) |
| **Source** | Android Developers — *Save data using SQLite* |
| **Link** | https://developer.android.com/training/data-storage/sqlite |
| **How much we used** | The `SQLiteOpenHelper` pattern with `onCreate`/`onUpgrade`, and the insert, query and delete calls. The tables, the single-row session rule and the DAO classes are ours. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-10 · The bottom bar and swapping screens

| | |
|---|---|
| **What it does** | The bottom navigation bar and the fragment manager that puts the chosen screen into the frame above it. |
| **Where we used it** | `ui/prosumer/MainActivity.java`, `ui/operator/OperatorActivity.java`, `res/layout/activity_main.xml`, `activity_operator.xml`, `res/menu/nav_prosumer.xml`, `nav_operator.xml` |
| **Source** | Material Components — *Bottom navigation* · Android Developers — *Fragment manager* |
| **Link** | https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md · https://developer.android.com/guide/fragments/fragmentmanager |
| **How much we used** | The menu file format, `setOnItemSelectedListener` and the `replace()` transaction. The tabs, the tags that stop a screen being built twice and the placeholder screens are ours. |
| **Licence** | Apache 2.0 / CC BY 4.0 |
| **Added by** | Ravindu |

## AND-11 · Reading the booking QR code

| | |
|---|---|
| **What it does** | A camera scanner built on ZXing. `ScanContract` opens the scanner screen and gives back the text that was read. |
| **Where we used it** | `ui/operator/ScanFragment.java`, `res/layout/fragment_scan.xml` |
| **Source** | ZXing Android Embedded (journeyapps) — README |
| **Link** | https://github.com/journeyapps/zxing-android-embedded |
| **How much we used** | The `ScanContract` and `ScanOptions` lines from the README (about six lines). What happens with the code afterwards, and the typed-code way in, are ours. |
| **Licence** | Apache 2.0 (the library builds on ZXing, also Apache 2.0) |
| **Added by** | Ravindu |

## AND-12 · Asking for the camera at the right moment

| | |
|---|---|
| **What it does** | The modern way to ask for a permission and to open another screen for a result, using `registerForActivityResult` instead of the old request codes. |
| **Where we used it** | `ui/operator/ScanFragment.java` |
| **Source** | Android Developers — *Request runtime permissions* and *Getting a result from an activity* |
| **Link** | https://developer.android.com/training/permissions/requesting · https://developer.android.com/training/basics/intents/result |
| **How much we used** | The two `registerForActivityResult` calls and the check before asking. The message we show when the operator says no is ours. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-13 · Running Android code in a normal unit test (Robolectric)

| | |
|---|---|
| **What it does** | Lets tests use real Android classes (SQLite, loopers, resources) on the computer, with no emulator, so the whole team can run them quickly. |
| **Where we used it** | `app/src/test/java/**` (`SessionDaoTest`, `AuthRepositoryTest`, `CheckInRepositoryTest`, `testing/TestWait.java`), `app/src/test/resources/robolectric.properties` |
| **Source** | Robolectric — *Getting started* and *Looper mode* |
| **Link** | https://robolectric.org/ |
| **How much we used** | The `@RunWith(RobolectricTestRunner.class)` set-up, the `sdk=` setting and `ShadowLooper.shadowMainLooper().idle()` for answers that come back on the main thread. The tests are ours. |
| **Licence** | MIT |
| **Added by** | Ravindu |

## AND-14 · A stand-in Web API for the tests (MockWebServer)

| | |
|---|---|
| **What it does** | A small web server inside the test that answers with whatever JSON the test wants, so the tests never need MongoDB, IIS or a network. |
| **Where we used it** | `app/src/test/java/lk/sliit/solargrid/testing/FakeApi.java`, `Samples.java`, and the repository tests |
| **Source** | OkHttp — *MockWebServer* |
| **Link** | https://github.com/square/okhttp/tree/master/mockwebserver |
| **How much we used** | Starting the server, `enqueue(MockResponse …)` and `takeRequest()`. The answers are copies of what the real API sends. |
| **Licence** | Apache 2.0 |
| **Added by** | Ravindu |

## AND-15 · Tests that tap through the app (Espresso)

| | |
|---|---|
| **What it does** | Runs the app on the emulator and taps, types and checks what is on the screen. |
| **Where we used it** | `app/src/androidTest/java/**` |
| **Source** | Android Developers — *Espresso basics* |
| **Link** | https://developer.android.com/training/testing/espresso |
| **How much we used** | The `onView(withId(…)).perform(click())` style and the `ActivityScenario` rule. The test steps follow our own screens. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-16 · Making the tests wait for the server, not the clock

| | |
|---|---|
| **What it does** | An idling resource tells Espresso that the app is still busy, so a test waits for a request to finish instead of sleeping for a guessed number of seconds. |
| **Where we used it** | `util/Idling.java` (the counter in the app) and `app/src/androidTest/java/lk/sliit/solargrid/testing/ApiIdlingResource.java` |
| **Source** | Android Developers — *Espresso idling resources* |
| **Link** | https://developer.android.com/training/testing/espresso/idling-resource |
| **How much we used** | The `IdlingResource` interface and how it is registered. The counter is ours, and the app keeps no test code of its own beyond it. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-17 · Calling the Web API (Retrofit)

| | |
|---|---|
| **What it does** | Turns a Java interface into HTTP calls and reads the JSON answers with Gson. |
| **Where we used it** | `data/remote/SolarGridApi.java`, `ApiClient.java`, `ApiCalls.java`, every DTO in `data/remote/dto/` |
| **Source** | Retrofit — README and *A Simple Example* |
| **Link** | https://github.com/square/retrofit · https://github.com/square/retrofit/blob/trunk/README.md |
| **How much we used** | The annotation style (`@GET`, `@POST`, `@Path`, `@Body`), the `Retrofit.Builder` lines and `enqueue` with a callback. The endpoints, the DTOs and our `ApiCallback` are ours. |
| **Licence** | Apache 2.0 |
| **Added by** | Ravindu |

## AND-18 · The token header, timeouts and safe logging (OkHttp)

| | |
|---|---|
| **What it does** | Interceptors sit between the app and the network. Ours adds the `Authorization` header and notices when the API refuses the token. The logging interceptor writes the request line while developing. |
| **Where we used it** | `data/remote/AuthInterceptor.java`, `data/remote/ApiClient.java` |
| **Source** | OkHttp — *Interceptors* |
| **Link** | https://github.com/square/okhttp/blob/master/docs/features/interceptors.md |
| **How much we used** | The shape of an interceptor (`chain.request()`, `chain.proceed()`), the timeout settings and `redactHeader` so the token is never printed. What we do on a 401 is ours. |
| **Licence** | Apache 2.0 |
| **Added by** | Ravindu |

## AND-19 · Reading the error answers of the API

| | |
|---|---|
| **What it does** | Our Web API sends errors in the "problem details" shape: a `title`, a `status`, a `detail` sentence and, for forms, a list of messages per field. The app shows those words instead of writing its own. |
| **Where we used it** | `data/remote/ApiError.java`, `data/remote/dto/ProblemDetails.java` |
| **Source** | RFC 9457 — *Problem Details for HTTP APIs* · Microsoft Learn — *Handle errors in ASP.NET Core web APIs* |
| **Link** | https://datatracker.ietf.org/doc/html/rfc9457 · https://learn.microsoft.com/en-us/aspnet/core/web-api/handle-errors |
| **How much we used** | The field names of the error body. The reading, the field-name change from `FullName` to `fullName` and the fallback sentences are ours, and they match the web portal (WEB-05). |
| **Licence** | IETF Trust (RFC text) / CC BY 4.0 (Microsoft Learn) |
| **Added by** | Ravindu |

## AND-20 · Dates and times (java.time)

| | |
|---|---|
| **What it does** | The API sends times in UTC; the app shows them in Sri Lankan time. `java.time` is available from Android 8.0, which is our lowest supported version, so no extra library is needed. |
| **Where we used it** | `util/Times.java` and every screen that shows a slot |
| **Source** | Android Developers — *java.time package* and *Java 8+ APIs available through desugaring* |
| **Link** | https://developer.android.com/reference/java/time/package-summary · https://developer.android.com/studio/write/java8-support-table |
| **How much we used** | `Instant`, `ZoneId`, `ZonedDateTime` and `DateTimeFormatter`, plus the table that told us minSdk 26 needs no desugaring. The formats and the "in 3 hours" wording are ours. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-21 · Doing slow work off the screen thread

| | |
|---|---|
| **What it does** | Database work runs on a background thread and the answer is posted back to the main thread, so the screen never freezes. |
| **Where we used it** | `AppContainer.java`, `session/SessionStore.java` |
| **Source** | Android Developers — *Run Android tasks in background threads* |
| **Link** | https://developer.android.com/develop/background-work/background-tasks/asynchronous/java-threads |
| **How much we used** | The `ExecutorService` plus `Handler(Looper.getMainLooper())` pattern (about five lines). The session rules are ours. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-22 · Taking the screenshots for the report

| | |
|---|---|
| **What it does** | UiAutomator can save a picture of whatever is on the screen, so the report screenshots are taken by a test instead of by hand and can be taken again after any change. |
| **Where we used it** | `app/src/androidTest/java/lk/sliit/solargrid/screens/ScreensTest.java`, `android/scripts/take-screenshots.ps1` |
| **Source** | Android Developers — *Write automated tests with UI Automator* |
| **Link** | https://developer.android.com/training/testing/other-components/ui-automator |
| **How much we used** | `UiDevice.getInstance(...).takeScreenshot(file)` and the app folder on the phone that `adb pull` copies from. The walk through the screens is ours. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-23 · Reaching the API on the local network (Android 17)

| | |
|---|---|
| **What it does** | From Android 17, an app that targets it cannot open a connection to an address on the local network (a home or campus Wi-Fi, or the computer that runs the emulator at `10.0.2.2`) until the user allows the "Nearby devices" permission `ACCESS_LOCAL_NETWORK`. Without it the connection simply hangs. |
| **Where we used it** | `util/LocalNetwork.java`, `ui/common/BaseActivity.java` (`withLocalNetwork`), `ui/auth/SplashActivity.java`, `ui/auth/LoginActivity.java`, `AndroidManifest.xml`, `live/LiveApiTest.java` |
| **Source** | Android Developers — *Local network permission* |
| **Link** | https://developer.android.com/privacy-and-security/local-network-permission |
| **How much we used** | The permission name, the rule that it is enforced for apps targeting Android 17, and which addresses count as local. The check of the API address and when we ask are ours. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-24 · Keeping the login token out of backups

| | |
|---|---|
| **What it does** | Android can copy app data into a cloud backup or onto a new phone. Two rule files say which data may leave the phone: one for Android 12 and newer, one for older versions. |
| **Where we used it** | `res/xml/data_extraction_rules.xml`, `res/xml/backup_rules.xml`, `AndroidManifest.xml` |
| **Source** | Android Developers — *Back up user data with Auto Backup* |
| **Link** | https://developer.android.com/identity/data/autobackup |
| **How much we used** | The two file formats and the `exclude` rules. Leaving out the database, preferences and files (because the database holds a login token) is our decision. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Ravindu |

## AND-25 · Lists of bookings (RecyclerView)

| | |
|---|---|
| **What it does** | Shows a list by building only the rows on screen and reusing them while the user scrolls. |
| **Where we used it** | `ui/prosumer/BookingSummaryAdapter.java`, `ui/prosumer/HomeFragment.java`, `res/layout/item_booking_summary.xml` |
| **Source** | Android Developers — *Create dynamic lists with RecyclerView* |
| **Link** | https://developer.android.com/develop/ui/views/layout/recyclerview |
| **How much we used** | The adapter and view holder pattern and `LinearLayoutManager`. The card layout and what each row shows are ours. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Malith |

## AND-26 · Pull down to refresh

| | |
|---|---|
| **What it does** | Lets the prosumer pull the home screen down to load the newest numbers, with the usual spinning circle. |
| **Where we used it** | `res/layout/fragment_home.xml`, `ui/prosumer/HomeFragment.java` |
| **Source** | Android Developers — *Add swipe-to-refresh to your app* |
| **Link** | https://developer.android.com/develop/ui/views/touch-and-input/swipe/add-swipe-interface |
| **How much we used** | The `SwipeRefreshLayout` wrapper, `setOnRefreshListener` and `setRefreshing`. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Malith |

## AND-27 · A confirmation dialog that asks for the password

| | |
|---|---|
| **What it does** | A dialog can hold a small form of its own. Taking over the click of its main button keeps the dialog open when the password is wrong, so the prosumer can read the reason and try again. |
| **Where we used it** | `ui/common/AccountFragment.java` (deactivating the account), `res/layout/dialog_password.xml` |
| **Source** | Android Developers — *Dialogs* · Material Components — *Dialogs* |
| **Link** | https://developer.android.com/develop/ui/views/components/dialogs · https://github.com/material-components/material-components-android/blob/master/docs/components/Dialog.md |
| **How much we used** | `setView` with our own layout and `getButton(BUTTON_POSITIVE)` after `show()`. What the dialog checks and says is ours. |
| **Licence** | CC BY 4.0 / Apache 2.0 |
| **Added by** | Malith |

## AND-28 · Where the phone is (fused location)

| | |
|---|---|
| **What it does** | Google Play services works out the phone's place from GPS, Wi-Fi and the mobile network, and gives one fresh answer when asked. |
| **Where we used it** | `util/LocationFinder.java`, `ui/map/StationsFragment.java` |
| **Source** | Android Developers — *Get the current location* |
| **Link** | https://developer.android.com/develop/sensors-and-location/location/retrieve-current |
| **How much we used** | `getFusedLocationProviderClient(...).getCurrentLocation(PRIORITY_BALANCED_POWER_ACCURACY, token)` and the permission check before it. The Colombo fallback and the fixed place used by the tests are ours. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Nimthara |

## AND-29 · The map of nearby stations (Google Maps SDK for Android)

| | |
|---|---|
| **What it does** | Shows a Google map inside the app, with a marker for each station. The key is read from `local.properties` and placed in the manifest at build time (AND-03). |
| **Where we used it** | `ui/map/StationsFragment.java`, `res/layout/fragment_stations.xml`, `AndroidManifest.xml` (the key), `app/build.gradle.kts` |
| **Source** | Google Maps Platform — *Maps SDK for Android: Set up* and *Markers* |
| **Link** | https://developers.google.com/maps/documentation/android-sdk/start · https://developers.google.com/maps/documentation/android-sdk/marker |
| **How much we used** | `SupportMapFragment`, `getMapAsync`, `addMarker` with coloured default markers, the marker click listener, `moveCamera` and the "my location" layer. The station card, the list view and the missing-key fallback are ours. |
| **Licence** | Google Maps Platform Terms of Service (the SDK); CC BY 4.0 / Apache 2.0 (documentation) |
| **Added by** | Nimthara |

## AND-30 · Picking a station and a day (dropdown and chips)

| | |
|---|---|
| **What it does** | A text box that opens a list of stations for the operator, and a row of single-choice chips for the seven days of slots. |
| **Where we used it** | `ui/operator/BaysFragment.java`, `res/layout/fragment_bays.xml`, `ui/map/StationDetailsActivity.java` |
| **Source** | Material Components — *Menus (exposed dropdown)* and *Chips* |
| **Link** | https://github.com/material-components/material-components-android/blob/master/docs/components/Menu.md · https://github.com/material-components/material-components-android/blob/master/docs/components/Chip.md |
| **How much we used** | `MaterialAutoCompleteTextView` with `setSimpleItems`, and a `ChipGroup` with single selection. |
| **Licence** | Apache 2.0 |
| **Added by** | Nimthara |

## AND-31 · "1 bay" and "12 bays" (plural strings)

| | |
|---|---|
| **What it does** | Android picks the right form of a sentence for a number, so the app writes "1 of 1 bay free" and "9 of 12 bays free". |
| **Where we used it** | `res/values/strings.xml` (`station_bays_free`, `slot_bays_free`, `bays_saved`), `ui/map/StationTexts.java`, `ui/map/StationDetailsActivity.java`, `ui/operator/BaysFragment.java` |
| **Source** | Android Developers — *String resources: Quantity strings (plurals)* |
| **Link** | https://developer.android.com/guide/topics/resources/string-resource |
| **How much we used** | The `<plurals>` format and `getQuantityString`. |
| **Licence** | CC BY 4.0 (text) / Apache 2.0 (samples) |
| **Added by** | Nimthara |
