"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  powerLabel: string;
  maxPowerKw: number;
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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

            const maxPowerKw = Math.max(
              ...(item.Connections?.map((c) => c.PowerKW || 0) || [0])
            );
            const hasDC = item.Connections?.some((c) =>
              (c.CurrentType?.Title || "").toLowerCase().includes("dc")
            );
            const powerLabel =
              maxPowerKw > 0
                ? `${Math.round(maxPowerKw)}kW ${hasDC ? "DC" : "AC"}`
                : "Unknown Output";

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
              powerLabel,
              maxPowerKw,
            };
          })
          .filter((x): x is ChargerStation => x !== null);

        setStations(formattedStations);
        setSelectedStation((prev) =>
          prev
            ? formattedStations.find((s) => s.id === prev.id) || formattedStations[0]
            : formattedStations[0]
        );
        setIsDetailsOpen((prev) => prev && formattedStations.length > 0);
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

  const sortedStations = useMemo(
    () =>
      [...stations].sort((a, b) => {
        if (b.maxPowerKw !== a.maxPowerKw) return b.maxPowerKw - a.maxPowerKw;
        return a.name.localeCompare(b.name);
      }),
    [stations]
  );

  return (
    <div className="min-h-[calc(100vh-3rem)] rounded-2xl bg-slate-950 text-slate-100 p-4 md:p-6">
      <h1 className="text-3xl font-bold tracking-tight">Charging Stations</h1>
      <p className="text-slate-300 mt-2">
        Free architecture: OpenChargeMap data + Nominatim search + Leaflet map.
      </p>

      <Card className="mt-6 border-slate-700/60 bg-slate-900/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Search Location</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <form onSubmit={searchLocation} className="flex gap-2">
            <Input
              placeholder="Type a city (e.g. Chennai, Coimbatore)"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="border-slate-700 bg-slate-950/70"
            />
            <Button type="submit" disabled={loadingSearch}>
              {loadingSearch ? "Searching..." : "Search"}
            </Button>
          </form>

          <div className="text-slate-200 text-sm space-y-1">
            <p>
              <b>Map center:</b> {centerLat.toFixed(4)}, {centerLon.toFixed(4)}
            </p>
            <p className="text-slate-400">
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
            <p className="text-cyan-400 font-medium">
              Loading stations from OpenChargeMap...
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2 border-slate-700/60 bg-slate-900/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Stations ({sortedStations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh] pr-3">
              <div className="space-y-3">
                {sortedStations.map((station) => {
                  const isSelected = selectedStation?.id === station.id;
                  return (
                    <button
                      key={station.id}
                      type="button"
                      onClick={() => {
                        setSelectedStation(station);
                        setIsDetailsOpen(true);
                      }}
                      className="w-full text-left"
                    >
                      <Card
                        className={`border transition-colors ${
                          isSelected
                            ? "border-cyan-400/70 bg-slate-800/80"
                            : "border-slate-700/60 bg-slate-900/70 hover:bg-slate-800/70"
                        } backdrop-blur-sm`}
                      >
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-50">
                              {station.name}
                            </p>
                            <Badge className="bg-cyan-600 text-cyan-50">
                              {station.powerLabel}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-300">
                            {station.location || "Address unavailable"}
                          </p>
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {station.connectors}
                          </p>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
                {sortedStations.length === 0 && !loadingStations ? (
                  <p className="text-sm text-slate-400">
                    No stations to show for this area.
                  </p>
                ) : null}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-slate-700/60 bg-slate-900/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Map View</CardTitle>
          </CardHeader>
          <CardContent>
            <Map
              centerLat={centerLat}
              centerLon={centerLon}
              stations={sortedStations}
              selectedStationId={selectedStation?.id}
              onStationSelect={(station) => {
                const picked =
                  sortedStations.find((s) => s.id === station.id) || null;
                setSelectedStation(picked);
                setIsDetailsOpen(Boolean(picked));
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent
          side="right"
          className="w-[92vw] sm:max-w-xl border-slate-700 bg-slate-950/95 text-slate-100 backdrop-blur-lg"
        >
          {selectedStation ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">{selectedStation.name}</SheetTitle>
                <SheetDescription className="text-slate-300">
                  {selectedStation.location || "Address unavailable"}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-cyan-600 text-cyan-50">
                    {selectedStation.powerLabel}
                  </Badge>
                  <Badge variant="secondary">{selectedStation.operator}</Badge>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="map">Map</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="space-y-3 pt-3">
                    <p className="text-sm text-slate-200">
                      <span className="font-medium">Usage:</span>{" "}
                      {selectedStation.usage}
                    </p>
                    <p className="text-sm text-slate-300">
                      <span className="font-medium text-slate-100">
                        Connectors:
                      </span>{" "}
                      {selectedStation.connectors}
                    </p>
                    <p className="text-sm text-slate-400">
                      <MapPin className="inline h-4 w-4 mr-1" />
                      {selectedStation.lat.toFixed(5)},{" "}
                      {selectedStation.lon.toFixed(5)}
                    </p>
                  </TabsContent>
                  <TabsContent value="map" className="pt-3 space-y-3">
                    {selectedEmbedUrl ? (
                      <iframe
                        title="Station location in Google Maps"
                        src={selectedEmbedUrl}
                        className="w-full h-64 rounded-lg border border-slate-700"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : null}
                    <Button asChild className="w-full">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStation.lat},${selectedStation.lon}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get Directions
                      </a>
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : (
            <div className="p-4 text-slate-300">
              Select a station from the list or map.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
