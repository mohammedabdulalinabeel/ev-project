"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface RouteMapProps {
  vehicleLat: number | null;
  vehicleLon: number | null;
  destLat: number | null;
  destLon: number | null;
  resolvedStart: string;
  resolvedDest: string;
  routeCoords: [number, number][];
  reachableStations?: Array<{
    id: number;
    name: string;
    lat: number;
    lon: number;
    status: string;
    chargerType: string;
  }>;
  onRouteToStation?: (station: any) => void;
}

// Auto fit route bounds component
function FitBounds({ routeCoords }: { routeCoords: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (routeCoords.length > 0) {
      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeCoords, map]);

  return null;
}

export default function RouteMap({
  vehicleLat,
  vehicleLon,
  destLat,
  destLon,
  resolvedStart,
  resolvedDest,
  routeCoords,
  reachableStations = [],
  onRouteToStation,
}: RouteMapProps) {
  const startPoint: [number, number] | null =
    routeCoords.length > 0 ? routeCoords[0] : vehicleLat && vehicleLon
    ? [vehicleLat, vehicleLon]
    : null;

  const endPoint: [number, number] | null =
    routeCoords.length > 0
      ? routeCoords[routeCoords.length - 1]
      : destLat && destLon
      ? [destLat, destLon]
      : null;

  const center: [number, number] =
    startPoint || [13.0827, 80.2707]; // Chennai default

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{
        height: "450px",
        width: "100%",
        borderRadius: "16px",
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {/* Auto zoom to route */}
      {routeCoords.length > 0 && <FitBounds routeCoords={routeCoords} />}

      {/* Start Marker */}
      {startPoint && (
        <Marker position={startPoint}>
          <Popup>
            <div className="text-sm">
              <b>Start</b>
              <div>{resolvedStart || "Start Location"}</div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Destination Marker */}
      {endPoint && (
        <Marker position={endPoint}>
          <Popup>
            <div className="text-sm">
              <b>Destination</b>
              <div>{resolvedDest || "Destination Location"}</div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Reachable Charging Stations */}
      {reachableStations.map((station) => (
        <Marker key={station.id} position={[station.lat, station.lon]}>
          <Popup>
            <div className="text-sm">
              <b className="text-green-700">EV Station</b>
              <div>{station.name}</div>
              <div className="text-xs text-slate-500">{station.chargerType}</div>
              <div className="text-xs font-semibold">{station.status}</div>
              {onRouteToStation && (
                <button
                  onClick={() => onRouteToStation(station)}
                  className="mt-2 w-full bg-blue-600 text-white rounded px-2 py-1 text-xs hover:bg-blue-700 transition"
                >
                  Get Route
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Route Line */}
      {routeCoords.length > 0 && (
        <Polyline positions={routeCoords} pathOptions={{ color: "blue" }} />
      )}
    </MapContainer>
  );
}