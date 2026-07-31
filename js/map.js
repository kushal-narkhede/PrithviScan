/**
 * Leaflet helpers for field placement (OSM tiles — no Google Maps key).
 */

const DEFAULT_CENTER = [20.5937, 78.9629]; // India
const DEFAULT_ZOOM = 5;

export function createFieldMap(elementId, options = {}) {
  const el = document.getElementById(elementId);
  if (!el || typeof L === "undefined") {
    throw new Error("Map container or Leaflet is missing.");
  }

  const center = options.center || DEFAULT_CENTER;
  const zoom = options.zoom ?? DEFAULT_ZOOM;
  const map = L.map(el, { scrollWheelZoom: true }).setView(center, zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  let marker = null;

  function setMarker(lat, lon) {
    if (marker) {
      marker.setLatLng([lat, lon]);
    } else {
      marker = L.marker([lat, lon], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        options.onPick?.(pos.lat, pos.lng);
      });
    }
    options.onPick?.(lat, lon);
  }

  if (options.lat != null && options.lon != null) {
    setMarker(options.lat, options.lon);
    map.setView([options.lat, options.lon], options.detailZoom ?? 14);
  }

  if (options.pickable !== false) {
    map.on("click", (e) => {
      setMarker(e.latlng.lat, e.latlng.lng);
    });
  }

  // Fix gray tiles when container was hidden/sized late
  setTimeout(() => map.invalidateSize(), 80);

  return {
    map,
    setMarker,
    getMarker() {
      if (!marker) return null;
      const p = marker.getLatLng();
      return { lat: p.lat, lon: p.lng };
    },
  };
}

export function useBrowserLocation(onSuccess, onError) {
  if (!navigator.geolocation) {
    onError?.(new Error("Geolocation is not available."));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess(pos.coords.latitude, pos.coords.longitude),
    (err) => onError?.(err),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}
