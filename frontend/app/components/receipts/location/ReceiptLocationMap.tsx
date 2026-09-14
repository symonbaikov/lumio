'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { apiBaseUrl } from '@/app/lib/api';

export type LatLng = [number, number];

type ReceiptLocationMapProps = {
  position: LatLng | null;
  styleId: string;
  markerColor: string;
  onPick: (point: LatLng) => void;
};

const WORLD_CENTER: LatLng = [20, 0];
const WORLD_ZOOM = 2;
const POINT_ZOOM = 16;
const TILE_ATTRIBUTION =
  '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

export const buildTileUrl = (styleId: string): string =>
  `${apiBaseUrl}/maps/tiles/${encodeURIComponent(styleId)}/{z}/{x}/{y}.png`;

// Inline SVG pin: Leaflet's default marker images resolve to broken URLs once bundled.
const buildPinIcon = (color: string): L.DivIcon =>
  L.divIcon({
    className: '',
    html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 0C6.3 0 0 6.2 0 13.9 0 24.3 14 40 14 40s14-15.7 14-26.1C28 6.2 21.7 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="5" fill="#fff"/></svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
  });

function PickOnClick({ onPick }: { onPick: (point: LatLng) => void }): null {
  useMapEvents({
    click: event => onPick([event.latlng.lat, event.latlng.lng]),
  });
  return null;
}

// Follows the point when it changes from outside (saved, reset, first click).
function FollowPosition({ lat, lng }: { lat: number | null; lng: number | null }): null {
  const map = useMap();

  useEffect(() => {
    if (lat === null || lng === null) {
      return;
    }
    map.setView([lat, lng], Math.max(map.getZoom(), POINT_ZOOM));
  }, [map, lat, lng]);

  return null;
}

export function ReceiptLocationMap({
  position,
  styleId,
  markerColor,
  onPick,
}: ReceiptLocationMapProps): React.JSX.Element {
  return (
    <MapContainer
      center={position ?? WORLD_CENTER}
      zoom={position ? POINT_ZOOM : WORLD_ZOOM}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url={buildTileUrl(styleId)} attribution={TILE_ATTRIBUTION} maxZoom={19} />
      <PickOnClick onPick={onPick} />
      <FollowPosition lat={position?.[0] ?? null} lng={position?.[1] ?? null} />
      {position ? (
        <Marker
          position={position}
          draggable
          icon={buildPinIcon(markerColor)}
          eventHandlers={{
            dragend: event => {
              const { lat, lng } = (event.target as L.Marker).getLatLng();
              onPick([lat, lng]);
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
