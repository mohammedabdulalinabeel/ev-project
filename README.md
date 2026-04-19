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
| `/api/route/ors` | POST | Body: `{ start, destination }` — resolves route via OpenRouteService |
| `/api/route/geocode` | GET | Query: `query` — autocomplete-style geocode suggestions |
| `/api/route/nearbyStations` | GET | Query: `lat`, `lon`, optional `radiusKm` (default 50) — demo stations within radius |

## Tech stack

Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn-style UI components, Leaflet / react-leaflet for maps.

## Deploy

Build with `npm run build`, then run `npm run start`, or deploy to a platform that supports Next.js (e.g. Vercel). Configure `ORS_API_KEY` in the host’s environment variables — never commit `.env`.
