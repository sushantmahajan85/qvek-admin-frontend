'use client';

import * as React from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapData } from './api';

const FALLBACK = { lat: 12.9716, lng: 77.5946 }; // Bengaluru until shop is set

export function FleetMap({ data }: { data: MapData }) {
  const center = data.shop ?? firstFix(data) ?? FALLBACK;
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={11}
      scrollWheelZoom
      style={{ height: '60vh', minHeight: 420, width: '100%', borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {data.shop && (
        <>
          <CircleMarker center={[data.shop.lat, data.shop.lng]} radius={8} pathOptions={{ color: '#1C1C1C', fillColor: '#1C1C1C', fillOpacity: 1 }} />
          <Circle center={[data.shop.lat, data.shop.lng]} radius={data.zones.operationalKm * 1000} pathOptions={{ color: '#3FB950', weight: 1, fillOpacity: 0.03 }} />
          <Circle center={[data.shop.lat, data.shop.lng]} radius={data.zones.disarmKm * 1000} pathOptions={{ color: '#E5484D', weight: 1, dashArray: '6 4', fillOpacity: 0.02 }} />
        </>
      )}
      {data.vehicles
        .filter((v) => v.lat != null && v.lng != null)
        .map((v) => (
          <CircleMarker
            key={v.id}
            center={[v.lat as number, v.lng as number]}
            radius={9}
            pathOptions={{ color: v.color, fillColor: v.color, fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>
              <strong>{v.vehicleNo}</strong>
              <br />
              {v.status} · {v.zone ?? 'zone unknown'}
              <br />
              {v.lastPingAt ? new Date(v.lastPingAt).toLocaleString('en-IN') : 'no ping yet'}
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}

function firstFix(data: MapData): { lat: number; lng: number } | null {
  const v = data.vehicles.find((x) => x.lat != null && x.lng != null);
  return v ? { lat: v.lat as number, lng: v.lng as number } : null;
}

export function MapLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted2">
      <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#3FB950]" /> Operational</span>
      <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#E8A13D]" /> Warning</span>
      <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#E5484D]" /> Disarm zone</span>
      <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#A6A6A6]" /> Unknown</span>
    </div>
  );
}
