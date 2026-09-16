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
  | 401 | Not logged in, wrong password or expired token |
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

## Health — *Ravindu*

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/api/health` | anyone | `200` with `{ status: "Healthy", database: "Connected" }`, or `503` if MongoDB is down. |
