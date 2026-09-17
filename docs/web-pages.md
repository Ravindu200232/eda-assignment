# Web Portal — Pages and Permissions

The web portal (`web/`) is the staff user interface. Only **Backoffice** and **Grid Operator** accounts can sign in;
prosumer accounts are refused with a message to use the mobile app. The portal is a user interface only: every rule is
checked by the Web API, and the portal shows the API's answers and messages.

Addresses use a `#` (for example `http://localhost:8081/#/stations`), so IIS always serves the same page.
Screenshots of every page are in [`docs/screenshots/web/`](screenshots/web/) (`desktop/` and `mobile/`).

## Pages

| Address | Page | Who can open it | What it does | API calls | Owner |
|---|---|---|---|---|---|
| `/` | Home | Everyone | Introduces the system, shows live public numbers (stations, prosumers, energy traded), how trading works and what each user type can do | `GET /api/dashboard/public` | Malith |
| `/login` | Log in | Everyone | Login with NIC or email. Backoffice users land on the dashboard, Grid Operators on the operations page; prosumers are refused | `POST /api/auth/login` | Ravindu |
| `/dashboard` | Backoffice dashboard | Backoffice | Live numbers (pending and approved upcoming bookings, today's bookings, sign-ups waiting, stations and prosumers in service), next bookings, quick actions; refreshes every 30 s while visible | `GET /api/dashboard/summary` | Malith |
| `/operations` | Operations | Grid Operator | Live numbers, today's bookings in time order with a check-in shortcut, next bookings, and one-click battery bay changes per station | `GET /api/dashboard/summary`, `GET /api/reservations?from&to`, `GET /api/stations?status=Active`, `PATCH /api/stations/{id}/battery-slots` | Malith, Nimthara (bays card) |
| `/reservations` | Reservations | Backoffice, Grid Operator | Tabs (pending approval, current, history, all), filters (station, status, prosumer NIC, dates), search and paging; approve or reject pending bookings from the list; ended bookings that never happened show as "Missed" | `GET /api/reservations`, `GET /api/stations`, `POST /api/reservations/{id}/approve`, `POST /api/reservations/{id}/reject` | Hamnad |
| `/reservations/new` | New booking | Backoffice, Grid Operator | Wizard: active prosumer → station in service → one of the next 7 days → free slot → energy (up to one battery bay) and Export/Import | `GET /api/prosumers?search&status=Active`, `GET /api/stations?status=Active`, `GET /api/stations/{id}/slots?from&to&onlyAvailable=true`, `POST /api/reservations` | Hamnad |
| `/reservations/:id` | Booking | Backoffice, Grid Operator | Details, timeline, 12-hour change deadline, approve / reject (with reason) / change / cancel (optional reason) depending on status and time, QR code with print and copy once approved | `GET /api/reservations/{id}`, `GET /api/reservations/{id}/qr`, `POST …/approve`, `POST …/reject`, `POST …/cancel` | Hamnad |
| `/reservations/:id/edit` | Change booking | Backoffice, Grid Operator | The wizard for an existing booking (same prosumer; its own slot is always offered). Closed in the last 12 hours before the start | `GET /api/reservations/{id}`, `GET /api/stations`, `GET …/slots`, `PUT /api/reservations/{id}` | Hamnad |
| `/check-in` | QR check-in | Backoffice, Grid Operator | Read the booking QR code (camera, USB scanner or pasted text), check it, enter the delivered kWh and complete the transfer | `POST /api/checkin/verify`, `POST /api/checkin/{id}/complete` | Ravindu |
| `/stations` | Stations | Backoffice, Grid Operator | List or map of all stations with search and status tabs; clicking a pin shows the station | `GET /api/stations?status&search` | Nimthara |
| `/stations/new` | New station | Backoffice | Details, capacity, GPS position (map click, drag or type) and weekly opening hours | `POST /api/stations` | Nimthara |
| `/stations/:id` | Station | Backoffice, Grid Operator | Overview with map, battery bays, weekly hours, slots for the next 7 days (one day at a time) | `GET /api/stations/{id}`, `PATCH …/battery-slots`, `GET/POST /api/stations/{id}/slots`, `POST …/slots/generate`, `PUT/DELETE /api/slots/{id}`; Backoffice also `PUT …/schedule`, `POST …/deactivate`, `POST …/activate`, `DELETE /api/stations/{id}` | Nimthara |
| `/stations/:id/edit` | Edit station | Backoffice | Change the details and GPS position | `GET /api/stations/{id}`, `PUT /api/stations/{id}` | Nimthara |
| `/prosumers` | Prosumers | Backoffice, Grid Operator | Search, status tabs and paging; create (NIC is the key), edit, deactivate; Backoffice also activates and reactivates | `GET /api/prosumers`, `POST /api/prosumers`, `PUT /api/prosumers/{nic}`, `POST …/deactivate`, `POST …/activate` | Malith |
| `/prosumers/:nic` | Prosumer | Backoffice, Grid Operator | Profile, account history and the prosumer's bookings | `GET /api/prosumers/{nic}`, `GET /api/reservations?nic=` and the actions above | Malith |
| `/activations` | Pending activations | Backoffice | Sign-ups from the mobile app, oldest first, with Activate and Reject; the menu shows how many are waiting | `GET /api/prosumers/pending-activations`, `POST …/activate`, `POST …/deactivate` | Malith |
| `/users` | Staff users | Backoffice | Search and filters; create Backoffice and Grid Operator accounts, edit (with password reset), activate and deactivate (never your own account) | `GET /api/users`, `POST /api/users`, `PUT /api/users/{nic}`, `PATCH /api/users/{nic}/status` | Ravindu |
| `/account` | My account | Backoffice, Grid Operator | Own details and password change | `GET /api/auth/me`, `POST /api/auth/change-password` | Ravindu |
| any other | Not found / not allowed | — | "Page not found", or "This page is for … staff" when the role may not open it | — | Ravindu |

Every signed-in page also calls `GET /api/health` for the status dot in the top bar. For Backoffice users the menu
calls `GET /api/dashboard/summary` for the "pending activations" badge. An expired or rejected session returns the
user to the login page with a message.

## What each role can do

The API enforces every permission; the portal hides what a role cannot use.

| Task | Backoffice | Grid Operator |
|---|:---:|:---:|
| See the dashboard with live numbers | ✔ (`/dashboard`) | ✔ (`/operations`) |
| Create, edit, activate and deactivate **staff users** | ✔ | — |
| Create, edit and deactivate **prosumer** accounts | ✔ | ✔ |
| **Activate** a mobile sign-up or **reactivate** a prosumer | ✔ | — |
| Reject a mobile sign-up | ✔ (also on `/activations`) | ✔ (from the prosumer list) |
| View stations, the station map and station details | ✔ | ✔ |
| Create, edit, deactivate, activate and delete **stations** | ✔ | — |
| Change a station's **opening hours** | ✔ | — |
| Change a station's **available battery bays** | ✔ | ✔ |
| Add, generate, change and delete **slots** | ✔ | ✔ |
| View and search all bookings | ✔ | ✔ |
| Book a slot for a prosumer, change or cancel a booking (12-hour rule) | ✔ | ✔ |
| Approve or reject pending bookings | ✔ | ✔ |
| Show and print a booking's QR code | ✔ | ✔ |
| QR check-in and completing an energy transfer | ✔ | ✔ |
| Change own password | ✔ | ✔ |

Rules shown in the portal (and enforced by the API): bookings up to 7 days ahead; changes and cancellations at least
12 hours before the start; one battery bay per booking; stations with active bookings cannot be deactivated;
stations with booking history cannot be deleted; only Backoffice reactivates prosumer accounts.
