# EV-CSMS

Electric Vehicle Charging Station Management System — a [Next.js](https://nextjs.org) app for monitoring EV status, finding charging stations, and planning routes with maps.

## Prerequisites

- Node.js 20+ recommended
- An [OpenRouteService](https://openrouteservice.org/) API key (used for geocoding and driving directions on the server)

## Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment template and add your key:

```bash
copy .env.example .env
```

On macOS or Linux, use `cp .env.example .env` instead.

Edit `.env` and set `ORS_API_KEY` to your key. **Do not** prefix this variable with `NEXT_PUBLIC_`; the key must stay server-side only.

3. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command       | Description              |
| ------------- | ------------------------ |
| `npm run dev` | Development server       |
| `npm run build` | Production build       |
| `npm run start` | Run production server  |
| `npm run lint`  | ESLint                 |

## API routes (App Router)

| Path | Method | Description |
| ---- | ------ | ----------- |
| `/api/ors` | POST | Body: `{ start, destination }` — driving route via OpenRouteService |
| `/api/geocode` | GET | Query: `query` — geocode suggestions (requires `ORS_API_KEY`) |
| `/api/chargers` | GET | Query: `lat`, `lon`, optional `distanceKm`, `maxResults` — OpenChargeMap stations (requires `OPENCHARGE_API_KEY`) |
| `/api/nearbyStations` | `GET` or `POST` | `lat`, `lon` (query string or JSON body) — nearby charging stations via Overpass |
| `/api/nominatim` | GET | Query: `q` — forward geocode (used by the Stations page; set `NOMINATIM_USER_AGENT` in production) |

## Tech stack

Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn-style UI components, Leaflet / react-leaflet for maps.

## Deploy

Build with `npm run build`, then run `npm run start`, or deploy to a platform that supports Next.js (e.g. Vercel). Configure `ORS_API_KEY` in the host’s environment variables — never commit `.env`.
