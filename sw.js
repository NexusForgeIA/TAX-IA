// Service worker: red primero; la caché solo sirve la carcasa si no hay conexión.
const VERSION = "taxi-v42";
const CARCASA = [
  "./",
  "aviso-legal.html",
  "avisos.html",
  "calculadoras.html",
  "estadisticas.html",
  "gastos.html",
  "index.html",
  "informe.html",
  "justificante.html",
  "ingresos.html",
  "inicio.html",
  "instalar.html",
  "mantenimiento.html",
  "privacidad.html",
  "radar.html",
  "trayecto.html",
  "turnos.html",
  "vencimientos.html",
  "manifest.webmanifest",
  "assets/arranque.js",
  "assets/avisos.js",
  "assets/calculadoras.js",
  "assets/config.js",
  "assets/copia.js",
  "assets/datos.js",
  "assets/estadisticas.js",
  "assets/fechas.js",
  "assets/gastos-vista.js",
  "assets/gastos.js",
  "assets/herramientas.js",
  "assets/iconos.js",
  "assets/ingresos-vista.js",
  "assets/ingresos.js",
  "assets/informe.js",
  "assets/inicio.js",
  "assets/justificante.js",
  "assets/instalar.js",
  "assets/mantenimiento.js",
  "assets/objetivo.js",
  "assets/otros-gastos-vista.js",
  "assets/otros-gastos.js",
  "assets/nav.js",
  "assets/radar.js",
  "assets/semana-vista.js",
  "assets/semana.js",
  "assets/splash.js",
  "assets/trayecto.js",
  "assets/numeros.js",
  "assets/turnos.js",
  "assets/util.js",
  "assets/visita.js",
  "assets/vencimientos-vista.js",
  "assets/vencimientos.js",
  "assets/app.css",
  "assets/portada.css",
  "assets/splash.css",
  "assets/taxi.css",
  "assets/iconos.svg",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/favicon-48.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/splash-logo.webp",
  "assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  "assets/img/logo.png",
  "assets/img/evento-futbol.webp",
  "assets/img/evento-futbol.jpg",
  "assets/img/evento-feria.webp",
  "assets/img/evento-feria.jpg",
  "assets/img/evento-otro.webp",
  "assets/img/evento-otro.jpg",
  "assets/img/estadio-bernabeu.webp",
  "assets/img/estadio-bernabeu.jpg",
  "assets/img/estadio-metropolitano.webp",
  "assets/img/estadio-metropolitano.jpg",
  "assets/img/estadio-camp-nou.webp",
  "assets/img/estadio-camp-nou.jpg",
  "assets/img/estadio-sanchez-pizjuan.webp",
  "assets/img/estadio-sanchez-pizjuan.jpg",

  "assets/img/og-image.png",
  "assets/img/whitemoon-logo-3d.png",
  "assets/img/whitemoon-logo-3d.webp"
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CARCASA)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((cs) => (cs.length ? cs[0].focus() : self.clients.openWindow("inicio.html"))));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
});
