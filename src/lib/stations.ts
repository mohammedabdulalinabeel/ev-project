export type Station = {
  id: number;
  name: string;
  location: string;
  chargerType: string;
  status: string;
  lat: number;
  lon: number;
};

/** Demo stations (replace with API-backed data in production). */
export const MOCK_STATIONS: Station[] = [
  {
    id: 1,
    name: "EV Station - T Nagar",
    location: "Chennai",
    chargerType: "Fast Charger",
    status: "Available",
    lat: 13.0418,
    lon: 80.2341,
  },
  {
    id: 2,
    name: "EV Station - Velachery",
    location: "Chennai",
    chargerType: "Normal Charger",
    status: "Busy",
    lat: 12.9756,
    lon: 80.2209,
  },
  {
    id: 3,
    name: "EV Station - Anna Nagar",
    location: "Chennai",
    chargerType: "Fast Charger",
    status: "Offline",
    lat: 13.0878,
    lon: 80.2102,
  },
  {
    id: 4,
    name: "EV Station - Guindy",
    location: "Chennai",
    chargerType: "Fast Charger",
    status: "Available",
    lat: 13.0067,
    lon: 80.2206,
  },
];

/** Assumed full range (km) at 100% battery for UI estimates. */
export const EV_FULL_RANGE_KM = 300;

export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getMinDistanceToRoute(
  stationLat: number,
  stationLon: number,
  routeCoords: [number, number][]
): number {
  if (routeCoords.length === 0) return Infinity;
  let minDistance = Infinity;
  for (const [lat, lon] of routeCoords) {
    const dist = getDistanceKm(stationLat, stationLon, lat, lon);
    if (dist < minDistance) minDistance = dist;
  }
  return minDistance;
}
