"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface MapProps {
  vehicleLat: number | null;
  vehicleLon: number | null;
  filteredStations: Array<{
    id: number;
    name: string;
    lat: number;
    lon: number;
  }>;
}

const defaultIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function Map({
  vehicleLat,
  vehicleLon,
  filteredStations,
}: MapProps) {
  const center: [number, number] = [
    vehicleLat || 13.0827,
    vehicleLon || 80.2707,
  ];

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

      {vehicleLat && vehicleLon && (
        <Marker position={[vehicleLat, vehicleLon]} icon={defaultIcon}>
          <Popup>
            <b>Your Location</b>
          </Popup>
        </Marker>
      )}

      {filteredStations.map((station) => (
        <Marker
          key={station.id}
          position={[station.lat, station.lon]}
          icon={defaultIcon}
        >
          <Popup>
            <b>{station.name}</b>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}