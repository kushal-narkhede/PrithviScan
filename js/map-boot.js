/**
 * Classic (non-module) map bootstrap for #fieldMap.
 * Destination pin + no auto-zoom on click (zoom only after field detect via app.js).
 */
(function () {
  "use strict";

  var DEFAULT_CENTER = [28, -20];
  var DEFAULT_ZOOM = 3;
  var DUAL_BOUNDS = [
    [8, -125],
    [49, 97],
  ];
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

  function pinIcon(state) {
    var safe = state === "ok" || state === "error" ? state : "pending";
    return L.divIcon({
      className: "ps-map-pin ps-map-pin--" + safe,
      html:
        '<span class="ps-map-pin__bubble" aria-hidden="true">' +
        '<img class="ps-map-pin__logo" src="assets/logo-mark.png" width="22" height="22" alt="" />' +
        "</span><span class=\"ps-map-pin__tip\" aria-hidden=\"true\"></span>",
      iconSize: [44, 56],
      iconAnchor: [22, 54],
      popupAnchor: [0, -48],
    });
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

    var map = L.map(el, { scrollWheelZoom: true, maxZoom: 19, worldCopyJump: true }).setView(
      DEFAULT_CENTER,
      DEFAULT_ZOOM
    );
    try {
      map.fitBounds(DUAL_BOUNDS, { padding: [24, 24], maxZoom: 4 });
    } catch (e) {}
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          try {
            map.setView([pos.coords.latitude, pos.coords.longitude], 6);
          } catch (e) {}
        },
        function () {},
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 600000 }
      );
    }
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

    function setMarker(lat, lon, notify, state) {
      var icon = pinIcon(state || "pending");
      if (marker) {
        marker.setLatLng([lat, lon]);
        marker.setIcon(icon);
      } else {
        marker = L.marker([lat, lon], { draggable: true, icon: icon, riseOnHover: true, title: "Field pin" }).addTo(map);
        marker.on("dragend", function () {
          var p = marker.getLatLng();
          marker.setIcon(pinIcon("pending"));
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

    function setMarkerState(state) {
      if (marker) marker.setIcon(pinIcon(state));
    }

    function zoomToField(lat, lon, z) {
      map.setView([lat, lon], z == null ? 17 : z, { animate: true });
    }

    // Pin only — never auto-zoom on click. Zoom after field detection in app.js.
    map.on("click", function (e) {
      setMarker(e.latlng.lat, e.latlng.lng, true, "pending");
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
      setMarker: function (lat, lon, opts) {
        setMarker(lat, lon, true, (opts && opts.state) || "pending");
      },
      setMarkerState: setMarkerState,
      zoomToField: zoomToField,
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
