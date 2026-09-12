import { useEffect, useRef, useState } from "react";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423];

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    L?: any;
  }
}

let leafletPromise: Promise<any> | null = null;

function loadLeaflet(): Promise<any> {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector("link[data-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      link.dataset.leaflet = "true";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.dataset.leaflet = "true";
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("Leaflet не загрузился")));
    script.onerror = () => reject(new Error("Не удалось загрузить библиотеку карты"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

function hasPoint(latitude: number | null, longitude: number | null): boolean {
  return typeof latitude === "number" && typeof longitude === "number";
}

interface DeliveryMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
}

export default function DeliveryMap({ latitude, longitude, onChange }: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        const point = hasPoint(latitude, longitude);
        const center: [number, number] = point ? [latitude!, longitude!] : DEFAULT_CENTER;
        const map = L.map(containerRef.current).setView(center, point ? 15 : 10);
        L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
        if (point) {
          markerRef.current = L.marker(center).addTo(map);
        }
        map.on("click", (event: any) => {
          const lat = Number(event.latlng.lat.toFixed(6));
          const lng = Number(event.latlng.lng.toFixed(6));
          if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
          else markerRef.current = L.marker([lat, lng]).addTo(map);
          onChangeRef.current(lat, lng);
        });
        mapRef.current = map;
        setReady(true);
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message);
      });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      setReady(false);
    };
    // Карта инициализируется один раз; начальные координаты берутся из первого рендера.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map || !hasPoint(latitude, longitude)) return;
    map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
    if (markerRef.current) markerRef.current.setLatLng([latitude, longitude]);
    else markerRef.current = L.marker([latitude, longitude]).addTo(map);
  }, [latitude, longitude]);

  function locateMe() {
    if (!navigator.geolocation) {
      setError("Браузер не поддерживает геолокацию");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        onChangeRef.current(lat, lng);
      },
      () => setError("Не удалось определить местоположение"),
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={locateMe} disabled={!ready}>
          📍 Определить моё местоположение
        </button>
        {hasPoint(latitude, longitude) && (
          <a
            className="text-xs text-meat-700 underline"
            href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            Открыть в OpenStreetMap
          </a>
        )}
      </div>

      <div
        ref={containerRef}
        className="mt-3 h-72 w-full overflow-hidden rounded-2xl border border-meat-100 bg-meat-50"
        aria-label="Карта для указания места доставки"
      />

      {error && (
        <p className="mt-2 rounded-xl bg-meat-50 p-3 text-xs text-meat-800">
          Карта недоступна: {error}. Координаты можно ввести вручную ниже.
        </p>
      )}
      {!ready && !error && <p className="mt-2 text-xs text-meat-500">Загружаем карту…</p>}
      <p className="mt-2 text-[11px] text-meat-400">
        Кликните по карте, чтобы отметить точку доставки.
        {hasPoint(latitude, longitude) ? ` Выбрано: ${latitude}, ${longitude}` : ""}
      </p>
    </div>
  );
}
