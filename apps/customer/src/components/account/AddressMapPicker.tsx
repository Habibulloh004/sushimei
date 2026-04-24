"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Loader2, LocateFixed } from 'lucide-react';

const DEFAULT_CENTER: [number, number] = [41.2995, 69.2401]; // Tashkent
const DEFAULT_ZOOM = 13;
const PICKED_ZOOM = 16;

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface ReverseGeocodeResult {
  city?: string;
  street?: string;
  house?: string;
}

interface AddressMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number, geocoded?: ReverseGeocodeResult) => void;
}

async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    });
    if (!response.ok) return {};
    const data = await response.json();
    const address = data.address || {};
    const city = address.city || address.town || address.village || address.municipality || address.state || '';
    const street = address.road || address.pedestrian || address.residential || address.neighbourhood || '';
    const house = address.house_number || '';
    return {
      city: city || undefined,
      street: street || undefined,
      house: house || undefined,
    };
  } catch {
    return {};
  }
}

export default function AddressMapPicker({ latitude, longitude, onChange }: AddressMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handlePickRef = useRef<(lat: number, lng: number) => Promise<void>>(async () => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initialCenter: [number, number] =
      latitude != null && longitude != null ? [latitude, longitude] : DEFAULT_CENTER;
    const initialZoom = latitude != null && longitude != null ? PICKED_ZOOM : DEFAULT_ZOOM;

    const map = L.map(container, {
      center: initialCenter,
      zoom: initialZoom,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    const setMarker = (lat: number, lng: number) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { icon: markerIcon, draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const { lat: newLat, lng: newLng } = marker.getLatLng();
          void handlePickRef.current(newLat, newLng);
        });
        markerRef.current = marker;
      }
    };

    const handlePick = async (lat: number, lng: number) => {
      setMarker(lat, lng);
      onChangeRef.current(lat, lng);
      setGeocoding(true);
      const geocoded = await reverseGeocode(lat, lng);
      setGeocoding(false);
      onChangeRef.current(lat, lng, geocoded);
    };

    handlePickRef.current = handlePick;

    map.on('click', (event: L.LeafletMouseEvent) => {
      void handlePick(event.latlng.lat, event.latlng.lng);
    });

    if (latitude != null && longitude != null) {
      setMarker(latitude, longitude);
    }

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (latitude == null || longitude == null) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const marker = L.marker([latitude, longitude], { icon: markerIcon, draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const { lat: newLat, lng: newLng } = marker.getLatLng();
        void handlePickRef.current(newLat, newLng);
      });
      markerRef.current = marker;
    }

    map.flyTo([latitude, longitude], Math.max(map.getZoom(), PICKED_ZOOM), { duration: 0.6 });
  }, [latitude, longitude]);

  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        void handlePickRef.current(position.coords.latitude, position.coords.longitude);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="relative h-full min-h-72 w-full overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
      <div ref={containerRef} className="h-full w-full" />

      <button
        type="button"
        onClick={handleLocateMe}
        className="absolute right-3 top-3 z-[400] inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-3 py-2 text-xs font-black uppercase tracking-widest text-stone-700 shadow-md backdrop-blur hover:bg-white dark:border-stone-700 dark:bg-stone-900/95 dark:text-stone-200"
        disabled={locating}
      >
        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        My location
      </button>

      {geocoding ? (
        <div className="absolute bottom-3 left-3 z-[400] inline-flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-xs font-semibold text-stone-600 shadow-md backdrop-blur dark:bg-stone-900/95 dark:text-stone-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Resolving address...
        </div>
      ) : null}

      {latitude == null || longitude == null ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[400] mx-auto w-fit rounded-2xl bg-stone-950/80 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          Tap on the map to pin your address
        </div>
      ) : null}
    </div>
  );
}
