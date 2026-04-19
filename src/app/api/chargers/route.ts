import { NextResponse } from "next/server";

const OPEN_CHARGE_MAP_URL = "https://api.openchargemap.io/v3/poi";

function parseNumber(input: string | null, fallback: number): number {
  if (!input) return fallback;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(req: Request) {
  try {
    const apiKey = process.env.OPENCHARGE_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENCHARGE_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const latitude = parseNumber(url.searchParams.get("lat"), 13.0827);
    const longitude = parseNumber(url.searchParams.get("lon"), 80.2707);
    const distanceKm = Math.min(
      Math.max(parseNumber(url.searchParams.get("distanceKm"), 25), 1),
      100
    );
    const maxResults = Math.min(
      Math.max(parseNumber(url.searchParams.get("maxResults"), 30), 1),
      100
    );

    const upstream = new URL(OPEN_CHARGE_MAP_URL);
    upstream.searchParams.set("output", "json");
    upstream.searchParams.set("latitude", String(latitude));
    upstream.searchParams.set("longitude", String(longitude));
    upstream.searchParams.set("distance", String(distanceKm));
    upstream.searchParams.set("distanceunit", "KM");
    upstream.searchParams.set("maxresults", String(maxResults));
    upstream.searchParams.set("compact", "true");
    upstream.searchParams.set("verbose", "false");
    upstream.searchParams.set("key", apiKey);

    const response = await fetch(upstream.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        {
          error: "OpenChargeMap request failed.",
          detail: text.slice(0, 300),
        },
        { status: 502 }
      );
    }

    try {
      const data = JSON.parse(text) as unknown;
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { error: "Invalid response from OpenChargeMap." },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch chargers.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
