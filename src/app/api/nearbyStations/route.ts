import { NextResponse } from "next/server";

/** Public Overpass endpoints (try in order). See https://wiki.openstreetmap.org/wiki/Overpass_API */
const OVERPASS_INSTANCES = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
] as const;

const OVERPASS_USER_AGENT =
  process.env.OVERPASS_USER_AGENT?.trim() ||
  "EV-CSMS/1.0 (charging-station lookup; local dev)";

function parseLatLon(
  latRaw: unknown,
  lonRaw: unknown
): { ok: true; lat: number; lon: number } | { ok: false; message: string } {
  const lat = typeof latRaw === "string" ? Number(latRaw) : Number(latRaw);
  const lon = typeof lonRaw === "string" ? Number(lonRaw) : Number(lonRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, message: "lat and lon must be valid numbers." };
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return {
      ok: false,
      message: "lat must be between -90 and 90, lon between -180 and 180.",
    };
  }
  return { ok: true, lat, lon };
}

/** Search radius in metres (10 km). */
const SEARCH_RADIUS_M = 10_000;

function buildQuery(lat: number, lon: number) {
  const r = SEARCH_RADIUS_M;
  return `
    [out:json][timeout:25];
    (
      node["amenity"="charging_station"](around:${r},${lat},${lon});
      way["amenity"="charging_station"](around:${r},${lat},${lon});
      relation["amenity"="charging_station"](around:${r},${lat},${lon});
    );
    out center tags;
  `;
}

async function postOverpass(url: string, query: string) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": OVERPASS_USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
    cache: "no-store",
    signal: AbortSignal.timeout(28_000),
  });
}

async function fetchOverpassStations(lat: number, lon: number) {
  const query = buildQuery(lat, lon);
  const failures: { url: string; status: number; detail: string }[] = [];

  for (const baseUrl of OVERPASS_INSTANCES) {
    try {
      const res = await postOverpass(baseUrl, query);
      const text = await res.text();

      if (!res.ok) {
        failures.push({
          url: baseUrl,
          status: res.status,
          detail: text.slice(0, 400),
        });
        continue;
      }

      let data: { elements?: unknown[]; remark?: string };
      try {
        data = JSON.parse(text) as { elements?: unknown[]; remark?: string };
      } catch {
        failures.push({
          url: baseUrl,
          status: res.status,
          detail: "Response was not valid JSON.",
        });
        continue;
      }

      if (data.remark && (!data.elements || data.elements.length === 0)) {
        failures.push({
          url: baseUrl,
          status: 429,
          detail: data.remark,
        });
        continue;
      }

      return NextResponse.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ url: baseUrl, status: 0, detail: message });
    }
  }

  return NextResponse.json(
    {
      error:
        "All Overpass mirrors failed or timed out. Try again in a minute, or set OVERPASS_USER_AGENT in .env to identify your app (see OSM usage policy).",
      attempts: failures,
    },
    { status: 502 }
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = parseLatLon(
    url.searchParams.get("lat"),
    url.searchParams.get("lon")
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }
  return fetchOverpassStations(parsed.lat, parsed.lon);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { lat?: unknown; lon?: unknown };
    const parsed = parseLatLon(body.lat, body.lon);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.message }, { status: 400 });
    }
    return fetchOverpassStations(parsed.lat, parsed.lon);
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON with lat and lon." },
      { status: 400 }
    );
  }
}
