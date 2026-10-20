// Service worker: red primero; la caché solo sirve la carcasa si no hay conexión.
const VERSION = "taxi-v3";
const CARCASA = ["./","index.html","carreras.html","calculadoras.html","vencimientos.html","avisos.html","privacidad.html","manifest.webmanifest",
 "assets/app.css","assets/taxi.css","assets/portada.css","inicio.html","assets/almacen.js","assets/calculos.js","assets/carreras.js","assets/calculadoras.js","assets/vencimientos.js","assets/avisos.js","assets/privacidad.js","assets/gastos.js","assets/turnos.js","assets/estadisticas.js","assets/mantenimiento.js","gastos.html","turnos.html","estadisticas.html","mantenimiento.html",
 "assets/icons/favicon-48.png","assets/icons/icon-192.png","assets/icons/icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CARCASA)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
});
