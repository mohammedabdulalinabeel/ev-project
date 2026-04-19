"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { getDistanceKm } from "@/lib/stations";
import {
  chargingStationAddress,
  chargingStationConnectors,
  chargingStationDisplayName,
  type OsmTags,
} from "@/lib/formatOsmChargingStation";

type Station = {
  /** OSM `type/id` so node and way id collisions do not break React keys. */
  id: string;
  name: string;
  location: string;
  chargerType: string;
  status: string;
  lat: number;
  lon: number;
  distance?: number;
};

type NominatimHit = {
  lat: string;
  lon: string;
  display_name?: string;
};

export default function StationsPage() {
  const [search, setSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");

  const [vehicleLat, setVehicleLat] = useState<number | null>(null);
  const [vehicleLon, setVehicleLon] = useState<number | null>(null);
  const [resolvedPlaceLabel, setResolvedPlaceLabel] = useState<string | null>(
    null
  );

  const [stations, setStations] = useState<Station[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [geoError, setGeoError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [stationsError, setStationsError] = useState("");

  const Map = dynamic(() => import("@/components/Map"), { ssr: false });

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported in your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoError("");
        setVehicleLat(pos.coords.latitude);
        setVehicleLon(pos.coords.longitude);
        setResolvedPlaceLabel("Your device location");
      },
      () => {
        setGeoError(
          "GPS unavailable or denied. Use “Search Location” to pick a place on the map."
        );
      }
    );
  }, []);

  useEffect(() => {
    if (vehicleLat === null || vehicleLon === null) return;

    const fetchStations = async () => {
      try {
        setLoadingStations(true);
        setStationsError("");

        const res = await fetch("/api/nearbyStations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: vehicleLat, lon: vehicleLon }),
        });

        const data = await res.json();

        if (!res.ok) {
          setStations([]);
          setStationsError(
            typeof data.error === "string"
              ? data.error
              : "Could not load nearby stations."
          );
          return;
        }

        if (!data.elements || data.elements.length === 0) {
          setStations([]);
          setStationsError(
            "No EV charging stations found in OpenStreetMap within ~10 km of this point."
          );
          return;
        }

        const formattedStations: Station[] = data.elements
          .map(
            (
              item: {
                type?: string;
                id?: number;
                lat?: number;
                lon?: number;
                center?: { lat?: number; lon?: number };
                tags?: OsmTags;
              },
              index: number
            ) => {
              const lat = item.lat ?? item.center?.lat;
              const lon = item.lon ?? item.center?.lon;
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

              const tags = item.tags;
              const osmKey = `${item.type ?? "el"}/${item.id ?? index}`;
              return {
                id: osmKey,
                name: chargingStationDisplayName(tags),
                location: chargingStationAddress(tags),
                chargerType: chargingStationConnectors(tags),
                status: "Available",
                lat: lat as number,
                lon: lon as number,
              };
            }
          )
          .filter(Boolean) as Station[];

        setStations(formattedStations);
      } catch {
        setStationsError(
          "Failed to fetch stations. The map data service may be slow or busy."
        );
      } finally {
        setLoadingStations(false);
      }
    };

    fetchStations();
  }, [vehicleLat, vehicleLon]);

  const searchLocation = async () => {
    const q = locationSearch.trim();
    if (!q) {
      setSearchError("Enter an address or place name to search.");
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

      const hit = data[0];
      setVehicleLat(Number(hit.lat));
      setVehicleLon(Number(hit.lon));
      setResolvedPlaceLabel(hit.display_name ?? q);
    } catch {
      setSearchError("Failed to search location.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const stationsWithDistance =
    vehicleLat !== null && vehicleLon !== null
      ? stations.map((station) => ({
          ...station,
          distance: getDistanceKm(
            vehicleLat,
            vehicleLon,
            station.lat,
            station.lon
          ),
        }))
      : stations;

  const filteredStations = stationsWithDistance.filter((station) =>
    (station.name + station.location + station.chargerType)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-3xl font-bold">Charging Stations</h1>
      <p className="text-gray-600 mt-2">
        Search any location and view nearby EV charging points from OpenStreetMap
        (names and connectors depend on how well the area is mapped).
      </p>

      <Card className="mt-6 rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Search Location</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Input
            placeholder="Enter address or place (e.g. Anna Salai, Chennai)"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
          />

          <button
            type="button"
            onClick={searchLocation}
            disabled={loadingSearch}
            className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
          >
            {loadingSearch ? "Searching…" : "Search nearby stations"}
          </button>

          {vehicleLat !== null && vehicleLon !== null && (
            <div className="text-gray-700 text-sm space-y-1">
              <p>
                <b>Map center:</b> {vehicleLat.toFixed(4)}, {vehicleLon.toFixed(4)}
              </p>
              {resolvedPlaceLabel && (
                <p className="text-slate-600">
                  <b>Place:</b> {resolvedPlaceLabel}
                </p>
              )}
            </div>
          )}

          {geoError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Location</AlertTitle>
              <AlertDescription>{geoError}</AlertDescription>
            </Alert>
          )}

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
              Loading nearby charging stations…
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 max-w-md">
        <Input
          placeholder="Filter table by name, area, or connector…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="mt-6 rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Nearby stations (OpenStreetMap)</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Area / address (OSM)</TableHead>
                <TableHead>Connectors (OSM)</TableHead>
                <TableHead>Distance (km)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredStations.length > 0 ? (
                filteredStations.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium max-w-[200px]">
                      {station.name}
                    </TableCell>
                    <TableCell className="max-w-[240px] text-sm text-slate-700">
                      {station.location}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm">
                      {station.chargerType}
                    </TableCell>
                    <TableCell>
                      {station.distance?.toFixed(2) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-600">Mapped</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No rows match your filter, or no data loaded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Station map</CardTitle>
        </CardHeader>
        <CardContent>
          <Map
            vehicleLat={vehicleLat}
            vehicleLon={vehicleLon}
            filteredStations={filteredStations}
          />
        </CardContent>
      </Card>
    </div>
  );
}
