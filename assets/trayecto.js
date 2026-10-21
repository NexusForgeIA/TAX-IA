// Taxi-IA · Trayecto con GPS. Graba la carrera con la ubicación del móvil MIENTRAS la app está abierta:
// kilómetros, duración y trazado. Todo se queda en este navegador (localStorage); nada se envía a ningún
// servidor. Los kilómetros son una estimación del GPS y no sustituyen al taxímetro.
import "./nav.js";
import { $, el, descargarCSV } from "./util.js";
import { guardarJson, leerJson, nuevoId } from "./datos.js";
import C from "./herramientas.js";

const CLAVE = "taxi.trayectos", ACTIVO = "taxi.trayecto.activo";
const MAX_RECORRIDOS = 200, MAX_PUNTOS = 6000;
const NS = "http://www.w3.org/2000/svg";
const fmtKm = (m) => `${(m / 1000).toFixed(2).replace(".", ",")} km`;
const fmtT = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; const dos = (n) => String(n).padStart(2, "0"); return h ? `${h}:${dos(m)}:${dos(x)}` : `${dos(m)}:${dos(x)}`; };
const fmtFecha = (ms) => new Date(ms).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const estado = $("estado");
const aviso = (t, error = false) => { estado.textContent = t; estado.classList.toggle("error", error); };
const leer = () => { const l = leerJson(CLAVE, []); return Array.isArray(l) ? l : []; };

let est = null, inicio = 0, vigilante = null, reloj = null, bloqueo = null, lecturas = 0;

/** Trazado de un recorrido como SVG (sin mapas de terceros): proyección plana con corrección por latitud. */
function trazado(puntos) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 300 170"); svg.setAttribute("class", "trazado"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Recorrido de la carrera");
  if (puntos.length < 2) return svg;
  const lat0 = puntos.reduce((a, p) => a + p[0], 0) / puntos.length, k = Math.cos(lat0 * Math.PI / 180);
  const xy = puntos.map((p) => [p[1] * k, -p[0]]);
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX || 1e-6, h = Math.max(...ys) - minY || 1e-6;
  const esc = Math.min(280 / w, 150 / h), ox = (300 - w * esc) / 2, oy = (170 - h * esc) / 2;
  const pt = (p) => [(p[0] - minX) * esc + ox, (p[1] - minY) * esc + oy];
  const linea = document.createElementNS(NS, "polyline");
  linea.setAttribute("points", xy.map((p) => pt(p).map((n) => n.toFixed(1)).join(",")).join(" ")); linea.setAttribute("class", "trazado-linea");
  svg.append(linea);
  [[xy[0], "trazado-ini"], [xy[xy.length - 1], "trazado-fin"]].forEach(([p, c]) => {
    const [x, y] = pt(p), o = document.createElementNS(NS, "circle");
    o.setAttribute("cx", x.toFixed(1)); o.setAttribute("cy", y.toFixed(1)); o.setAttribute("r", "5"); o.setAttribute("class", c); svg.append(o);
  });
  return svg;
}

function pintarLista() {
  const lista = leer();
  $("vacio").hidden = lista.length > 0; $("acciones").hidden = lista.length === 0;
  $("lista").replaceChildren(...lista.map((r) => {
    const borrar = el("button", { type: "button", class: "boton-sec", text: "Borrar" });
    borrar.addEventListener("click", () => { guardarJson(CLAVE, leer().filter((x) => x.id !== r.id)); pintarLista(); });
    return el("li", { class: "recorrido" }, trazado(r.puntos),
      el("div", { class: "recorrido-datos" }, el("strong", { text: fmtKm(r.metros) }),
        el("span", { text: `${fmtFecha(r.inicio)} · ${fmtT((r.fin - r.inicio) / 1000)}` })), borrar);
  }));
}

function pintarVivo() {
  if (!est) return;
  $("v-km").textContent = fmtKm(est.metros); $("v-t").textContent = fmtT((Date.now() - inicio) / 1000);
}

function guardarActivo() { guardarJson(ACTIVO, { inicio, metros: est.metros, puntos: est.puntos.slice(-MAX_PUNTOS) }); }

async function pedirPantalla() {
  try { bloqueo = await navigator.wakeLock?.request("screen"); } catch { bloqueo = null; }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && vigilante != null) pedirPantalla(); });

