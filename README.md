# SE2 Frontend (React + Vite)

This folder contains the frontend UI for the SE2 project.

## Frontend

### Requirements
- Node.js (LTS recommended)
- npm (comes with Node.js)

### Install
From the `SE2-merged` folder:

`npm install`

### Run (development)

`npm run dev`

### Build (optional)

`npm run build`

### Main libraries used
Already listed in `package.json`:
- React + React DOM
- Vite
- `recharts` (charts)
- `xlsx` (Excel export)
- `chart.js` + `react-chartjs-2` (charts)
- `bootstrap` + `react-bootstrap` (UI)
- `@supabase/supabase-js` (backend client)

## Backend

### Supabase
Supabase is used as the backend (users, orders, payments).

#### Configure
1. Copy `.env.example` to `.env`
2. Fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Notes:
- The app uses `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` when present.
- If not provided, it falls back to the existing hardcoded values in `src/supabaseClient.js`.
