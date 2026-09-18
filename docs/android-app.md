# Android App — Screens and Permissions

The Android app (`android/`) is the mobile user interface for **prosumers** and **Grid Operators**. It is a pure
native app: Java with XML layouts, SQLite through `SQLiteOpenHelper`, and no cross-platform framework. Every operation
goes through the Web API over REST; the app never talks to MongoDB. The API checks every rule (7-day booking window,
12-hour notice, free bays, the energy one bay holds, account status); the app shows or hides buttons from the flags the
API sends (`canModify`, `hasQrCode`, `isPast`) and shows the API's own message when it says no.

Screenshots of every screen are in [`docs/screenshots/android/`](screenshots/android/); the numbers in the table below
are the picture numbers.

## Who uses the app

| Account | What happens at login |
|---|---|
| Prosumer, **Active** | Prosumer home with four tabs: Home, Map, Bookings, Account |
| Grid Operator, **Active** | Operator home with four tabs: Scan, Today, Bays, Account |
| Backoffice | Refused with "Backoffice accounts use the web portal, not this app." |
| Prosumer, **Pending** or **Deactivated** | Refused by the API (403) with its message, for example "waiting for Backoffice activation" |

## Screens

| Pictures | Screen | Who | What it does | API calls | SQLite | Owner |
|---|---|---|---|---|---|---|
| — | Start-up | Everyone | Reads the saved session and checks it with the API, then opens the home of the role; an expired session goes to login | `GET /api/auth/me` | `session` | Ravindu |
| 01–02 | Log in | Everyone | NIC or email and password; a refusal is shown with the API's words | `POST /api/auth/login` | `session` | Ravindu |
| 09–10 | Sign up, waiting for activation | New prosumers | NIC (the key), name, email, phone, address, meter number, panel size and password; then "waiting for the Backoffice" | `POST /api/prosumers/register` | — | Malith |
| 03, 13 | Home | Prosumer | Waiting and approved-to-come counts, finished transfers, delivered kWh, the next booking and the ones after it; "Book a slot" | `GET /api/dashboard/my-summary` | — | Malith |
| 15–17 | Map and station list | Prosumer | Nearby stations on Google Maps (or as a list) with free bays, today's hours and distance; "Book a slot here" | `GET /api/stations/nearby`, `GET /api/stations?search` | `stations` | Nimthara |
| 18 | Station page | Prosumer | Bays, energy per booking, weekly hours and the slots of the next seven days; "Book a slot here" | `GET /api/stations/{id}`, `GET /api/stations/{id}/slots` | `stations` | Nimthara |
| 20–22 | Bookings | Prosumer | Current, waiting and history tabs; search; status, station and date range filters; one page at a time | `GET /api/reservations?scope&status&stationId&from&to&search&page&pageSize` | `reservations` | Hamnad |
| 23–26, 31 | Booking form | Prosumer | Station → day and free slot → Export or Import and kWh → review; the same form changes a booking | `GET /api/stations`, `GET /api/stations/{id}`, `GET /api/stations/{id}/slots`, `POST /api/reservations`, `PUT /api/reservations/{id}` | — | Hamnad |
| 28–29, 32, 34 | Booking page | Prosumer, Grid Operator | What happens next, the QR code of an approved booking, details, history, and Change / Cancel while allowed | `GET /api/reservations/{id}`, `GET /api/reservations/{id}/qr`, `POST /api/reservations/{id}/cancel` | `reservations` | Hamnad |
| 27, 30 | Summary | Prosumer, Grid Operator | The booking as the API saved it after booking, changing or cancelling, and what happens next | — | — | Hamnad |
| 04, 14 | Account | Prosumer, Grid Operator | Own details, server address and app version; log out; change password; for prosumers also edit profile and deactivate | `POST /api/prosumers/me/deactivate` | clears | Ravindu, Malith |
| 11 | Profile | Prosumer | Edit the whole profile (the API replaces it) | `GET /api/prosumers/me`, `PUT /api/prosumers/me` | `profile` | Malith |
| 12 | Change password | Prosumer, Grid Operator | The current password and the new one twice | `POST /api/auth/change-password` | — | Malith |
| 05 | Scan | Grid Operator | Camera scan of the booking QR code, or the code typed in | — | — | Ravindu |
| 06–08 | Check-in | Grid Operator | The API checks the code; ready, or blocked with the reason; the delivered kWh; complete the transfer | `POST /api/checkin/verify`, `POST /api/checkin/{id}/complete` | — | Ravindu |
| 33 | Today | Grid Operator | The bookings of one of the next seven days at every station, earliest first, and three staff numbers; a booking opens the booking page | `GET /api/reservations?from&to&search`, `GET /api/dashboard/summary` | — | Hamnad |
| 19 | Bays | Grid Operator | Set how many battery bays of a station are free | `GET /api/stations`, `PATCH /api/stations/{id}/battery-slots` | — | Nimthara |

## What each role can do

The API enforces every permission; the app only shows what a role can use.

| Task | Prosumer | Grid Operator |
|---|:---:|:---:|
| Create an account (NIC as the key) | ✔ | — |
| Change own profile | ✔ | — |
| Change own password | ✔ | ✔ |
| Ask for deactivation (only Backoffice reactivates) | ✔ | — |
| See the dashboard numbers | ✔ (own bookings) | ✔ (staff numbers) |
| See nearby stations on the map, station pages and slots | ✔ | — |
| Book a slot (up to 7 days ahead) | ✔ | — (web portal) |
| Change a booking (at least 12 hours before the start) | ✔ | — (web portal) |
| Cancel a booking (at least 12 hours before the start) | ✔ | ✔ (for a prosumer) |
| See current, waiting and past bookings | ✔ (own) | ✔ (every booking of a day) |
| Show the QR code of an approved booking | ✔ | — |
| Scan and check a QR code, finish the transfer | — | ✔ |
| Set a station's free battery bays | — | ✔ |

## Offline

The app keeps a small read-only copy in SQLite (see [Android SQLite](database-design.md#android-sqlite)). The session
keeps a user signed in until the token expires; the profile, the stations and the last bookings still show without a
connection, with a note that they may be old. A copy on the phone never allows a change: booking, changing,
cancelling and checking in always need the API. Logging out removes the session, the profile and the bookings; the
stations stay, because they are the same for everyone.

## Android permissions

| Permission | Why | When it is asked |
|---|---|---|
| Internet, network state | Calling the Web API | Granted at install |
| Nearby devices (local network, Android 17) | Reaching an API on the local network, such as the development PC at `10.0.2.2` | Before the first request to a local address |
| Location (fine or coarse) | Centring the map on the prosumer | When the Map tab opens; without it the map starts in Colombo |
| Camera | Scanning booking QR codes | When the operator taps "Scan QR code"; the code can be typed instead |