function iniciar() {
  if (!("geolocation" in navigator)) { aviso("Este dispositivo no permite usar el GPS desde el navegador.", true); return; }
  est = { puntos: [], metros: 0 }; inicio = Date.now(); lecturas = 0;
  $("iniciar").hidden = true; $("terminar").hidden = false; $("descartar").hidden = false; $("vivo").hidden = false;
  aviso("Buscando señal GPS… Deja la pantalla encendida.");
  $("v-prec").textContent = "—";
  pedirPantalla();
  vigilante = navigator.geolocation.watchPosition((pos) => {
    const c = pos.coords, entra = C.sumarPunto(est, { lat: c.latitude, lon: c.longitude, prec: c.accuracy, t: pos.timestamp });
    $("v-prec").textContent = `±${Math.round(c.accuracy)} m`;
    if (est.puntos.length) aviso("Grabando recorrido…");
    if (entra && ++lecturas % 5 === 0) guardarActivo();
    if (est.puntos.length >= MAX_PUNTOS) terminar();
    pintarVivo();
  }, (e) => {
    if (e.code === 1) { aviso("No has dado permiso de ubicación. Actívalo en los ajustes del navegador para grabar carreras.", true); detener(); }
    else if (e.code === 2) aviso("No hay señal GPS ahora mismo. Sigue intentándolo…", true);
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  reloj = setInterval(pintarVivo, 1000);
}

function detener() {
  if (vigilante != null) navigator.geolocation.clearWatch(vigilante);
  vigilante = null; clearInterval(reloj); reloj = null;
  bloqueo?.release?.().catch(() => {}); bloqueo = null;
  $("iniciar").hidden = false; $("terminar").hidden = true; $("descartar").hidden = true;
}

function terminar() {
  const fin = Date.now();
  detener();
  if (est && est.puntos.length >= 2 && est.metros >= 50) {
    const lista = [{ id: nuevoId(), inicio, fin, metros: Math.round(est.metros), puntos: est.puntos.map((p) => [p[0], p[1]]) }, ...leer()].slice(0, MAX_RECORRIDOS);
    guardarJson(CLAVE, lista);
    aviso(`Carrera guardada: ${fmtKm(est.metros)} en ${fmtT((fin - inicio) / 1000)}. Estimación del GPS; el taxímetro manda.`);
  } else aviso("No se ha guardado: el recorrido fue demasiado corto o no hubo señal GPS suficiente.", true);
  est = null; guardarJson(ACTIVO, null); $("vivo").hidden = true; pintarLista();
}

function descartar() { detener(); est = null; guardarJson(ACTIVO, null); $("vivo").hidden = true; aviso("Carrera descartada."); }

$("iniciar").addEventListener("click", iniciar);
$("terminar").addEventListener("click", terminar);
$("descartar").addEventListener("click", descartar);
$("exportar").addEventListener("click", () => {
  const fila = (r) => [new Date(r.inicio).toISOString(), new Date(r.fin).toISOString(), ((r.fin - r.inicio) / 60000).toFixed(1).replace(".", ","), (r.metros / 1000).toFixed(2).replace(".", ",")].join(";");
  descargarCSV("taxi-ia-recorridos.csv", ["Inicio;Fin;Duración (min);Distancia (km)", ...leer().map(fila)].join("\r\n"));
});
let sure = 0;
$("borrar").addEventListener("click", () => {
  if (!sure) { sure = 1; $("borrar").textContent = "¿Seguro? Pulsa otra vez"; setTimeout(() => { sure = 0; $("borrar").textContent = "Borrar todos"; }, 4000); return; }
  sure = 0; $("borrar").textContent = "Borrar todos"; guardarJson(CLAVE, []); pintarLista();
});

// Carrera sin terminar (se cerró la app): se ofrece cerrarla con lo grabado o descartarla.
const previo = leerJson(ACTIVO, null);
if (previo && Array.isArray(previo.puntos) && previo.puntos.length) {
  est = { puntos: previo.puntos, metros: previo.metros || 0 }; inicio = previo.inicio || Date.now();
  $("iniciar").hidden = true; $("terminar").hidden = false; $("descartar").hidden = false; $("vivo").hidden = false;
  $("v-km").textContent = fmtKm(est.metros); $("v-t").textContent = "—";
  aviso("Quedó una carrera sin terminar (la app se cerró). Termínala para guardarla con lo grabado o descártala.");
}
pintarLista();
