"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  EV_FULL_RANGE_KM,
  getDistanceKm,
  getMinDistanceToRoute,
  MOCK_STATIONS,
  type Station,
} from "@/lib/stations";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

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
  const remainingRange = (battery / 100) * EV_FULL_RANGE_KM;

  const reachableStations =
    routeCoords.length > 0
      ? MOCK_STATIONS.filter(
          (station) =>
            getMinDistanceToRoute(station.lat, station.lon, routeCoords) <=
            remainingRange
        )
      : vehicleLat && vehicleLon
      ? MOCK_STATIONS.filter(
          (station) =>
            getDistanceKm(
              vehicleLat,
              vehicleLon,
              station.lat,
              station.lon
            ) <= remainingRange
        )
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

      const response = await fetch("/api/route/ors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: `${vehicleLat}, ${vehicleLon}`,
          destination: `${station.lat}, ${station.lon}`,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        features?: Array<{
          geometry: { coordinates: number[][] };
          properties: {
            summary: { distance: number; duration: number };
            segments?: Array<{
              steps?: Array<{
                instruction: string;
                distance: number;
                duration: number;
              }>;
            }>;
          };
        }>;
        startCoords?: { lat: number; lon: number };
        destCoords?: { lat: number; lon: number };
      };

      if (!response.ok) {
        setError(
          typeof payload.error === "string"
            ? payload.error
            : "Route fetch failed. Try again."
        );
        return;
      }

      const feature = payload.features?.[0];
      if (!feature) {
        setError("No route data returned.");
        return;
      }

      const coords = feature.geometry.coordinates;
      const formattedCoords: [number, number][] = coords.map(
        (c) => [c[1], c[0]] as [number, number]
      );

      const distMeters = feature.properties.summary.distance;
      const durationSec = feature.properties.summary.duration;

      setRouteCoords(formattedCoords);
      setDistanceKm(distMeters / 1000);
      setDurationMin(durationSec / 60);

      setResolvedDest(station.name);

      const routeSteps =
        feature.properties.segments?.[0]?.steps ?? [];

      setSteps(
        routeSteps.map((s) => ({
          instruction: s.instruction,
          distance: s.distance,
          duration: s.duration,
        }))
      );

      if (payload.startCoords) {
        setVehicleLat(payload.startCoords.lat);
        setVehicleLon(payload.startCoords.lon);
      }

      if (payload.destCoords) {
        setDestLat(payload.destCoords.lat);
        setDestLon(payload.destCoords.lon);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Route fetch failed. Try again."
      );
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