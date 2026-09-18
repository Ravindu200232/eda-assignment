# Libraries We Installed

A *library* (or *package*) is ready-made code that we download instead of writing it ourselves.
The versions below are the exact ones in the project files. Licences were read from each package's
official NuGet page / package metadata.

## Web API (C#, from nuget.org)

| Library | Version | Used in | What it does (plain English) | Licence | Link |
|---|---|---|---|---|---|
| MongoDB.Driver | 3.11.2 | API | Lets the C# code read and write data in MongoDB | Apache-2.0 | https://www.nuget.org/packages/MongoDB.Driver |
| Microsoft.AspNetCore.Authentication.JwtBearer | 10.0.12 | API | Checks the login token sent with each request | MIT | https://www.nuget.org/packages/Microsoft.AspNetCore.Authentication.JwtBearer |
| Swashbuckle.AspNetCore | 10.2.3 | API | Builds the Swagger page for trying the API in a browser | MIT | https://www.nuget.org/packages/Swashbuckle.AspNetCore |
| BCrypt.Net-Next | 4.2.0 | API | Stores passwords as safe one-way hashes | MIT | https://www.nuget.org/packages/BCrypt.Net-Next |

## API tests

| Library | Version | Used in | What it does (plain English) | Licence | Link |
|---|---|---|---|---|---|
| xunit | 2.9.3 | Unit + E2E tests | The testing framework that runs our automatic checks | Apache-2.0 | https://www.nuget.org/packages/xunit |
| xunit.runner.visualstudio | 3.1.4 | Unit + E2E tests | Lets Visual Studio and `dotnet test` find the tests | Apache-2.0 | https://www.nuget.org/packages/xunit.runner.visualstudio |
| Microsoft.NET.Test.Sdk | 17.14.1 | Unit + E2E tests | The .NET test platform | MIT | https://www.nuget.org/packages/Microsoft.NET.Test.Sdk |
| coverlet.collector | 6.0.4 | Unit + E2E tests | Measures how much of the code the tests run | MIT | https://www.nuget.org/packages/coverlet.collector |
| NSubstitute | 6.2.0 | Unit tests | Creates fake repositories so rules can be tested without a database | BSD-3-Clause | https://www.nuget.org/packages/NSubstitute |
| Microsoft.Extensions.TimeProvider.Testing | 10.10.0 | Unit tests | A fake clock, so "7 days" and "12 hours" rules can be tested at any time | MIT | https://www.nuget.org/packages/Microsoft.Extensions.TimeProvider.Testing |
| Microsoft.AspNetCore.Mvc.Testing | 10.0.12 | E2E tests | Starts the complete API inside the test run | MIT | https://www.nuget.org/packages/Microsoft.AspNetCore.Mvc.Testing |

## Web app (JavaScript, from npmjs.com)

Licences were read from each package's `package.json` in `web/node_modules`.

| Library | Version | Used in | What it does (plain English) | Licence | Link |
|---|---|---|---|---|---|
| react, react-dom | 19.3.0 | Web app | Builds the pages from components | MIT | https://www.npmjs.com/package/react |
| react-router | 8.4.0 | Web app | Connects web addresses to pages | MIT | https://www.npmjs.com/package/react-router |
| axios | 1.20.0 | Web app | Sends requests to the Web API | MIT | https://www.npmjs.com/package/axios |
| tailwindcss, @tailwindcss/vite | 4.3.3 | Web app | Styling with short class names and our theme tokens | MIT | https://www.npmjs.com/package/tailwindcss |
| @fontsource-variable/nunito | 5.3.0 | Web app | Heading font, packaged with the app | OFL-1.1 | https://www.npmjs.com/package/@fontsource-variable/nunito |
| @fontsource-variable/dm-sans | 5.3.0 | Web app | Body text font, packaged with the app | OFL-1.1 | https://www.npmjs.com/package/@fontsource-variable/dm-sans |
| lucide-react | 1.46.0 | Web app | Line icons | ISC | https://www.npmjs.com/package/lucide-react |
| @zxing/browser | 0.2.1 | Web app (check-in) | Reads QR codes from the camera | MIT | https://www.npmjs.com/package/@zxing/browser |
| @zxing/library | 0.23.0 | Web app, browser tests | Barcode engine used by @zxing/browser; our tests also use it to draw QR codes | Apache-2.0 | https://www.npmjs.com/package/@zxing/library |
| qrcode.react | 4.2.0 | Web app (bookings) | Draws a booking's QR code | ISC | https://www.npmjs.com/package/qrcode.react |
| leaflet | 1.9.4 | Web app (stations) | Interactive OpenStreetMap maps when Google Maps is not used | BSD-2-Clause | https://www.npmjs.com/package/leaflet |
| @googlemaps/js-api-loader | 2.1.1 | Web app (stations) | Loads the Google Maps code only when a map is opened | Apache-2.0 | https://www.npmjs.com/package/@googlemaps/js-api-loader |

