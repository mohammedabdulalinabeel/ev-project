import { NextResponse } from "next/server";
import {
  getDistanceKm,
  MOCK_STATIONS,
  type Station,
} from "@/lib/stations";

type NearbyStation = Station & { distanceKm: number };

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const latRaw = url.searchParams.get("lat");
    const lonRaw = url.searchParams.get("lon");
    const radiusRaw = url.searchParams.get("radiusKm");

    if (latRaw === null || lonRaw === null) {
      return NextResponse.json(
        { error: "Query parameters lat and lon are required." },
        { status: 400 }
      );
    }

    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    const radiusKm =
      radiusRaw !== null && radiusRaw !== ""
        ? Number(radiusRaw)
        : 50;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json(
        { error: "lat and lon must be valid numbers." },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: "lat must be between -90 and 90, lon between -180 and 180." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 500) {
      return NextResponse.json(
        { error: "radiusKm must be a number between 0 and 500 (default 50)." },
        { status: 400 }
      );
    }

    const withDistance: NearbyStation[] = MOCK_STATIONS.map((station) => ({
      ...station,
      distanceKm: getDistanceKm(lat, lon, station.lat, station.lon),
    }))
      .filter((s) => s.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({ stations: withDistance });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list nearby stations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
