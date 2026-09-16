# API Endpoints

Base URL: `http://localhost:5080` when run from Visual Studio, `http://localhost:8080` on IIS.
Interactive documentation: `/swagger`.

## Conventions

- **Format:** JSON with camelCase names. Enum values are words, e.g. `"role": "GridOperator"`.
- **Login:** call `POST /api/auth/login`, then send `Authorization: Bearer <token>` on every other request. Tokens last 8 hours.
- **Errors:** always a ProblemDetails object. Apps should show `detail` to the user.

  ```json
  { "title": "Request not allowed", "status": 400, "detail": "Password must be at least 8 characters ...", "instance": "/api/users" }
  ```

  | Status | Meaning |
  |---|---|
  | 400 | Invalid input or a business rule was broken (`errors` lists field problems) |
  | 401 | Not logged in, wrong password, expired token, or the account was deactivated / changed role after login |
  | 403 | Logged in but not allowed (or account pending/deactivated at login) |
  | 404 | Record not found |
  | 409 | Duplicate value (NIC, email, code) or a clash with existing data |
  | 503 | MongoDB not reachable |

- **Lists:** paged lists return `{ items, total, page, pageSize, totalPages }` and accept `page` and `pageSize` (max 100).

## Authentication — *Ravindu*

| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/api/auth/login` | anyone | Log in with NIC or email + password. Returns `token`, `expiresAt` and `user`. |
| GET | `/api/auth/me` | any signed-in user | Current user's details. |
| POST | `/api/auth/change-password` | any signed-in user | Body `{ currentPassword, newPassword }`. Returns 204. |

## Staff users — *Ravindu*

All endpoints require the **Backoffice** role.

| Method | Path | Description |
|---|---|---|
| GET | `/api/users?role=&status=&search=&page=&pageSize=` | List Backoffice and Grid Operator accounts. |
| GET | `/api/users/{nic}` | One staff account. |
| POST | `/api/users` | Create a staff account. Body `{ nic, fullName, email, phone, password, role }`. Returns 201. |
| PUT | `/api/users/{nic}` | Update name, email, phone, role; optional `newPassword` resets the password. |
| PATCH | `/api/users/{nic}/status` | Body `{ isActive }`. You cannot deactivate yourself or the last active Backoffice account. |

## Prosumers — *Malith*

Self-service (mobile app):

| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/api/prosumers/register` | anyone | Sign up with `{ nic, fullName, email, phone, password, address, meterNumber?, solarCapacityKw? }`. Returns 201 with status **Pending**. |
| GET | `/api/prosumers/me` | Prosumer | Own profile. |
| PUT | `/api/prosumers/me` | Prosumer | Update `{ fullName, email, phone, address, meterNumber?, solarCapacityKw? }`. The NIC cannot change. |
| POST | `/api/prosumers/me/deactivate` | Prosumer | Body `{ password }`. Blocked while the prosumer has upcoming Pending/Approved bookings. Returns 204. |

Management (web app):

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/api/prosumers?status=&search=&page=&pageSize=` | Staff | List prosumers. |
| GET | `/api/prosumers/pending-activations` | Backoffice | New sign-ups waiting for activation, oldest first. |
| GET | `/api/prosumers/{nic}` | Staff | One prosumer. |
| POST | `/api/prosumers` | Staff | Create a prosumer (same body as register). The account is **Active** at once. |
| PUT | `/api/prosumers/{nic}` | Staff | Update a prosumer's details. |
| POST | `/api/prosumers/{nic}/deactivate` | Staff | Deactivate an account, or reject a pending sign-up. |
| POST | `/api/prosumers/{nic}/activate` | **Backoffice only** | Activate a sign-up or reactivate a deactivated account. |

## Dashboards — *Malith*

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/api/dashboard/summary` | Staff | Pending reservations, approved future reservations, today's bookings, stations, pending activations, active prosumers and the next 5 bookings. |
| GET | `/api/dashboard/my-summary` | Prosumer | Own pending and approved-future counts, completed transfers, delivered kWh, next booking and the next 5 bookings. |
| GET | `/api/dashboard/public` | anyone | Active stations, active prosumers, completed transfers and total kWh traded (for the home page). |

All numbers are calculated from the database on every call. "Today" means today in Sri Lanka time.

## Health — *Ravindu*

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/api/health` | anyone | `200` with `{ status: "Healthy", database: "Connected" }`, or `503` if MongoDB is down. |