We first installed `react-leaflet` (Leaflet maps as React components). Its Hippocratic-2.1 licence adds conditions beyond the usual open-source terms, so it was removed and the maps use plain Leaflet.

## Online services used by the web app

| Service | Used for | Terms |
|---|---|---|
| Google Maps JavaScript API | Station map and location chooser when `VITE_GOOGLE_MAPS_API_KEY` is set in `web/.env.local` | Google Maps Platform Terms of Service; the key is restricted to our local web addresses |
| OpenStreetMap tile service | Map pictures for the Leaflet maps | OSMF Tile Usage Policy; data under the Open Database License |

## Web app tests and build tools

| Library | Version | Used in | What it does (plain English) | Licence | Link |
|---|---|---|---|---|---|
| vite | 8.3.0 | Build | Runs the app during development and builds the final files | MIT | https://www.npmjs.com/package/vite |
| @vitejs/plugin-react | 6.1.1 | Build | Lets Vite understand React (JSX) | MIT | https://www.npmjs.com/package/@vitejs/plugin-react |
| eslint, @eslint/js, globals | 10.10.0 / 10.0.1 / 17.12.0 | Code checks | Finds mistakes and unused code | MIT | https://www.npmjs.com/package/eslint |
| eslint-plugin-react-hooks | 7.1.1 | Code checks | Checks the rules of React hooks | MIT | https://www.npmjs.com/package/eslint-plugin-react-hooks |
| eslint-plugin-react-refresh | 0.5.7 | Code checks | Keeps files compatible with instant reload | MIT | https://www.npmjs.com/package/eslint-plugin-react-refresh |
| vitest | 5.0.1 | Unit tests | Runs the unit tests | MIT | https://www.npmjs.com/package/vitest |
| jsdom | 30.0.1 | Unit tests | A pretend browser page for unit tests | MIT | https://www.npmjs.com/package/jsdom |
| @testing-library/react | 16.3.3 | Unit tests | Draws components and finds elements like a user would | MIT | https://www.npmjs.com/package/@testing-library/react |
| @testing-library/user-event | 14.6.7 | Unit tests | Simulates typing and clicking | MIT | https://www.npmjs.com/package/@testing-library/user-event |
| @testing-library/jest-dom | 7.0.1 | Unit tests | Readable checks such as "is visible" | MIT | https://www.npmjs.com/package/@testing-library/jest-dom |
| @types/react, @types/react-dom | 19.3.0 | Editor help | Type hints for React in the code editor | MIT | https://www.npmjs.com/package/@types/react |
| @playwright/test | 1.63.0 | Browser tests | Drives Chromium through the portal | Apache-2.0 | https://www.npmjs.com/package/@playwright/test |
| mongodb | 7.6.0 | Browser tests | Deletes the temporary test database | Apache-2.0 | https://www.npmjs.com/package/mongodb |

## Android app (Java, from Google Maven and Maven Central)

Versions come from `android/gradle/libs.versions.toml`.

