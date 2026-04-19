import { NextResponse } from "next/server";

const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT?.trim() ||
  "EV-CSMS/1.0 (https://github.com/; nominatim search)";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json(
      { error: "Query parameter q is required." },
      { status: 400 }
    );
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("format", "json");
  nominatimUrl.searchParams.set("limit", "8");
  nominatimUrl.searchParams.set("q", q);

  try {
    const res = await fetch(nominatimUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Nominatim request failed.",
          detail: text.slice(0, 300),
        },
        { status: 502 }
      );
    }

    let results: unknown;
    try {
      results = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid response from Nominatim." },
        { status: 502 }
      );
    }

    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
