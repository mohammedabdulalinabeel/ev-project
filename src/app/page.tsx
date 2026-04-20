"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, MapPin } from "lucide-react";

import { ModeToggle } from "@/components/ModeToggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function HomePage() {
  const [locationSearch, setLocationSearch] = useState("Chennai");
  const [centerLat, setCenterLat] = useState(13.0827);
  const [centerLon, setCenterLon] = useState(80.2707);
  const [resolvedPlaceLabel, setResolvedPlaceLabel] = useState("Chennai");
  const [stations, setStations] = useState<ChargerStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<ChargerStation | null>(
    null
  );
  const [loadingStations, setLoadingStations] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [stationsError, setStationsError] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
              item.Connections?.slice(0, 4).map((connection) => {
                const base = connection.ConnectionType?.Title || "Connector";
                const power = connection.PowerKW ? `${connection.PowerKW}kW` : null;
                const quantity = connection.Quantity
                  ? `x${connection.Quantity}`
                  : null;

                return [base, power, quantity].filter(Boolean).join(" ");
              }) || [];

            const maxPowerKw = Math.max(
              ...(item.Connections?.map((connection) => connection.PowerKW || 0) || [
                0,
              ])
            );

            const hasDC = item.Connections?.some((connection) =>
              (connection.CurrentType?.Title || "").toLowerCase().includes("dc")
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
              lat: lat as number,
              lon: lon as number,
              location: [
                item.AddressInfo?.AddressLine1,
                item.AddressInfo?.Town,
                item.AddressInfo?.StateOrProvince,
              ]
                .filter(Boolean)
                .join(", "),
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
          .filter((station): station is ChargerStation => station !== null);

        setStations(formattedStations);
        setSelectedStation((prev) =>
          prev
            ? formattedStations.find((station) => station.id === prev.id) ||
              formattedStations[0]
            : formattedStations[0]
        );
        setIsDetailsOpen((prev) => prev && formattedStations.length > 0);
      } catch {
        setStationsError("Failed to load OpenChargeMap data. Please try again.");
      } finally {
        setLoadingStations(false);
      }
    };

    fetchStations();
  }, [centerLat, centerLon]);

  const searchLocation = async (event: FormEvent) => {
    event.preventDefault();

    const query = locationSearch.trim();
    if (!query) {
      setSearchError("Enter a city or place name.");
      return;
    }

    try {
      setSearchError("");
      setLoadingSearch(true);

      const res = await fetch(`/api/nominatim?q=${encodeURIComponent(query)}`);
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
        setSearchError('No results. Try a shorter query like "Guindy Chennai".');
        return;
      }

      const hit = data[0];
      setCenterLat(Number(hit.lat));
      setCenterLon(Number(hit.lon));
      setResolvedPlaceLabel(hit.display_name ?? query);
    } catch {
      setSearchError("Failed to search location.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const sortedStations = useMemo(
    () =>
      [...stations].sort((a, b) => {
        if (b.maxPowerKw !== a.maxPowerKw) return b.maxPowerKw - a.maxPowerKw;
        return a.name.localeCompare(b.name);
      }),
    [stations]
  );

  const selectedEmbedUrl = selectedStation
    ? `https://maps.google.com/maps?q=${selectedStation.lat},${selectedStation.lon}&z=15&output=embed`
    : "";

  return (
    <div className="min-h-screen bg-slate-100 text-foreground transition duration-300 ease-in-out dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              EV-CSMS
            </h1>
            <p className="mt-1 text-muted-foreground">
              Find nearby charging stations with OpenChargeMap, Nominatim,
              Leaflet, and Google Maps directions.
            </p>
          </div>

          <ModeToggle />
        </div>

        <Card className="border border-border bg-background shadow-sm transition duration-300 ease-in-out">
          <CardHeader>
            <CardTitle className="text-foreground">Search Location</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <form
              onSubmit={searchLocation}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <Input
                placeholder="Type a city (e.g. Chennai, Coimbatore)"
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
                className="bg-muted text-foreground placeholder:text-muted-foreground transition duration-300 ease-in-out"
              />

              <Button
                type="submit"
                disabled={loadingSearch}
                className="bg-indigo-600 text-white transition duration-300 ease-in-out hover:bg-indigo-700"
              >
                {loadingSearch ? "Searching..." : "Search"}
              </Button>
            </form>

            <div className="space-y-1 text-sm text-foreground">
              <p>
                <span className="font-semibold">Map center:</span>{" "}
                {centerLat.toFixed(4)}, {centerLon.toFixed(4)}
              </p>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">Place:</span>{" "}
                {resolvedPlaceLabel}
              </p>
            </div>

            {searchError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Search</AlertTitle>
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            ) : null}

            {stationsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Stations</AlertTitle>
                <AlertDescription>{stationsError}</AlertDescription>
              </Alert>
            ) : null}

            {loadingStations ? (
              <p className="font-medium text-indigo-600">
                Loading stations from OpenChargeMap...
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="border border-border bg-background shadow-sm transition duration-300 ease-in-out lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-foreground">
                Stations ({sortedStations.length})
              </CardTitle>
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
                        className="w-full text-left transition duration-300 ease-in-out"
                      >
                        <Card
                          className={`border shadow-sm transition duration-300 ease-in-out ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                              : "border-border bg-background hover:bg-muted"
                          }`}
                        >
                          <CardContent className="space-y-2 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-foreground">
                                {station.name}
                              </p>
                              <Badge className="bg-indigo-600 text-white">
                                {station.powerLabel}
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground">
                              {station.location || "Address unavailable"}
                            </p>

                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {station.connectors}
                            </p>
                          </CardContent>
                        </Card>
                      </button>
                    );
                  })}

                  {sortedStations.length === 0 && !loadingStations ? (
                    <p className="text-sm text-muted-foreground">
                      No stations to show for this area.
                    </p>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border border-border bg-background shadow-sm transition duration-300 ease-in-out lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-foreground">Map View</CardTitle>
            </CardHeader>

            <CardContent>
              <Map
                centerLat={centerLat}
                centerLon={centerLon}
                stations={sortedStations}
                selectedStationId={selectedStation?.id}
                onStationSelect={(station) => {
                  const picked =
                    sortedStations.find((item) => item.id === station.id) ||
                    null;
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
            className="w-[92vw] border border-border bg-background text-foreground transition duration-300 ease-in-out sm:max-w-xl"
          >
            {selectedStation ? (
              <>
                <SheetHeader>
                  <SheetTitle className="text-xl text-foreground">
                    {selectedStation.name}
                  </SheetTitle>
                  <SheetDescription className="text-muted-foreground">
                    {selectedStation.location || "Address unavailable"}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-4 px-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Badge className="bg-indigo-600 text-white">
                      {selectedStation.powerLabel}
                    </Badge>
                    <Badge variant="secondary">{selectedStation.operator}</Badge>
                  </div>

                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="map">Map</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-3 pt-3">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">Usage:</span>{" "}
                        {selectedStation.usage}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Connectors:
                        </span>{" "}
                        {selectedStation.connectors}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        <MapPin className="mr-1 inline h-4 w-4" />
                        {selectedStation.lat.toFixed(5)},{" "}
                        {selectedStation.lon.toFixed(5)}
                      </p>
                    </TabsContent>

                    <TabsContent value="map" className="space-y-3 pt-3">
                      {selectedEmbedUrl ? (
                        <iframe
                          title="Station location in Google Maps"
                          src={selectedEmbedUrl}
                          className="h-64 w-full rounded-lg border border-border"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      ) : null}

                      <Button
                        asChild
                        className="w-full bg-indigo-600 text-white transition duration-300 ease-in-out hover:bg-indigo-700"
                      >
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
              <div className="p-4 text-muted-foreground">
                Select a station from the list or map.
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
