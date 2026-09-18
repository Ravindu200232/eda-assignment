# Demo Video Script (5 minutes or less)

The README links the recorded video. This script keeps the recording under five minutes and makes sure every
member shows their own part.

## Timing

| Time | Part | Speaker |
|---|---|---|
| 0:00 – 0:30 | What the system does, the architecture diagram in the README | Ravindu |
| 0:30 – 1:00 | Web API on IIS: Swagger at `http://localhost:8080/swagger`, `GET /api/health`, the smoke test | Ravindu |
| 1:00 – 3:00 | Web portal on IIS (below) | all four members |
| 3:00 – 4:45 | Android app on the emulator (below) | all four members |
| 4:45 – 5:00 | Summary: FAT service, tests, IIS hosting | Ravindu |

## Before recording

1. MongoDB is running, and `deploy\iis\smoke-test.ps1` and `deploy\iis\smoke-test-web.ps1` both pass.
2. Fresh demo data: delete the `SolarGridDb` database in MongoDB Compass and restart the `SolarGridApi` site, so
   booking `RSV-DEMO-0006` starts within two hours and can be checked in.
3. Browser: a private window at 1440 × 900, zoom 100 %, opened at `http://localhost:8081`.
4. Keep the QR code of `RSV-DEMO-0006` ready: open the booking in a second window and press **Copy code text**
   (or show it on a phone and use the camera).

| Account | Login | Password |
|---|---|---|
| Backoffice | `admin@solargrid.lk` | `Admin@123` |
| Grid Operator | `operator@solargrid.lk` | `Operator@123` |
| Prosumer (to show the refusal) | `kasun@example.com` | `Prosumer@123` |

## Web portal walkthrough (about two minutes)

| Time | Screen | What to do and say | Owner |
|---|---|---|---|
| 1:00 | Home page | Point at the live numbers from the API and press **Staff login**. | Malith |
| 1:05 | Login | Log in as the prosumer: the portal refuses and sends prosumers to the mobile app. Log in as Backoffice. | Ravindu |
| 1:15 | Dashboard | Pending and approved upcoming bookings, today's bookings, sign-ups waiting. Click **Waiting for approval** later. | Malith |
| 1:20 | Pending activations | Activate Tharindu's mobile sign-up; the menu badge goes away. Say that only Backoffice can activate or reactivate. | Malith |
| 1:30 | Prosumers | Search "Kasun", open the profile and his bookings (one shows **Completed**). | Malith |
| 1:40 | Stations | Switch to **Map**, click the Kandy pin. Open SLIIT Malabe: take one battery bay out of use and save, flip through the day tabs of the slots, try **Deactivate** and read the API's refusal (active bookings). | Nimthara |
| 2:00 | Reservations | **Pending approval** tab: open `RSV-DEMO-0003`, **Approve**, the QR code appears (show **Print slip**). Open `RSV-DEMO-0006`: changes are closed because it starts within 12 hours. | Hamnad |
| 2:20 | New booking | Kasun → Kandy → tomorrow → first free slot → 10 kWh → Export → **Book this slot**. Say: up to 7 days ahead, one battery bay per booking. | Hamnad |
| 2:35 | Staff users | Show the list and the role filter; log out. | Ravindu |
| 2:40 | Operations | Log in as the Grid Operator: today's bookings and the battery bay shortcut. | Malith, Nimthara |
| 2:48 | QR check-in | Paste the code of `RSV-DEMO-0006` (or scan it), **Check code**, enter 3.8 kWh, **Complete transfer**. | Ravindu |
| 3:00 | — | Hand over to the Android part. | |

## Android app walkthrough (about one minute and forty-five seconds)

Before recording: the emulator (Pixel 10, Android 17) is running with the app installed (`gradlew installDebug`), the
API answers on `http://10.0.2.2:8080/`, and the app was allowed "Nearby devices" and location once.

| Time | Screen | What to do and say | Owner |
|---|---|---|---|
| 3:00 | Log in | Log in as `kasun@example.com`. Say: the same Web API as the portal; Backoffice accounts are refused here. | Ravindu |
| 3:08 | Home | The two numbers the brief asks for (waiting for approval, approved and coming up), transfers done, the next booking. | Malith |
| 3:15 | Map | Map tab: the nearby stations with their free bays; tap SLIIT Malabe, then **Book a slot here**. | Nimthara |
| 3:25 | Booking form | **Tomorrow** → a free slot → Export → 12.5 kWh → **Next** → **Book now**. The summary says it waits for approval. Say: up to 7 days ahead, one battery bay, the API checks every rule. | Hamnad |
| 3:40 | Bookings | **Back to my bookings** opens the Waiting tab with the new booking. Current tab: open `RSV-DEMO-0003` (approved in the web part): the QR code, "change or cancel until …", the history. | Hamnad |
| 3:55 | Bookings | Open a booking inside 12 hours (`RSV-DEMO-0002` if it starts soon): Change and Cancel are gone and the rule is explained. History tab: the completed booking `RSV-DEMO-0001`; the status filter. | Hamnad |
| 4:05 | Account | Edit my profile (phone number) and save; mention that the profile and bookings still show offline from SQLite. | Malith |
| 4:15 | Operator | Log out and log in as `operator@solargrid.lk`. **Today**: the day's bookings at every station and the staff numbers. **Bays**: one bay out of use, save. **Scan**: paste or scan the code of `RSV-DEMO-0003` → the API says when check-in opens. | Ravindu, Nimthara, Hamnad |
| 4:45 | — | Hand over to the summary. | |

## Points to mention

- The web portal and the Android app are only user interfaces; every rule lives in the Web API (FAT service).
- Rules: bookings up to 7 days ahead, changes and cancellations at least 12 hours before the start, no overbooking,
  stations with active bookings cannot be deactivated, only Backoffice reactivates prosumer accounts.
- Tests: API unit and end-to-end tests, web unit tests and browser tests against a temporary database, Android unit
  tests, emulator tests and live tests against a temporary database.
- Hosting: both the API (port 8080) and the portal (port 8081) run on IIS with scripts in `deploy/iis/`.
