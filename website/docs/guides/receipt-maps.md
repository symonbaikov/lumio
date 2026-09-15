---
title: Receipt Maps
description: Self-hosted receipt locations, tiles, and geocoding
---

Receipt details can show where a purchase was made on a map. Everything runs on your own
infrastructure: no public map or geocoding service is called.

## Where the point comes from

In order of priority:

1. **Manual pin** — a point the user placed. Automatic updates never replace it.
2. **Merchant address** — the address parsed from the receipt, geocoded with Nominatim.
3. **Photo GPS** — the EXIF location of the uploaded photo.
4. **Device position** — only for receipts shot with the in-app camera.

The device position is requested only after the user agrees. The choice is stored per device, and
after a refusal Lumio does not ask again; it can be changed later in the Data tab of the profile
settings.

## Enable it

```bash
# Optional: the OSM extract for your region (defaults to Kazakhstan)
echo 'MAP_PBF_URL=https://download.geofabrik.de/europe/switzerland-latest.osm.pbf' >> .env
docker compose --profile maps --profile geocoder up -d
```

Then point the backend at the services and restart it:

```bash
TILESERVER_URL=http://tileserver:8080
GEOCODER_URL=http://nominatim:8080
MAP_DEFAULT_STYLE=osm-bright   # optional
```

- The `maps` profile prepares style assets (`map-assets`), builds vector tiles from the extract with
  Planetiler once (`map-tiles-init`) and serves them with tileserver-gl (`tileserver`).
- The `geocoder` profile runs Nominatim on the same extract.
- The first import takes minutes for a small country and hours for a large one, and needs several GB
  of disk (`map_data` and `nominatim_data` volumes).
- Without `TILESERVER_URL` the map reports that tiles are not configured; without `GEOCODER_URL`
  receipts fall back to the photo or device point.

## Styles and tiles

Four styles are served: OSM Bright (`osm-bright`), Positron (`positron`), Dark Matter
(`dark-matter`) and Basic (`basic`). Users switch styles on the map; the choice is saved to their
profile. `MAP_DEFAULT_STYLE` picks the style for users who have not chosen one, otherwise the first
style is used.

The browser never talks to the tile server — the backend proxies it, so `tileserver` has no public
port:

- `GET /api/v1/maps/styles` — available styles and the default style
- `GET /api/v1/maps/tiles/:styleId/:z/:x/:y` — a PNG tile (signed-in users only, exempt from rate
  limiting)

## API

- `PATCH /api/v1/receipts/:id/location` with `{ "latitude": 43.2383, "longitude": 76.9453 }` pins a
  receipt manually.
- `DELETE /api/v1/receipts/:id/location` drops the manual pin and recomputes the point from the
  merchant address or the photo.

Both require the statement edit permission.

Next: [Income Tax Declaration](income-tax-declaration)
