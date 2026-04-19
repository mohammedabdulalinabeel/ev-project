"use client";

import { FormEvent, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

type NominatimHit = {
  lat: string;
  lon: string;
  display_name?: string;
};

type OpenChargeMapItem = {
  ID: number;
  AddressInfo?: {
    Title?: string;
    AddressLine1?: string;
    Town?: string;
    StateOrProvince?: string;
    Latitude?: number;
    Longitude?: number;
  };
  OperatorInfo?: { Title?: string };
  UsageType?: { Title?: string };
  Connections?: Array<{
    Quantity?: number;
    PowerKW?: number;
    ConnectionType?: { Title?: string };
    CurrentType?: { Title?: string };
  }>;
};

type ChargerStation = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  location: string;
  operator: string;
  usage: string;
  connectors: string;
};

export default function StationsPage() {
  const [locationSearch, setLocationSearch] = useState("Chennai");
  const [centerLat, setCenterLat] = useState(13.0827);
  const [centerLon, setCenterLon] = useState(80.2707);
  const [resolvedPlaceLabel, setResolvedPlaceLabel] =
    useState<string>("Chennai");
  const [stations, setStations] = useState<ChargerStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<ChargerStation | null>(
    null
  );

  const [loadingStations, setLoadingStations] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [stationsError, setStationsError] = useState("");

  const Map = dynamic(() => import("@/components/Map"), { ssr: false });

  useEffect(() => {
    const fetchStations = async () => {
      try {
        setLoadingStations(true);
        setStationsError("");

        const res = await fetch(
          `/api/chargers?lat=${centerLat}&lon=${centerLon}&distanceKm=25&maxResults=40`
        );
        const data = (await res.json()) as
          | OpenChargeMapItem[]
          | { error?: string };

        if (!res.ok) {
          const errorPayload = Array.isArray(data) ? {} : data;
          setStations([]);
          setStationsError(
            typeof errorPayload.error === "string"
              ? errorPayload.error
              : "Could not load nearby stations."
          );
          return;
        }

        if (!Array.isArray(data) || data.length === 0) {
          setStations([]);
          setSelectedStation(null);
          setStationsError("No charging stations found near this location.");
          return;
        }

        const formattedStations = data
          .map((item) => {
            const lat = item.AddressInfo?.Latitude;
            const lon = item.AddressInfo?.Longitude;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

            const connections =
              item.Connections?.slice(0, 4).map((c) => {
                const base = c.ConnectionType?.Title || "Connector";
                const power = c.PowerKW ? `${c.PowerKW}kW` : null;
                const qty = c.Quantity ? `x${c.Quantity}` : null;
                return [base, power, qty].filter(Boolean).join(" ");
              }) || [];

            return {
              id: item.ID,
              name:
                item.AddressInfo?.Title ||
                item.OperatorInfo?.Title ||
                "EV Charging Station",
              location: [
                item.AddressInfo?.AddressLine1,
                item.AddressInfo?.Town,
                item.AddressInfo?.StateOrProvince,
              ]
                .filter(Boolean)
                .join(", "),
              lat: lat as number,
              lon: lon as number,
              operator: item.OperatorInfo?.Title || "Unknown operator",
              usage: item.UsageType?.Title || "Usage info unavailable",
              connectors:
                connections.length > 0
                  ? connections.join(" | ")
                  : "Connector info unavailable",
            };
          })
          .filter((x): x is ChargerStation => x !== null);

        setStations(formattedStations);
        setSelectedStation((prev) =>
          prev
            ? formattedStations.find((s) => s.id === prev.id) || formattedStations[0]
            : formattedStations[0]
        );
      } catch {
        setStationsError(
          "Failed to load OpenChargeMap data. Please try again."
        );
      } finally {
        setLoadingStations(false);
      }
    };

    fetchStations();
  }, [centerLat, centerLon]);

  const searchLocation = async (e: FormEvent) => {
    e.preventDefault();
    const q = locationSearch.trim();
    if (!q) {
      setSearchError("Enter a city or place name.");
      return;
    }

    try {
      setSearchError("");
      setLoadingSearch(true);

      const res = await fetch(
        `/api/nominatim?q=${encodeURIComponent(q)}`
      );
      const data = (await res.json()) as NominatimHit[] | { error?: string };

      if (!res.ok) {
        setSearchError(
          typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : "Location search failed."
        );
        return;
      }

      if (!Array.isArray(data) || data.length === 0) {
        setSearchError(
          "No results for that text. Try a shorter query (e.g. “Nungambakkam Chennai”) or check spelling."
        );
        return;
      }

      const hit = data[0] as NominatimHit;
      setCenterLat(Number(hit.lat));
      setCenterLon(Number(hit.lon));
      setResolvedPlaceLabel(hit.display_name ?? q);
    } catch {
      setSearchError("Failed to search location.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const selectedEmbedUrl = selectedStation
    ? `https://maps.google.com/maps?q=${selectedStation.lat},${selectedStation.lon}&z=15&output=embed`
    : "";

  return (
    <div>
      <h1 className="text-3xl font-bold">Charging Stations</h1>
      <p className="text-gray-600 mt-2">
        Free architecture: OpenChargeMap data + Nominatim search + Leaflet map.
      </p>

      <Card className="mt-6 rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Search Location</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <form onSubmit={searchLocation} className="flex gap-2">
            <Input
              placeholder="Type a city (e.g. Chennai, Coimbatore)"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
            />
            <Button type="submit" disabled={loadingSearch}>
              {loadingSearch ? "Searching..." : "Search"}
            </Button>
          </form>

          <div className="text-gray-700 text-sm space-y-1">
            <p>
              <b>Map center:</b> {centerLat.toFixed(4)}, {centerLon.toFixed(4)}
            </p>
            <p className="text-slate-600">
              <b>Place:</b> {resolvedPlaceLabel}
            </p>
          </div>

          {searchError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Search</AlertTitle>
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          )}

          {stationsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Stations</AlertTitle>
              <AlertDescription>{stationsError}</AlertDescription>
            </Alert>
          )}

          {loadingStations && (
            <p className="text-blue-600 font-medium">
              Loading stations from OpenChargeMap...
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Station map</CardTitle>
        </CardHeader>
        <CardContent>
          <Map
            centerLat={centerLat}
            centerLon={centerLon}
            stations={stations}
            selectedStationId={selectedStation?.id}
            onStationSelect={(station) => {
              const picked = stations.find((s) => s.id === station.id) || null;
              setSelectedStation(picked);
            }}
          />
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Station Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedStation ? (
            <>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{selectedStation.name}</p>
                <p className="text-sm text-slate-600">
                  {selectedStation.location || "Address unavailable"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{selectedStation.operator}</Badge>
                <Badge variant="outline">{selectedStation.usage}</Badge>
              </div>
              <p className="text-sm">{selectedStation.connectors}</p>

              {selectedEmbedUrl ? (
                <iframe
                  title="Station location in Google Maps"
                  src={selectedEmbedUrl}
                  className="w-full h-64 rounded-lg border"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : null}

              <Button asChild>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStation.lat},${selectedStation.lon}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Get Directions
                </a>
              </Button>
            </>
          ) : (
            <p className="text-slate-600">
              Click any station marker to view station details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
