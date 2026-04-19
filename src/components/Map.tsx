"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export type ChargerMapMarker = {
  id: number | string;
  name: string;
  lat: number;
  lon: number;
  location?: string;
};

interface MapProps {
  centerLat: number;
  centerLon: number;
  stations: ChargerMapMarker[];
  selectedStationId?: number | string;
  onStationSelect?: (station: ChargerMapMarker) => void;
}

// Search center icon (Blue)
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

function FlyToCenter({
  lat,
  lon,
  zoom = 13,
}: {
  lat: number;
  lon: number;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lon], zoom, { duration: 0.8 });
  }, [map, lat, lon, zoom]);

  return null;
}

export default function Map({
  centerLat,
  centerLon,
  stations,
  selectedStationId,
  onStationSelect,
}: MapProps) {
  const center: [number, number] = [centerLat, centerLon];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "400px", width: "100%", borderRadius: "16px" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      <FlyToCenter lat={centerLat} lon={centerLon} />

      <Marker position={[centerLat, centerLon]} icon={userIcon}>
        <Popup>
          <b>Search center</b>
        </Popup>
      </Marker>

      {stations.map((station) => (
        <Marker
          key={String(station.id)}
          position={[station.lat, station.lon]}
          icon={stationIcon}
          eventHandlers={{
            click: () => onStationSelect?.(station),
          }}
        >
          <Popup>
            <div className="space-y-1 text-sm">
              <b>{station.name}</b>
              {station.location ? <p>{station.location}</p> : null}
              {selectedStationId === station.id ? (
                <p className="text-green-600 font-medium">Selected</p>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}