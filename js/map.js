/**
 * Leaflet satellite map for field placement.
 * Esri World Imagery — same provider family as classifyLocation imagery.
 */

/** Dual-country default: India + USA both in view until user zooms/picks */
const DEFAULT_CENTER = [28, -20];
const DEFAULT_ZOOM = 3;
const DUAL_BOUNDS = [
  [8, -125],
  [49, 97],
];

/** Primary + fallback tile endpoints (satellite first, OSM last) */
const SAT_LAYERS = [
  {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri — Maxar, Earthstar Geographics",
    maxNativeZoom: 19,
  },
  {
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri — Maxar, Earthstar Geographics",
    maxNativeZoom: 19,
  },
  {
    url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © USGS The National Map",
    maxNativeZoom: 16,
  },
  {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap",
    maxNativeZoom: 19,
    street: true,
  },
];

const LABELS_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

function showMapError(el, message) {
  let banner = el.querySelector(".field-map-error");
  if (!banner) {
    banner = document.createElement("p");
    banner.className = "field-map-error";
    banner.setAttribute("role", "status");
    el.appendChild(banner);
  }
  banner.textContent = message;
}

function clearMapError(el) {
  el.querySelector(".field-map-error")?.remove();
}

function destroyMap(el) {
  if (!el) return;
  if (el._psMap) {
    try {
      el._psMap.remove();
    } catch {
      /* ignore */
    }
    el._psMap = null;
  }
  if (el._leaflet_id) {
    try {
      delete el._leaflet_id;
    } catch {
      el._leaflet_id = undefined;
    }
  }
  el.innerHTML = "";
}

export function createFieldMap(elementId, options = {}) {
  const el = document.getElementById(elementId);
  if (!el) {
    throw new Error("Map container is missing.");
  }
  if (typeof L === "undefined") {
    throw new Error("Leaflet failed to load. Check your network and refresh.");
  }

  destroyMap(el);
  clearMapError(el);

  const center = options.center || DEFAULT_CENTER;
  const zoom = options.zoom ?? DEFAULT_ZOOM;
  const map = L.map(el, {
    scrollWheelZoom: true,
    maxZoom: 19,
    fadeAnimation: true,
    worldCopyJump: true,
  }).setView(center, zoom);

  if (options.fitDual !== false && options.lat == null && options.lon == null && !options.center) {
    try {
      map.fitBounds(DUAL_BOUNDS, { padding: [24, 24], maxZoom: 4 });
    } catch {
      /* keep setView */
    }
  }

  el._psMap = map;

  // Local Leaflet build — pin default marker icons next to leaflet.js
  try {
    const iconBase = `${window.location.origin}/vendor/leaflet/images`;
    L.Icon.Default.mergeOptions({
      iconUrl: `${iconBase}/marker-icon.png`,
      iconRetinaUrl: `${iconBase}/marker-icon-2x.png`,
      shadowUrl: `${iconBase}/marker-shadow.png`,
    });
  } catch {
    /* ignore */
  }

  let layerIndex = 0;
  let satLayer = null;
  let labelsLayer = null;
  let errors = 0;

  function addSatLayer(index) {
    const conf = SAT_LAYERS[index];
    if (!conf) return null;
    if (satLayer) {
      try {
        map.removeLayer(satLayer);
      } catch {
        /* ignore */
      }
    }
    satLayer = L.tileLayer(conf.url, {
      maxZoom: 19,
      maxNativeZoom: conf.maxNativeZoom ?? 19,
      attribution: conf.attribution,
      crossOrigin: true,
      // Transparent 1x1 if a single tile 404s — avoids pink broken icons
      errorTileUrl:
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    }).addTo(map);

    satLayer.on("tileerror", () => {
      errors += 1;
      // After a few failures, try next provider
      if (errors >= 3 && layerIndex < SAT_LAYERS.length - 1) {
        errors = 0;
        layerIndex += 1;
        const next = SAT_LAYERS[layerIndex];
        addSatLayer(layerIndex);
        if (next?.street) {
          showMapError(
            el,
            "Satellite tiles blocked — showing street map. You can still drop a pin."
          );
          // Labels redundant on OSM
          if (labelsLayer) {
            try {
              map.removeLayer(labelsLayer);
            } catch {
              /* ignore */
            }
            labelsLayer = null;
          }
        }
      } else if (errors >= 8 && layerIndex >= SAT_LAYERS.length - 1) {
        showMapError(el, "Map tiles failed to load. Check network / ad-block, then refresh.");
      }
    });

    satLayer.on("load", () => {
      if (!SAT_LAYERS[layerIndex]?.street) clearMapError(el);
    });

    return satLayer;
  }

  addSatLayer(0);

  labelsLayer = L.tileLayer(LABELS_URL, {
    maxZoom: 19,
    opacity: 0.75,
    pane: "overlayPane",
    attribution: "",
    crossOrigin: true,
  }).addTo(map);

  let marker = null;

  function setMarker(lat, lon, { notify = true } = {}) {
    if (marker) {
      marker.setLatLng([lat, lon]);
    } else {
      marker = L.marker([lat, lon], { draggable: options.pickable !== false }).addTo(map);
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
  } else if (options.pickable !== false && options.geolocate !== false && navigator.geolocation) {
    // Prefer the user's country (US or India) when placing a new field
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (marker) return;
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 6);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 600000 }
    );
  }

  if (options.pickable !== false) {
    map.on("click", (e) => {
      setMarker(e.latlng.lat, e.latlng.lng);
      if (map.getZoom() < 16) {
        map.setView(e.latlng, 17);
      }
    });
  }

  const resize = () => {
    try {
      map.invalidateSize({ animate: false });
    } catch {
      /* ignore */
    }
  };

  // Layout can settle after fonts/panels — refresh size a few times
  requestAnimationFrame(resize);
  setTimeout(resize, 80);
  setTimeout(resize, 300);
  setTimeout(resize, 800);

  let ro = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => resize());
    ro.observe(el);
  }

  // When tab/panel becomes visible again
  document.addEventListener("visibilitychange", resize);

  map.whenReady(resize);

  return {
    map,
    setMarker: (lat, lon) => setMarker(lat, lon, { notify: true }),
    getMarker() {
      if (!marker) return null;
      const p = marker.getLatLng();
      return { lat: p.lat, lon: p.lng };
    },
    invalidateSize: resize,
    destroy() {
      ro?.disconnect();
      document.removeEventListener("visibilitychange", resize);
      destroyMap(el);
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
