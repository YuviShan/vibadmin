# viberp Admin Portal

React admin dashboard for the textile ERP API.

## Stack

- Vite + React 19 + TypeScript
- React Router
- TanStack Query
- Axios

## Local development

**Prerequisites:** API running at `http://localhost:3000` (see `backend/README.md`).

```bash
cd admin
npm install
cp .env.example .env   # if needed
npm run dev
```

Open http://localhost:5173 — login with `testuser` / `password`.

## Pages

| Route | API |
|-------|-----|
| `/login` | `POST /auth/login` |
| `/` | `GET /dashboard/summary` |
| `/partners` | `GET /partners` |
| `/items` | `GET /items` |
| `/rates` | `GET /partners/:id/rates` |
| `/orders` | `GET /orders` |

## Build (Amplify)

```bash
npm run build
```

Output: `dist/`. Set `VITE_API_BASE_URL` in Amplify environment variables.

## Env

```
VITE_API_BASE_URL=http://localhost:3000/api/v1
```
