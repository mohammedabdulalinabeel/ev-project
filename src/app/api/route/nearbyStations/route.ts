import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { lat, lon } = await req.json();

    const query = `
      [out:json];
      (
        node["amenity"="charging_station"](around:5000,${lat},${lon});
        way["amenity"="charging_station"](around:5000,${lat},${lon});
        relation["amenity"="charging_station"](around:5000,${lat},${lon});
      );
      out center;
    `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });

    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch charging stations" },
      { status: 500 }
    );
  }
}