"use client";

/* Live fleet map on Google Maps (replaces the Leaflet/OSM version):
 * hub + zone circles, vehicle pins colored by backend zone, click → select.
 * Data: GET /admin/map every 60s. No-signal vehicles are listed, not pinned.
 * Needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (HTTP-referrer-restricted web key).
 */

import * as React from 'react';
import { Circle, GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useAdminMap } from '@/features/fleet/hooks';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const containerStyle = { width: '100%', height: '100%' } as const;

function DotIcon(color: string, selected: boolean): google.maps.Symbol | undefined {
  if (typeof window === 'undefined' || !window.google) return undefined;
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: selected ? '#1C1C1C' : '#ffffff',
    strokeWeight: selected ? 4 : 3,
    scale: selected ? 11 : 9,
  };
}

const HUB_ICON: google.maps.Symbol | undefined =
  typeof window !== 'undefined' && window.google
    ? {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#1C1C1C',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 7,
      }
    : undefined;

export function FleetGoogleMap({
  visibleIds,
  selectedId,
  onSelect,
}: {
  visibleIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useAdminMap();
  const [retryKey, setRetryKey] = React.useState(0);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'qvek-fleet-map',
    googleMapsApiKey: API_KEY || 'missing-key',
  });
  const data = map.data;
  const pins = React.useMemo(
    () => (data?.vehicles ?? []).filter((v) => v.lat != null && v.lng != null && visibleIds.has(v.id)),
    [data, visibleIds],
  );
  const center = React.useMemo<{ lat: number; lng: number }>(() => {
    if (data?.shop) return { lat: data.shop.lat, lng: data.shop.lng };
    const p = pins[0];
    if (p?.lat != null && p?.lng != null) return { lat: p.lat, lng: p.lng };
    return { lat: 28.6139, lng: 77.209 };
  }, [data, pins]);

  if (!API_KEY) {
    return (
      <div className="map-stage" style={{ display: 'grid', placeItems: 'center' }}>
        <p className="cell-sub" style={{ maxWidth: 420, textAlign: 'center' }}>
          Google Maps API key is not configured. Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> (HTTP-referrer-restricted web
          key) and restart the app.
        </p>
      </div>
    );
  }
  if (map.isLoading || !isLoaded) {
    return (
      <div className="map-stage" style={{ display: 'grid', placeItems: 'center' }}>
        <span className="spinner" />
      </div>
    );
  }
  if (map.isError || !data || loadError) {
    return (
      <div className="map-stage" style={{ display: 'grid', placeItems: 'center' }}>
        <p className="cell-sub">
          Map unavailable.{' '}
          <button
            type="button"
            className="link"
            onClick={() => {
              map.refetch();
              setRetryKey((k) => k + 1);
            }}
          >
            Retry
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="map-stage" key={retryKey}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={11} options={{ streetViewControl: false, mapTypeControl: false }}>
        {data.shop ? (
          <>
            <Marker position={{ lat: data.shop.lat, lng: data.shop.lng }} icon={HUB_ICON} clickable={false} />
            <Circle
              center={{ lat: data.shop.lat, lng: data.shop.lng }}
              radius={data.zones.operationalKm * 1000}
              options={{ strokeColor: '#20C76B', strokeWeight: 2, fillColor: '#20C76B', fillOpacity: 0.06, clickable: false }}
            />
            <Circle
              center={{ lat: data.shop.lat, lng: data.shop.lng }}
              radius={data.zones.disarmKm * 1000}
              options={{ strokeColor: '#F5B942', strokeWeight: 2, fillColor: '#F5B942', fillOpacity: 0.05, clickable: false }}
            />
          </>
        ) : null}
        {pins.map((v) => (
          <Marker
            key={v.id}
            position={{ lat: v.lat as number, lng: v.lng as number }}
            icon={DotIcon(v.color, v.id === selectedId)}
            label={{ text: v.vehicleNo, color: '#1C1C1C', fontSize: '10px', fontWeight: '700' }}
            title={v.vehicleNo}
            onClick={() => onSelect(v.id)}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
