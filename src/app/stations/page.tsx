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
import { EV_FULL_RANGE_KM, getDistanceKm } from "@/lib/stations";

type Station = {
  id: number;
  name: string;
  location: string;
  chargerType: string;
  status: string;
  lat: number;
  lon: number;
  distance?: number;
};

export default function StationsPage() {
  const [search, setSearch] = useState("");
  const [battery, setBattery] = useState(60);
  const [vehicleLat, setVehicleLat] = useState<number | null>(null);
  const [vehicleLon, setVehicleLon] = useState<number | null>(null);

  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const Map = dynamic(() => import("@/components/Map"), { ssr: false });

  const remainingRange = (battery / 100) * EV_FULL_RANGE_KM;

  // Get Live Location
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported in your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVehicleLat(pos.coords.latitude);
        setVehicleLon(pos.coords.longitude);
      },
      () => {
        setError("Location access denied. Please enable GPS permission.");
      }
    );
  }, []);

  // Fetch Live Nearby Stations from Overpass API
  useEffect(() => {
    if (!vehicleLat || !vehicleLon) return;

    const fetchStations = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/nearbyStations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: vehicleLat, lon: vehicleLon }),
        });

        const data = await res.json();

        if (!data.elements || data.elements.length === 0) {
          setStations([]);
          setError("No EV charging stations found nearby.");
          return;
        }

        const formattedStations: Station[] = data.elements
          .map((item: any, index: number) => {
            const lat = item.lat || item.center?.lat;
            const lon = item.lon || item.center?.lon;

            if (!lat || !lon) return null;

            return {
              id: item.id || index,
              name: item.tags?.name || "Unnamed Charging Station",
              location: item.tags?.["addr:city"] || "Nearby Area",
              chargerType: item.tags?.socket || "Unknown",
              status: "Available",
              lat,
              lon,
            };
          })
          .filter(Boolean);

        setStations(formattedStations);
      } catch (err) {
        setError("Overpass API is slow. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, [vehicleLat, vehicleLon]);

  // Filter reachable stations based on battery range
  const reachableStations =
    vehicleLat && vehicleLon
      ? stations
          .map((station) => {
            const distance = getDistanceKm(
              vehicleLat,
              vehicleLon,
              station.lat,
              station.lon
            );
            return { ...station, distance };
          })
          .filter((station) => station.distance! <= remainingRange)
      : [];

  // Search filtering
  const filteredStations = reachableStations.filter((station) =>
    (station.name + station.location + station.chargerType + station.status)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-3xl font-bold">Charging Stations</h1>
      <p className="text-gray-600 mt-2">
        Showing live nearby stations using OpenStreetMap (Overpass API).
      </p>

      {/* Vehicle Info */}
      <Card className="mt-6 rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Vehicle Status</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-gray-700">
            <b>Battery:</b> {battery}%
          </p>

          <p className="text-gray-700">
            <b>Remaining Range:</b> {remainingRange.toFixed(1)} km
          </p>

          {vehicleLat && vehicleLon ? (
            <p className="text-gray-700">
              <b>Current Location:</b> {vehicleLat.toFixed(4)},{" "}
              {vehicleLon.toFixed(4)}
            </p>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <p className="text-gray-500">Detecting location...</p>
          )}

          {/* Battery input */}
          <div className="mt-4">
            <label className="block font-medium text-gray-700">
              Set Battery %
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={battery}
              onChange={(e) => setBattery(Number(e.target.value))}
              className="mt-2 max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="mt-6 max-w-md">
        <Input
          placeholder="Search reachable station..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <p className="mt-4 text-blue-600 font-medium">
          Loading nearby EV charging stations...
        </p>
      )}

      {/* Stations Table */}
      <Card className="mt-6 rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Reachable Stations</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Charger Type</TableHead>
                <TableHead>Distance (KM)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredStations.length > 0 ? (
                filteredStations.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium">
                      {station.name}
                    </TableCell>
                    <TableCell>{station.location}</TableCell>
                    <TableCell>{station.chargerType}</TableCell>
                    <TableCell>{station.distance?.toFixed(2)} km</TableCell>
                    <TableCell>
                      <Badge className="bg-green-600">Available</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No reachable stations found based on current battery.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="mt-6 rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Station Map</CardTitle>
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