import { MapContainer, ImageOverlay, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

interface GameMapProps {
  imagePath: string;
  width: number;
  height: number;
  children?: React.ReactNode;
  selectedLocation?: { x: number; y: number } | null;
  onMapClick?: (pixel: { x: number; y: number }) => void;
  onZoomChange?: (zoom: number) => void;
}

function MapClickHandler({ onClick }: { onClick: (pixel: { x: number; y: number }) => void }) {
  useMapEvents({
    click(e) {
      // Convert from Leaflet [-y, x] back to image pixels [x, abs(y)]
      onClick({ x: e.latlng.lng, y: Math.abs(e.latlng.lat) });
    },
  });
  return null;
}

function ZoomTracker({ onChange }: { onChange: (zoom: number) => void }) {
  const map = useMap();
  useMapEvents({
    zoomend() {
      onChange(map.getZoom());
    },
  });
  useEffect(() => {
    onChange(map.getZoom());
  }, [map, onChange]);
  return null;
}

function FlyToLocation({
  location,
}: {
  location: { x: number; y: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([-location.y, location.x], 1, { duration: 0.5 });
    }
  }, [map, location]);
  return null;
}

/** Keep maxBounds in sync with viewport so every edge of the image is reachable. */
function DynamicBounds({ imageBounds }: { imageBounds: L.LatLngBounds }) {
  const map = useMap();

  const update = () => {
    const mapSize = map.getSize(); // viewport px
    const zoom = map.getZoom();
    const scale = Math.pow(2, zoom); // px-per-unit at this zoom
    // Convert viewport dimensions to coordinate-space units, but keep
    // at least 25% of the map visible so it never fully leaves the screen.
    const imgW = imageBounds.getEast() - imageBounds.getWest();
    const imgH = imageBounds.getNorth() - imageBounds.getSouth();
    const padW = Math.min(mapSize.x / scale / 2, imgW * 0.75);
    const padH = Math.min(mapSize.y / scale / 2, imgH * 0.75);
    const sw = imageBounds.getSouthWest();
    const ne = imageBounds.getNorthEast();
    const padded = L.latLngBounds(
      L.latLng(sw.lat - padH, sw.lng - padW),
      L.latLng(ne.lat + padH, ne.lng + padW),
    );
    map.setMaxBounds(padded);
  };

  useMapEvents({ zoomend: update, resize: update });
  useEffect(() => { update(); }, [map, imageBounds]);

  return null;
}

export default function GameMap({
  imagePath,
  width,
  height,
  children,
  selectedLocation,
  onMapClick,
  onZoomChange,
}: GameMapProps) {
  // CRS.Simple: lat increases upward, but image y increases downward.
  // Use negative lat so image pixel (x, y) maps to Leaflet [-y, x].
  const bounds = L.latLngBounds(
    L.latLng(-height, 0), // southwest (image bottom-left)
    L.latLng(0, width), // northeast (image top-right)
  );

  const center = L.latLng(-height / 2, width / 2);

  return (
    <MapContainer
      crs={L.CRS.Simple}
      center={center}
      zoom={-2}
      minZoom={-3}
      maxZoom={3}
      maxBoundsViscosity={1.0}
      style={{ height: "100%", width: "100%", background: "hsl(var(--background))" }}
      attributionControl={false}
    >
      <DynamicBounds imageBounds={bounds} />
      <ImageOverlay url={imagePath} bounds={bounds} />
      <FlyToLocation
        location={
          selectedLocation
            ? { x: selectedLocation.x, y: selectedLocation.y }
            : null
        }
      />
      {onMapClick && <MapClickHandler onClick={onMapClick} />}
      {onZoomChange && <ZoomTracker onChange={onZoomChange} />}
      {children}
    </MapContainer>
  );
}
