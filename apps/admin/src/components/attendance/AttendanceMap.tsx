import { useEffect, useRef } from "react";
import L from "leaflet";
import { ExternalLink, MapPin, MapPinOff, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

const OFFICE_COORDINATES = {
  latitude: -6.214737033753623,
  longitude: 106.76089760397757,
  radiusMeters: 100,
  name: "Kantor PT Kuda Prima",
};

export interface AttendanceMapProps {
  readonly latitude?: number;
  readonly longitude?: number;
  readonly accuracyMeters?: number;
  readonly distanceMeters?: number;
  readonly locationType: "office" | "field";
  readonly employeeName: string;
  readonly capturedAtWib?: string;
  readonly className?: string;
}

function createEmployeeMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
      ">
        <span style="
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          background-color: #f25923;
          opacity: 0.25;
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></span>
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background-color: #f25923;
          border: 2px solid #ffffff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createOfficeMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 9999px;
        background-color: #283989;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21h18"></path>
          <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function AttendanceMap({
  latitude,
  longitude,
  accuracyMeters,
  distanceMeters,
  locationType,
  employeeName,
  capturedAtWib,
  className = "",
}: Readonly<AttendanceMapProps>) {
  const mapContainerRef = useRef<HTMLElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const hasCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);

  useEffect(() => {
    if (!hasCoordinates || !mapContainerRef.current) return;

    // Clean up previous instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Office geofence circle
      L.circle([OFFICE_COORDINATES.latitude, OFFICE_COORDINATES.longitude], {
        radius: OFFICE_COORDINATES.radiusMeters,
        color: "#283989",
        fillColor: "#283989",
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: "4, 6",
      }).addTo(map);

      // Office marker
      const officeMarker = L.marker(
        [OFFICE_COORDINATES.latitude, OFFICE_COORDINATES.longitude],
        { icon: createOfficeMarkerIcon() },
      ).addTo(map);
      officeMarker.bindPopup(
        `<div style="font-size: 12px; line-height: 1.4;">
          <strong>${OFFICE_COORDINATES.name}</strong><br/>
          <span style="color: #64748b;">Radius Geofence: ${OFFICE_COORDINATES.radiusMeters}m</span>
        </div>`,
      );

      // Employee marker
      const empMarker = L.marker([latitude, longitude], {
        icon: createEmployeeMarkerIcon(),
      }).addTo(map);
      empMarker.bindPopup(
        `<div style="font-size: 12px; line-height: 1.4;">
          <strong>${employeeName}</strong><br/>
          <span>Lokasi: ${locationType === "office" ? "Kantor" : "Lapangan"}</span><br/>
          ${capturedAtWib ? `<span style="color: #64748b;">Waktu: ${capturedAtWib}</span><br/>` : ""}
          <span style="color: #64748b;">Jarak: ${distanceMeters ?? 0}m | Akurasi: ±${accuracyMeters ?? 0}m</span>
        </div>`,
      );

      // Connecting line between employee and office
      L.polyline(
        [
          [latitude, longitude],
          [OFFICE_COORDINATES.latitude, OFFICE_COORDINATES.longitude],
        ],
        {
          color: "#f25923",
          weight: 2,
          dashArray: "4, 6",
          opacity: 0.7,
        },
      ).addTo(map);

      // Fit bounds to show both employee and office
      const bounds = L.latLngBounds([
        [latitude, longitude],
        [OFFICE_COORDINATES.latitude, OFFICE_COORDINATES.longitude],
      ]);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 17 });

      // Invalidate size after modal animation
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 200);

      mapInstanceRef.current = map;

      return () => {
        clearTimeout(timer);
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch {
      // Graceful fallback if map initialization fails (e.g. testing environment)
      return undefined;
    }
  }, [
    hasCoordinates,
    latitude,
    longitude,
    accuracyMeters,
    distanceMeters,
    locationType,
    employeeName,
    capturedAtWib,
  ]);

  if (!hasCoordinates) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-center text-muted-foreground ${className}`}
      >
        <MapPinOff className="size-8 stroke-1 text-muted-foreground/60 mb-2" />
        <p className="text-sm font-medium">Koordinat GPS Tidak Tersedia</p>
        <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">
          Data koordinat geografis tidak tersimpan pada rekaman presensi ini.
        </p>
      </div>
    );
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/10 shadow-sm">
        {/* Leaflet map container */}
        <section
          ref={mapContainerRef}
          aria-label="Peta lokasi presensi OpenStreetMap"
          className="h-64 sm:h-72 w-full z-0"
        />

        {/* Floating badge for location status */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-border/40 bg-background/85 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md shadow-xs">
          <MapPin className="size-3 text-secondary" />
          <span>{locationType === "office" ? "Kantor" : "Lapangan"}</span>
        </div>
      </div>

      {/* Meta chips & external map launch button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 font-mono text-[11px]">
            <Navigation className="size-3 text-muted-foreground/70" />
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
          {accuracyMeters !== undefined && (
            <span className="rounded-md bg-muted/40 px-2 py-0.5 text-[11px]">
              Akurasi ±{Math.round(accuracyMeters)}m
            </span>
          )}
          {distanceMeters !== undefined && (
            <span className="rounded-md bg-muted/40 px-2 py-0.5 text-[11px]">
              Jarak {Math.round(distanceMeters)}m
            </span>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3" />
            Buka di Google Maps
          </a>
        </Button>
      </div>
    </div>
  );
}
