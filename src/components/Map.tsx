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

// Search center icon (Red Pin)
const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Charging station icon (Location Pin)
const stationIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function FitMapBounds({
  centerLat,
  centerLon,
  stations,
}: {
  centerLat: number;
  centerLon: number;
  stations: ChargerMapMarker[];
}) {
  const map = useMap();

  useEffect(() => {
    if (stations.length === 0) {
      map.flyTo([centerLat, centerLon], 13, { duration: 0.8 });
      return;
    }

    const bounds = L.latLngBounds([
      [centerLat, centerLon],
      ...stations.map((s) => [s.lat, s.lon] as [number, number]),
    ]);

    map.flyToBounds(bounds, { padding: [50, 50], duration: 0.8 });
  }, [map, centerLat, centerLon, stations]);

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
      style={{ height: "400px", width: "100%", borderRadius: "16px", zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      <FitMapBounds centerLat={centerLat} centerLon={centerLon} stations={stations} />

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