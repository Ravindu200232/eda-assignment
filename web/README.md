# Smart Solar Microgrid – Web App

React web portal for **Backoffice** and **Grid Operator** staff. It is only a user interface: every rule is checked
by the Web API (`../api`), and the portal shows the API's answers.

## Tech stack

| Part | Choice |
|---|---|
| Build tool | Vite 8 |
| UI | React 19 (JavaScript + JSX) |
| Styling | Tailwind CSS 4, "clay" design tokens in `src/styles/theme.css` |
| Routing | React Router 8 with hash addresses (`/#/users`) |
| API calls | Axios (`src/api/`) |
| Maps | Leaflet + OpenStreetMap |
| QR codes | qrcode.react (show), ZXing (camera scan) |
| Tests | Vitest + Testing Library (unit), Playwright (end-to-end) |

## Run it

You need Node.js 22 or newer and the API running (IIS on port 8080, or `dotnet run` on port 5080).

```bash
npm install
npm run dev
```

Open http://localhost:5173 and log in with a demo account:

| Role | Login | Password |
|---|---|---|
| Backoffice | `admin@solargrid.lk` | `Admin@123` |
| Grid Operator | `operator@solargrid.lk` | `Operator@123` |

To use an API somewhere else, copy `.env.example` to `.env.local` and change `VITE_API_URL`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with instant reload |
| `npm run build` | Production files in `dist/` (used by `deploy/iis/deploy-web.ps1`) |
| `npm run lint` | Code checks (ESLint) |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | Browser tests (Playwright). Starts its own API on port 5090 with a throw-away database, and the web app on port 5174. Needs MongoDB on `localhost:27017` and the .NET SDK. |
| `npm run e2e:screens` | Saves desktop and phone screenshots of every page to `docs/screenshots/web/` |

The first Playwright run needs the browser: `npx playwright install chromium`.

## Folder guide

```
src/
  api/          one file per API area (auth, users, checkin, ...) + client.js (token, errors)
  components/   ui/ = shared clay components (Button, Card, DataTable, Modal, ...)
  context/      signed-in session and toast messages
  hooks/        useApi (loading/error/data), debounce, media query, page title
  layouts/      public frame, login frame, signed-in frame (side menu + top bar)
  pages/        one folder per feature, owned by one team member
  routes/       address list, role guards and the side menu entries
  styles/       theme.css – all colours, shadows, radii, fonts and animations
  utils/        date/number formatting (Sri Lanka time), roles
  test/         unit test set-up and helpers
e2e/            Playwright tests and screenshot run
```

## Conventions

- Every file starts with a header block (file, module, owner, purpose) and every function has a short comment.
- Pages use the shared components and theme tokens only — no one-off colours or shadows.
- Code taken from or based on outside material has a `Source: WEB-xx` marker; see `../sources/web-sources.md`.
