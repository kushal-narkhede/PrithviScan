/**
 * Leaflet satellite map for field placement.
 * Esri World Imagery — same provider family as classifyLocation imagery.
 */

const DEFAULT_CENTER = [20.5937, 78.9629]; // India
const DEFAULT_ZOOM = 5;

/** Primary + fallback satellite tile endpoints */
const SAT_LAYERS = [
  {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri — Maxar, Earthstar Geographics",
  },
  {
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri — Maxar, Earthstar Geographics",
  },
];

export function createFieldMap(elementId, options = {}) {
  const el = document.getElementById(elementId);
  if (!el || typeof L === "undefined") {
    throw new Error("Map container or Leaflet is missing.");
  }

  // Avoid gray leftover from previous map instance
  if (el._leaflet_id) {
    try {
      el._leaflet_id = null;
      el.innerHTML = "";
    } catch {
      /* ignore */
    }
  }

  const center = options.center || DEFAULT_CENTER;
  const zoom = options.zoom ?? DEFAULT_ZOOM;
  const map = L.map(el, {
    scrollWheelZoom: true,
    // Prefer higher zoom for satellite detail
    maxZoom: 19,
  }).setView(center, zoom);

  const sat = SAT_LAYERS[0];
  const satLayer = L.tileLayer(sat.url, {
    maxZoom: 19,
    maxNativeZoom: 19,
    attribution: sat.attribution,
    errorTileUrl:
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  }).addTo(map);

  // If primary Esri endpoint fails repeatedly, swap to fallback
  let errors = 0;
  satLayer.on("tileerror", () => {
    errors += 1;
    if (errors === 4 && SAT_LAYERS[1]) {
      satLayer.setUrl(SAT_LAYERS[1].url);
    }
  });

  // Light place labels only (does not replace satellite)
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      opacity: 0.75,
      pane: "overlayPane",
      attribution: "",
    }
  ).addTo(map);

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
      if (map.getZoom() < 16) {
        map.setView(e.latlng, 17);
      }
    });
  }

  setTimeout(() => map.invalidateSize(), 80);
  setTimeout(() => map.invalidateSize(), 300);

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
