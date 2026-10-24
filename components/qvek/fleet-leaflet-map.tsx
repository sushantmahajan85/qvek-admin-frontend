"use client";

/* Live fleet map on Leaflet + OpenStreetMap (replaces the static SVG grid):
 * hub + zone circles, vehicle pins colored by backend zone, click → select.
 * Data: GET /admin/map every 60s. No-signal vehicles are listed, not pinned.
 */

import * as React from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAdminMap } from '@/features/fleet/hooks';

function pin(color: string, selected: boolean, label: string): L.DivIcon {
  return L.divIcon({
    className: 'fleet-pin',
    html:
      `<span style="display:block;width:18px;height:18px;border-radius:50%;` +
      `background:${color};border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4);` +
      `${selected ? 'outline:3px solid #1C1C1C;' : ''}"></span>` +
      `<span style="display:block;margin-top:2px;font-size:10px;font-weight:700;color:#1C1C1C;` +
      `background:rgba(255,255,255,.85);border-radius:4px;padding:0 4px;white-space:nowrap;">${label}</span>`,
    iconSize: [18, 36],
    iconAnchor: [9, 9],
  });
}

const hubIcon = L.divIcon({
  className: 'fleet-hub',
  html: '<span style="display:block;width:14px;height:14px;border-radius:50%;background:#1C1C1C;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4);"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function FleetLeafletMap({
  visibleIds,
  selectedId,
  onSelect,
}: {
  visibleIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useAdminMap();
  const data = map.data;
  const pins = React.useMemo(
    () => (data?.vehicles ?? []).filter((v) => v.lat != null && v.lng != null && visibleIds.has(v.id)),
    [data, visibleIds],
  );
  const center = React.useMemo<[number, number]>(() => {
    if (data?.shop) return [data.shop.lat, data.shop.lng];
    const p = pins[0];
    if (p?.lat != null && p?.lng != null) return [p.lat, p.lng];
    return [28.6139, 77.209];
  }, [data, pins]);

  if (map.isLoading) {
    return (
      <div className="map-stage" style={{ display: 'grid', placeItems: 'center' }}>
        <span className="spinner" />
      </div>
    );
  }
  if (map.isError || !data) {
    return (
      <div className="map-stage" style={{ display: 'grid', placeItems: 'center' }}>
        <p className="cell-sub">
          Map unavailable.{' '}
          <button type="button" className="link" onClick={() => map.refetch()}>
            Retry
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="map-stage">
      <MapContainer
        key={`${center[0]},${center[1]}`}
        center={center}
        zoom={11}
        scrollWheelZoom
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {data.shop ? (
          <>
            <Marker position={[data.shop.lat, data.shop.lng]} icon={hubIcon} interactive={false} />
            <Circle
              center={[data.shop.lat, data.shop.lng]}
              radius={data.zones.operationalKm * 1000}
              pathOptions={{ color: '#20C76B', weight: 2, fillColor: '#20C76B', fillOpacity: 0.06 }}
            />
            <Circle
              center={[data.shop.lat, data.shop.lng]}
              radius={data.zones.disarmKm * 1000}
              pathOptions={{ color: '#F5B942', weight: 2, fillColor: '#F5B942', fillOpacity: 0.05 }}
            />
          </>
        ) : null}
        {pins.map((v) => (
          <Marker
            key={v.id}
            position={[v.lat as number, v.lng as number]}
            icon={pin(v.color, v.id === selectedId, v.vehicleNo)}
            eventHandlers={{ click: () => onSelect(v.id) }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
