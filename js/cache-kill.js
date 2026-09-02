/**
 * One-time purge of stale service-worker caches that previously served
 * a broken fields.js (blank map). Runs as a classic script before modules.
 */
(function () {
  "use strict";
  var KEY = "ps_cache_kill";
  var VER = "aifix1";
  try {
    if (localStorage.getItem(KEY) === VER) return;
    localStorage.setItem(KEY, VER);
  } catch (e) {
    return;
  }

  var tasks = [];
  if ("serviceWorker" in navigator) {
    tasks.push(
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      })
    );
  }
  if (typeof caches !== "undefined") {
    tasks.push(
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      })
    );
  }

  Promise.all(tasks)
    .catch(function () {})
    .then(function () {
      // Reload once so the page fetches fresh JS/CSS without old SW.
      var u = new URL(window.location.href);
      if (u.searchParams.get("ck") === VER) return;
      u.searchParams.set("ck", VER);
      window.location.replace(u.toString());
    });
})();
