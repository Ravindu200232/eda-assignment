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
| leaflet | 1.9.4 | Web app (stations) | Interactive maps | BSD-2-Clause | https://www.npmjs.com/package/leaflet |
| react-leaflet | 5.0.0 | Web app (stations) | Leaflet maps as React components | Hippocratic-2.1 (free to use, but forbids use that harms human rights) | https://www.npmjs.com/package/react-leaflet |

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
