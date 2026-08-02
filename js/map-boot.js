/**
 * Classic (non-module) map bootstrap for #fieldMap.
 * Runs even if the ES module graph (app.js → fields.js) fails to load.
 * No API key required — uses public Esri / OSM tile endpoints.
 */
(function () {
  "use strict";

  var DEFAULT_CENTER = [20.5937, 78.9629];
  var LAYERS = [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  ];

  function setStatus(msg, kind) {
    var el = document.getElementById("appStatus");
    if (!el) return;
    el.textContent = msg;
    el.className = "app-status" + (kind ? " is-" + kind : "");
  }

  function showBanner(el, msg) {
    var b = el.querySelector(".field-map-error");
    if (!b) {
      b = document.createElement("p");
      b.className = "field-map-error";
      el.appendChild(b);
    }
    b.textContent = msg;
  }

  function boot() {
    var el = document.getElementById("fieldMap");
    if (!el) return;
    if (typeof L === "undefined") {
      setStatus("Map library missing. Hard-refresh the page.", "error");
      showBanner(el, "Leaflet failed to load.");
      return;
    }
    if (el._leaflet_id || window.__psFieldMap) {
      try {
        window.__psFieldMap && window.__psFieldMap.invalidateSize && window.__psFieldMap.invalidateSize();
      } catch (e) {}
      return;
    }

    try {
      var iconBase = window.location.origin + "/vendor/leaflet/images";
      L.Icon.Default.mergeOptions({
        iconUrl: iconBase + "/marker-icon.png",
        iconRetinaUrl: iconBase + "/marker-icon-2x.png",
        shadowUrl: iconBase + "/marker-shadow.png",
      });
    } catch (e) {}

    var map = L.map(el, { scrollWheelZoom: true, maxZoom: 19 }).setView(DEFAULT_CENTER, 5);
    var layerIndex = 0;
    var errors = 0;
    var sat = null;
    var marker = null;

    function addLayer(i) {
      var url = LAYERS[i];
      if (!url) return;
      if (sat) {
        try {
          map.removeLayer(sat);
        } catch (e) {}
      }
      sat = L.tileLayer(url, {
        maxZoom: 19,
        maxNativeZoom: i === 2 ? 16 : 19,
        attribution: i >= 3 ? "© OpenStreetMap" : "Tiles © Esri / USGS",
        crossOrigin: true,
        errorTileUrl:
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      }).addTo(map);
      sat.on("tileerror", function () {
        errors += 1;
        if (errors >= 3 && layerIndex < LAYERS.length - 1) {
          errors = 0;
          layerIndex += 1;
          addLayer(layerIndex);
          if (layerIndex >= 3) {
            showBanner(el, "Satellite blocked — street map shown. You can still drop a pin.");
          }
        }
      });
    }

    addLayer(0);

    try {
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, opacity: 0.7, pane: "overlayPane" }
      ).addTo(map);
    } catch (e) {}

    function setMarker(lat, lon, notify) {
      if (marker) marker.setLatLng([lat, lon]);
      else {
        marker = L.marker([lat, lon], { draggable: true }).addTo(map);
        marker.on("dragend", function () {
          var p = marker.getLatLng();
          if (window.__psFieldMapOnPick) window.__psFieldMapOnPick(p.lat, p.lng);
        });
      }
      if (notify !== false && window.__psFieldMapOnPick) {
        window.__psFieldMapOnPick(lat, lon);
      }
      var latInput = document.getElementById("fieldLat");
      var lonInput = document.getElementById("fieldLon");
      if (latInput) latInput.value = Number(lat).toFixed(6);
      if (lonInput) lonInput.value = Number(lon).toFixed(6);
    }

    map.on("click", function (e) {
      setMarker(e.latlng.lat, e.latlng.lng, true);
      if (map.getZoom() < 16) map.setView(e.latlng, 17);
    });

    function resize() {
      try {
        map.invalidateSize({ animate: false });
      } catch (e) {}
    }
    requestAnimationFrame(resize);
    setTimeout(resize, 100);
    setTimeout(resize, 400);
    setTimeout(resize, 1000);
    window.addEventListener("resize", resize);
    if (typeof ResizeObserver !== "undefined") {
      try {
        new ResizeObserver(resize).observe(el);
      } catch (e) {}
    }

    window.__psFieldMap = {
      map: map,
      setMarker: function (lat, lon) {
        setMarker(lat, lon, true);
      },
      invalidateSize: resize,
      getMarker: function () {
        if (!marker) return null;
        var p = marker.getLatLng();
        return { lat: p.lat, lon: p.lng };
      },
    };

    setStatus("Satellite map ready — click cropland to place a field.", "ok");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
