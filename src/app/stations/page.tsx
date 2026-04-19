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
import {
  EV_FULL_RANGE_KM,
  getDistanceKm,
  MOCK_STATIONS,
} from "@/lib/stations";

export default function StationsPage() {
  const [search, setSearch] = useState("");
  const [battery, setBattery] = useState(60);
  const [vehicleLat, setVehicleLat] = useState<number | null>(null);
  const [vehicleLon, setVehicleLon] = useState<number | null>(null);
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

  // Filter reachable stations
  const reachableStations =
    vehicleLat && vehicleLon
      ? MOCK_STATIONS.map((station) => {
            const distance = getDistanceKm(
              vehicleLat,
              vehicleLon,
              station.lat,
              station.lon
            );
            return { ...station, distance };
          })
          .filter((station) => station.distance <= remainingRange)
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
        Automatically showing reachable stations based on battery and location.
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
                    <TableCell>{station.distance.toFixed(2)} km</TableCell>
                    <TableCell>
                      {station.status === "Available" && (
                        <Badge className="bg-green-600">Available</Badge>
                      )}
                      {station.status === "Busy" && (
                        <Badge className="bg-orange-600">Busy</Badge>
                      )}
                      {station.status === "Offline" && (
                        <Badge className="bg-red-600">Offline</Badge>
                      )}
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
          <Map vehicleLat={vehicleLat} vehicleLon={vehicleLon} filteredStations={filteredStations} />
        </CardContent>
      </Card>
    </div>
  );
}