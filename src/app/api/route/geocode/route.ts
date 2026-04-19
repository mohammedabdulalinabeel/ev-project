import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query")?.trim();

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required." },
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

    const geocodeUrl = new URL("https://api.openrouteservice.org/geocode/search");
    geocodeUrl.searchParams.set("api_key", ORS_API_KEY);
    geocodeUrl.searchParams.set("text", query);
    geocodeUrl.searchParams.set("size", "5");

    const response = await fetch(geocodeUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Geocoding failed." },
        { status: response.status }
      );
    }

    type OrsFeature = {
      geometry: { coordinates: [number, number] };
      properties: { label?: string; name?: string };
    };

    const suggestions = ((data.features || []) as OrsFeature[]).map(
      (feature) => ({
        label:
          feature.properties.label || feature.properties.name || query,
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
      })
    );

    return NextResponse.json({ suggestions });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch geocoding suggestions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
