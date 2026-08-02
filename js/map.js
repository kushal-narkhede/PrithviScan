/**
 * Leaflet helpers for field placement.
 * Uses Esri World Imagery (satellite) so the map matches classifyLocation tiles.
 */

const DEFAULT_CENTER = [20.5937, 78.9629]; // India
const DEFAULT_ZOOM = 5;

const SAT_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const LABELS_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

export function createFieldMap(elementId, options = {}) {
  const el = document.getElementById(elementId);
  if (!el || typeof L === "undefined") {
    throw new Error("Map container or Leaflet is missing.");
  }

  const center = options.center || DEFAULT_CENTER;
  const zoom = options.zoom ?? DEFAULT_ZOOM;
  const map = L.map(el, { scrollWheelZoom: true }).setView(center, zoom);

  L.tileLayer(SAT_URL, {
    maxZoom: 19,
    attribution:
      "Tiles &copy; Esri — Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  }).addTo(map);

  // Place names on top of satellite (keeps map readable)
  L.tileLayer(LABELS_URL, {
    maxZoom: 19,
    opacity: 0.9,
    pane: "overlayPane",
  }).addTo(map);

  let marker = null;

  function setMarker(lat, lon, { notify = true } = {}) {
    if (marker) {
      marker.setLatLng([lat, lon]);
    } else {
      marker = L.marker([lat, lon], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        options.onPick?.(pos.lat, pos.lng);
      });
    }
    if (notify) options.onPick?.(lat, lon);
  }

  if (options.lat != null && options.lon != null) {
    setMarker(options.lat, options.lon, { notify: false });
    map.setView([options.lat, options.lon], options.detailZoom ?? 16);
  }

  if (options.pickable !== false) {
    map.on("click", (e) => {
      setMarker(e.latlng.lat, e.latlng.lng);
      // Zoom in so the satellite patch matches what the model sees (~z16)
      if (map.getZoom() < 15) {
        map.setView(e.latlng, 16);
      }
    });
  }

  setTimeout(() => map.invalidateSize(), 80);

  return {
    map,
    setMarker: (lat, lon) => setMarker(lat, lon, { notify: true }),
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
