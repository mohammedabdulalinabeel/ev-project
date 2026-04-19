import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const start = typeof body?.start === "string" ? body.start.trim() : "";
    const destination =
      typeof body?.destination === "string" ? body.destination.trim() : "";

    if (!start || !destination) {
      return NextResponse.json(
        { error: "Both start and destination are required as non-empty strings." },
        { status: 400 }
      );
    }

    const ORS_API_KEY = process.env.ORS_API_KEY;
    if (!ORS_API_KEY) {
      return NextResponse.json(
        { error: "ORS API key is not configured." },
        { status: 500 }
      );
    }

    const isLatLonInput = (text: string) => {
      const parts = text.split(",").map((part) => part.trim());
      return parts.length === 2 && parts.every((part) => !Number.isNaN(Number(part)));
    };

    const geocodeORS = async (query: string) => {
      if (isLatLonInput(query)) {
        const [lat, lon] = query.split(",").map((value) => Number(value.trim()));
        return { lat, lon };
      }

      const url = new URL("https://api.openrouteservice.org/geocode/search");
      url.searchParams.set("api_key", ORS_API_KEY);
      url.searchParams.set("text", query);
      url.searchParams.set("size", "1");

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json();

      if (!response.ok || !data.features || data.features.length === 0) {
        throw new Error("Place not found: " + query);
      }

      const [lon, lat] = data.features[0].geometry.coordinates;
      return { lat, lon };
    };

    const startCoords = await geocodeORS(start);
    const destCoords = await geocodeORS(destination);

    // Step 2: Call ORS route API
    const orsRes = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: [
            [startCoords.lon, startCoords.lat],
            [destCoords.lon, destCoords.lat],
          ],
        }),
      }
    );

    const routeData = await orsRes.json();

    if (!orsRes.ok) {
      const message =
        routeData?.error?.message || routeData?.error || "OpenRouteService request failed";
      return NextResponse.json(
        { error: `ORS error: ${message}` },
        { status: orsRes.status }
      );
    }

    if (!routeData?.features || routeData.features.length === 0) {
      return NextResponse.json(
        { error: "No route found for the requested locations." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...routeData,
      startCoords,
      destCoords,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch route";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}