| Library | Version | Used in | What it does (plain English) | Licence | Link |
|---|---|---|---|---|---|
| androidx.appcompat:appcompat | 1.7.1 | Android app | Screens and menus that work the same on older Android versions | Apache-2.0 | https://developer.android.com/jetpack/androidx/releases/appcompat |
| com.google.android.material:material | 1.13.0 | Android app | Buttons, cards, text boxes, dialogs and the bottom bar | Apache-2.0 | https://github.com/material-components/material-components-android |
| androidx.constraintlayout:constraintlayout | 2.2.1 | Android app | Lays out a screen by describing how views relate to each other | Apache-2.0 | https://developer.android.com/jetpack/androidx/releases/constraintlayout |
| androidx.recyclerview:recyclerview | 1.4.0 | Android app | Long lists that reuse rows while scrolling | Apache-2.0 | https://developer.android.com/jetpack/androidx/releases/recyclerview |
| androidx.swiperefreshlayout:swiperefreshlayout | 1.1.0 | Android app | "Pull down to refresh" on the dashboard and lists | Apache-2.0 | https://developer.android.com/jetpack/androidx/releases/swiperefreshlayout |
| androidx.lifecycle:lifecycle-viewmodel, lifecycle-livedata | 2.9.4 | Android app | Keeps screen data alive when the phone is turned | Apache-2.0 | https://developer.android.com/jetpack/androidx/releases/lifecycle |
| com.squareup.retrofit2:retrofit | 2.11.0 | Android app | Turns a Java interface into calls to the Web API | Apache-2.0 | https://github.com/square/retrofit |
| com.squareup.retrofit2:converter-gson | 2.11.0 | Android app | Reads the JSON answers into Java objects | Apache-2.0 | https://github.com/square/retrofit |
| com.squareup.okhttp3:okhttp | 4.12.0 | Android app | Sends the HTTP requests, with timeouts and the token header | Apache-2.0 | https://github.com/square/okhttp |
| com.squareup.okhttp3:logging-interceptor | 4.12.0 | Android app (debug) | Writes the request line to Logcat while developing | Apache-2.0 | https://github.com/square/okhttp |
| com.google.code.gson:gson | 2.11.0 | Android app | Reads the error answers of the API | Apache-2.0 | https://github.com/google/gson |
| com.google.android.gms:play-services-maps | 19.2.0 | Android app | The Google map with the station markers | Google Maps Platform Terms of Service | https://developers.google.com/maps/documentation/android-sdk/overview |
| com.google.android.gms:play-services-location | 21.3.0 | Android app | Finds where the phone is for the map | Android Software Development Kit License | https://developers.google.com/android/guides/setup |
| com.journeyapps:zxing-android-embedded | 4.3.0 | Android app | The camera screen that reads a QR code | Apache-2.0 | https://github.com/journeyapps/zxing-android-embedded |
| com.google.zxing:core | 3.5.3 | Android app | The barcode reading and drawing engine behind it | Apache-2.0 | https://github.com/zxing/zxing |

## Android tests

| Library | Version | Used in | What it does (plain English) | Licence | Link |
|---|---|---|---|---|---|
| junit:junit | 4.13.2 | All Android tests | The testing framework | EPL-1.0 | https://github.com/junit-team/junit4 |
| org.robolectric:robolectric | 4.16 | Unit tests | Runs Android code (SQLite, layouts) on the computer, with no emulator | MIT | https://robolectric.org |
| androidx.test:core, runner, rules | 1.7.0 | Android tests | Starts screens and runs the tests on a phone | Apache-2.0 | https://developer.android.com/jetpack/androidx/releases/test |
| androidx.test.ext:junit | 1.3.0 | Android tests | Joins JUnit 4 and the Android test runner | Apache-2.0 | https://developer.android.com/jetpack/androidx/releases/test |
| androidx.test.espresso:espresso-core, contrib, intents | 3.7.0 | Emulator tests | Taps, types and checks what is on the screen | Apache-2.0 | https://developer.android.com/training/testing/espresso |
| androidx.test.uiautomator:uiautomator | 2.3.0 | Emulator tests | Works across apps, for example with the system keyboard | Apache-2.0 | https://developer.android.com/training/testing/other-components/ui-automator |
| androidx.test.services:test-services | 1.6.0 | Emulator tests | Carries the screenshots off the phone into the build folder | Apache-2.0 | https://developer.android.com/jetpack/androidx/releases/test |
| com.squareup.okhttp3:mockwebserver | 4.12.0 | Android tests | A stand-in Web API that answers with our own JSON | Apache-2.0 | https://github.com/square/okhttp |

## Tools (not part of the code)

| Tool | Version | Purpose |
|---|---|---|
| .NET SDK | 10.0.401 | Builds and runs the API |
| ASP.NET Core Hosting Bundle | 10.0.12 | Lets IIS run the API |
| MongoDB Community Server | 8.3 | The database |
| MongoDB Compass | 1.50 | Viewing the data during development |
| GitHub CLI | 2.101.0 | Creating pull requests |
| Node.js | 24.19.0 | Runs the web build and tests |
| npm | 11.17.0 | Installs the web libraries |
| Playwright Chromium | build 1243 (`npx playwright install chromium`) | Browser used by the web browser tests |
| Android Studio | 2026.1.4 (Otter 3) | Writing, running and debugging the Android app |
| Android Gradle plugin | 9.4.0 | Builds the Android app |
| Gradle | 9.6.0 | The build tool the Android project uses |
| Android SDK platform | 37 | The Android version the app is compiled against |
| Android emulator | Pixel 10, API 37 | The pretend phone the Android tests run on |
| Nunito, DM Sans | Google Fonts (OFL-1.1) | The two fonts bundled with the Android app |
| Lucide icons | 0.556.0 (via the web app) | The icon set both apps use |
