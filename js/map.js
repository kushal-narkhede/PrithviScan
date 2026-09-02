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

/** Destination-style pin with brand mark (no broken Leaflet PNG box). */
export function fieldPinIcon(state = "pending") {
  const safe = ["pending", "ok", "error"].includes(state) ? state : "pending";
  return L.divIcon({
    className: `ps-map-pin ps-map-pin--${safe}`,
    html: `
      <span class="ps-map-pin__bubble" aria-hidden="true">
        <img class="ps-map-pin__logo" src="assets/logo-mark.png" width="22" height="22" alt="" />
      </span>
      <span class="ps-map-pin__tip" aria-hidden="true"></span>
    `,
    iconSize: [44, 56],
    iconAnchor: [22, 54],
    popupAnchor: [0, -48],
  });
}

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
      errorTileUrl:
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    }).addTo(map);

    satLayer.on("tileerror", () => {
      errors += 1;
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
  let pinState = "pending";

  function setMarker(lat, lon, { notify = true, state = "pending" } = {}) {
    pinState = state;
    const icon = fieldPinIcon(pinState);
    if (marker) {
      marker.setLatLng([lat, lon]);
      marker.setIcon(icon);
    } else {
      marker = L.marker([lat, lon], {
        draggable: options.pickable !== false,
        icon,
        riseOnHover: true,
        title: "Field pin",
      }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setMarkerState("pending");
        options.onPick?.(pos.lat, pos.lng);
      });
    }
    if (notify) options.onPick?.(lat, lon);
  }

  function setMarkerState(state) {
    pinState = state;
    if (marker) marker.setIcon(fieldPinIcon(pinState));
  }

  /** Zoom in only after a successful field detect (caller decides). */
  function zoomToField(lat, lon, z = 17) {
    map.setView([lat, lon], z, { animate: true });
  }

  if (options.lat != null && options.lon != null) {
    setMarker(options.lat, options.lon, { notify: false, state: "ok" });
    map.setView([options.lat, options.lon], options.detailZoom ?? 16);
  } else if (options.pickable !== false && options.geolocate !== false && navigator.geolocation) {
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
    // Place pin only — do NOT auto-zoom here. Zoom after field is detected.
    map.on("click", (e) => {
      setMarker(e.latlng.lat, e.latlng.lng, { state: "pending" });
    });
  }

  const resize = () => {
    try {
      map.invalidateSize({ animate: false });
    } catch {
      /* ignore */
    }
  };

  requestAnimationFrame(resize);
  setTimeout(resize, 80);
  setTimeout(resize, 300);
  setTimeout(resize, 800);

  let ro = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => resize());
    ro.observe(el);
  }

  document.addEventListener("visibilitychange", resize);
  map.whenReady(resize);

  return {
    map,
    setMarker: (lat, lon, opts) => setMarker(lat, lon, { notify: true, ...(opts || {}) }),
    setMarkerState,
    zoomToField,
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
