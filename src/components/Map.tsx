"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface MapProps {
  vehicleLat: number | null;
  vehicleLon: number | null;
  filteredStations: Array<{
    id: number | string;
    name: string;
    lat: number;
    lon: number;
  }>;
}

// Current location icon (Blue)
const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// Charging station icon (Green EV)
const stationIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1048/1048314.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

function FitStationsAndUser({
  userLat,
  userLon,
  stations,
  boundsRevision,
}: {
  userLat: number | null;
  userLon: number | null;
  stations: MapProps["filteredStations"];
  boundsRevision: string;
}) {
  const map = useMap();
  const stationsRef = useRef(stations);
  stationsRef.current = stations;

  useEffect(() => {
    const list = stationsRef.current;
    const points: L.LatLngExpression[] = [];
    if (userLat != null && userLon != null) {
      points.push([userLat, userLon]);
    }
    for (const s of list) {
      points.push([s.lat, s.lon]);
    }
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0] as L.LatLngTuple, 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [map, userLat, userLon, boundsRevision]);

  return null;
}

export default function Map({
  vehicleLat,
  vehicleLon,
  filteredStations,
}: MapProps) {
  const hasUser =
    vehicleLat != null &&
    vehicleLon != null &&
    Number.isFinite(vehicleLat) &&
    Number.isFinite(vehicleLon);

  const center: [number, number] = hasUser
    ? [vehicleLat, vehicleLon]
    : [13.0827, 80.2707];

  const boundsRevision = useMemo(
    () =>
      `${vehicleLat ?? ""},${vehicleLon ?? ""}|${filteredStations
        .map((s) => `${s.id}:${s.lat},${s.lon}`)
        .join(";")}`,
    [vehicleLat, vehicleLon, filteredStations]
  );

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "400px", width: "100%", borderRadius: "16px" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      <FitStationsAndUser
        userLat={hasUser ? vehicleLat : null}
        userLon={hasUser ? vehicleLon : null}
        stations={filteredStations}
        boundsRevision={boundsRevision}
      />

      {hasUser && (
        <Marker position={[vehicleLat!, vehicleLon!]} icon={userIcon}>
          <Popup>
            <b>Your Location</b>
          </Popup>
        </Marker>
      )}

      {filteredStations.map((station) => (
        <Marker
          key={String(station.id)}
          position={[station.lat, station.lon]}
          icon={stationIcon}
        >
          <Popup>
            <b>{station.name}</b>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}