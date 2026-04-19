"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, MapPin } from "lucide-react";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type Station = {
  id: number;
  name: string;
  location: string;
  chargerType: string;
  status: string;
  lat: number;
  lon: number;
};

const stations: Station[] = [
  {
    id: 1,
    name: "EV Station - T Nagar",
    location: "Chennai",
    chargerType: "Fast Charger",
    status: "Available",
    lat: 13.0418,
    lon: 80.2341,
  },
  {
    id: 2,
    name: "EV Station - Velachery",
    location: "Chennai",
    chargerType: "Normal Charger",
    status: "Busy",
    lat: 12.9756,
    lon: 80.2209,
  },
  {
    id: 3,
    name: "EV Station - Anna Nagar",
    location: "Chennai",
    chargerType: "Fast Charger",
    status: "Offline",
    lat: 13.0878,
    lon: 80.2102,
  },
  {
    id: 4,
    name: "EV Station - Guindy",
    location: "Chennai",
    chargerType: "Fast Charger",
    status: "Available",
    lat: 13.0067,
    lon: 80.2206,
  },
];

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getMinDistanceToRoute(stationLat: number, stationLon: number, routeCoords: [number, number][]) {
  if (routeCoords.length === 0) return Infinity;
  let minDistance = Infinity;
  for (const [lat, lon] of routeCoords) {
    const dist = getDistanceKm(stationLat, stationLon, lat, lon);
    if (dist < minDistance) minDistance = dist;
  }
  return minDistance;
}

interface Suggestion {
  label: string;
  lat: number;
  lon: number;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

export default function RoutePlannerPage() {

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);

  const [steps, setSteps] = useState<RouteStep[]>([]);

  const [error, setError] = useState("");
  const [vehicleLat, setVehicleLat] = useState<number | null>(null);
  const [vehicleLon, setVehicleLon] = useState<number | null>(null);
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLon, setDestLon] = useState<number | null>(null);

  const [resolvedDest, setResolvedDest] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const [battery, setBattery] = useState(60);
  const FULL_RANGE_KM = 300;
  const remainingRange = (battery / 100) * FULL_RANGE_KM;

  const reachableStations =
    routeCoords.length > 0
      ? stations.filter((station) => getMinDistanceToRoute(station.lat, station.lon, routeCoords) <= remainingRange)
      : vehicleLat && vehicleLon
      ? stations.filter((station) => getDistanceKm(vehicleLat, vehicleLon, station.lat, station.lon) <= remainingRange)
      : [];

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVehicleLat(pos.coords.latitude);
        setVehicleLon(pos.coords.longitude);
      },
      () => {
        setError("Location access denied. Enable GPS permission.");
      }
    );
  }, []);

  const findRouteToStation = async (station: Station) => {
    if (!vehicleLat || !vehicleLon) {
      setError("Waiting for live location...");
      return;
    }

    try {
      setError("");
      setIsLoading(true);

      const response = await axios.post("/api/route/ors", {
        start: `${vehicleLat}, ${vehicleLon}`,
        destination: `${station.lat}, ${station.lon}`,
      });

      const coords = response.data.features[0].geometry.coordinates;
      const formattedCoords = coords.map((c: number[]) => [c[1], c[0]]);

      const distMeters = response.data.features[0].properties.summary.distance;
      const durationSec = response.data.features[0].properties.summary.duration;

      setRouteCoords(formattedCoords);
      setDistanceKm(distMeters / 1000);
      setDurationMin(durationSec / 60);

      setResolvedDest(station.name);

      // steps
      const routeSteps =
        response.data.features[0].properties.segments?.[0]?.steps || [];

      setSteps(
        routeSteps.map((s: any) => ({
          instruction: s.instruction,
          distance: s.distance,
          duration: s.duration,
        }))
      );

      if (response.data.startCoords) {
        setVehicleLat(response.data.startCoords.lat);
        setVehicleLon(response.data.startCoords.lon);
      }

      if (response.data.destCoords) {
        setDestLat(response.data.destCoords.lat);
        setDestLon(response.data.destCoords.lon);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Route fetch failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Route Planner</h1>
      <p className="text-gray-600 mt-2">
        Plan route and show navigation path using OpenStreetMap.
      </p>

      <Card className="mt-6 rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Live Location & Battery</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Battery Setup */}
          <div className="mt-2 text-sm text-gray-600 bg-slate-50 p-3 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <label className="font-medium text-gray-700 flex-1">EV Battery (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={battery}
                onChange={(e) => setBattery(Number(e.target.value))}
                className="w-24 ml-2"
              />
            </div>
            <p>Estimated Range: <span className="font-semibold text-green-600">{remainingRange.toFixed(1)} km</span></p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {isLoading && <p className="text-blue-600">Finding route...</p>}

          {distanceKm && (
            <div className="space-y-1">
              <p className="text-green-600 font-semibold">
                Distance: {distanceKm.toFixed(2)} km
              </p>
              {durationMin !== null && (
                <p className="text-green-600 font-semibold">
                  Duration: {durationMin.toFixed(1)} min
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="mt-6 rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Route Map</CardTitle>
        </CardHeader>

        <CardContent>
          {resolvedDest && (
            <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">From:</span> Live Location
              </p>
              <p>
                <span className="font-semibold">To:</span> {resolvedDest}
              </p>
            </div>
          )}

            <RouteMap
              vehicleLat={vehicleLat}
              vehicleLon={vehicleLon}
              destLat={destLat}
              destLon={destLon}
              routeCoords={routeCoords}
              resolvedStart="Live Location"
              resolvedDest={resolvedDest}
              reachableStations={reachableStations}
              onRouteToStation={findRouteToStation}
            />
          </CardContent>
      </Card>

      {/* Steps */}
      {steps.length > 0 && (
        <Card className="mt-6 rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle>Navigation Steps</CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="space-y-3 text-sm text-slate-700">
              {steps.map((step, index) => (
                <li
                  key={index}
                  className="rounded-xl border bg-white p-3 shadow-sm"
                >
                  <p className="font-semibold">
                    {index + 1}. {step.instruction}
                  </p>
                  <p className="text-slate-500">
                    Distance: {(step.distance / 1000).toFixed(2)} km | Time:{" "}
                    {(step.duration / 60).toFixed(1)} min
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}