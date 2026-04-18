"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

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
  const [start, setStart] = useState("");
  const [destination, setDestination] = useState("");

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);

  const [steps, setSteps] = useState<RouteStep[]>([]);

  const [error, setError] = useState("");
  const [vehicleLat, setVehicleLat] = useState<number | null>(null);
  const [vehicleLon, setVehicleLon] = useState<number | null>(null);
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLon, setDestLon] = useState<number | null>(null);

  const [resolvedStart, setResolvedStart] = useState("");
  const [resolvedDest, setResolvedDest] = useState("");

  const [startSuggestions, setStartSuggestions] = useState<Suggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<Suggestion[]>([]);

  const [isLoading, setIsLoading] = useState(false);

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

  // Start suggestions
  useEffect(() => {
    if (!start.trim()) {
      setStartSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/route/geocode?query=${encodeURIComponent(start)}`
        );
        const data = await response.json();
        if (response.ok) setStartSuggestions(data.suggestions || []);
        else setStartSuggestions([]);
      } catch {
        setStartSuggestions([]);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [start]);

  // Destination suggestions
  useEffect(() => {
    if (!destination.trim()) {
      setDestSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/route/geocode?query=${encodeURIComponent(destination)}`
        );
        const data = await response.json();
        if (response.ok) setDestSuggestions(data.suggestions || []);
        else setDestSuggestions([]);
      } catch {
        setDestSuggestions([]);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [destination]);

  const findRoute = async () => {
    try {
      setError("");
      setIsLoading(true);

      if (!start || !destination) {
        setError("Please enter start and destination place names.");
        return;
      }

      const response = await axios.post("/api/route/ors", {
        start,
        destination,
      });

      const coords = response.data.features[0].geometry.coordinates;
      const formattedCoords = coords.map((c: number[]) => [c[1], c[0]]);

      const distMeters = response.data.features[0].properties.summary.distance;
      const durationSec = response.data.features[0].properties.summary.duration;

      setRouteCoords(formattedCoords);
      setDistanceKm(distMeters / 1000);
      setDurationMin(durationSec / 60);

      setResolvedStart(start);
      setResolvedDest(destination);

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
          <CardTitle>Enter Route Details</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Start */}
          <div className="relative">
            <label className="block font-medium text-gray-700">
              Start Location
            </label>
            <Input
              placeholder="e.g., Chennai Airport"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-2"
            />
            {startSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
                {startSuggestions.map((suggestion) => (
                  <li
                    key={`${suggestion.lat}-${suggestion.lon}`}
                    onClick={() => {
                      setStart(suggestion.label);
                      setResolvedStart(suggestion.label);
                      setStartSuggestions([]);
                    }}
                    className="cursor-pointer px-3 py-2 hover:bg-slate-100"
                  >
                    {suggestion.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="block font-medium text-gray-700">
              Destination Location
            </label>
            <Input
              placeholder="e.g., T.T.K. Road"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-2"
            />
            {destSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
                {destSuggestions.map((suggestion) => (
                  <li
                    key={`${suggestion.lat}-${suggestion.lon}`}
                    onClick={() => {
                      setDestination(suggestion.label);
                      setResolvedDest(suggestion.label);
                      setDestSuggestions([]);
                    }}
                    className="cursor-pointer px-3 py-2 hover:bg-slate-100"
                  >
                    {suggestion.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-red-600">{error}</p>}

          <Button onClick={findRoute} className="w-full" disabled={isLoading}>
            {isLoading ? "Finding route..." : "Get Route"}
          </Button>

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
          {resolvedStart && resolvedDest && (
            <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">From:</span> {resolvedStart}
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
            resolvedStart={resolvedStart}
            resolvedDest={resolvedDest}
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