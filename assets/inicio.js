// Inicio: avisos de vencimientos y de mantenimiento al abrir la app (sin push ni servidor) y registro del SW.
// Los avisos del móvil son notificaciones locales: salen al abrir la app, no con la app cerrada.
import "./nav.js";
import { fechaCorta, hoyMadrid } from "./fechas.js";
import { leerJson, guardarJson } from "./datos.js";
import { avisos, leerVencimientos, migrarVencimientos, nombreVencimiento, textoEstado } from "./vencimientos.js";
import C from "./herramientas.js";
import { archivoCopia, crearCopia, leerCopia, restaurarCopia } from "./copia.js";

migrarVencimientos(); // tipos de versiones anteriores (decisión 100)

const fmt = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const caja = document.getElementById("avisos-vencimientos");
const items = avisos(leerVencimientos()).map((v) => ({ clase: v.clase, estado: `${textoEstado(v)}: `, texto: `${nombreVencimiento(v)} (${fechaCorta(v.fecha)}${v.vehiculo ? `, ${v.vehiculo}` : ""})` }));

// Mantenimiento por km: solo lo que toca ya o pronto, con los intervalos y km del propio usuario.
const km = leerJson("taxi.kmActual", "");
const mant = leerJson("taxi.mantenimiento", []);
if (Array.isArray(mant)) {
  for (const m of mant) {
    if (!m || typeof m.nombre !== "string") continue;
    const s = C.estadoMantenimiento(m, km);
    if (s.estado === "vencido") items.unshift({ clase: "vencido", estado: "Toca ya: ", texto: `${m.nombre} (te pasaste ${fmt.format(-s.quedan)} km)` });
    else if (s.estado === "pronto") items.push({ clase: "duda", estado: "Pronto: ", texto: `${m.nombre} (quedan ${fmt.format(s.quedan)} km)` });
  }
}

if (items.length) {
  const ul = document.createElement("ul");
  for (const v of items.slice(0, 5)) {
    const li = document.createElement("li");
    li.className = `vencimiento ${v.clase}`;
    const estado = document.createElement("strong");
    estado.textContent = v.estado;
    li.append(estado, document.createTextNode(v.texto));
    ul.append(li);
  }
  caja.insertBefore(ul, caja.querySelector("p"));
  if (items.length > 5) caja.querySelector("p").prepend(document.createTextNode(`Y ${items.length - 5} más. `));
  caja.hidden = false;
}

// ---- Avisos del móvil (notificaciones locales, con permiso del usuario) -----------------------
const CLAVE_NOTIF = "taxi.notif"; // {on: boolean, ultimo: "AAAA-MM-DD"}
const notif = leerJson(CLAVE_NOTIF, {});
const cajaNotif = document.getElementById("notif-caja");
const botonNotif = document.getElementById("notif-activar");
const estadoNotif = document.getElementById("notif-estado");
const posible = "Notification" in window && "serviceWorker" in navigator;

async function avisarSiToca() {
  if (!posible || Notification.permission !== "granted" || !notif.on || !items.length || notif.ultimo === hoyMadrid()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Taxi-IA: revisa tus avisos", { body: items.slice(0, 3).map((v) => `${v.estado}${v.texto}`).join("\n"), icon: "assets/icons/favicon-48.png", tag: "taxi-avisos" });
    guardarJson(CLAVE_NOTIF, { on: true, ultimo: hoyMadrid() });
  } catch (err) { console.warn("Aviso del móvil:", err.message); }
}

function pintarNotif() {
  if (!posible) return;
  cajaNotif.hidden = false;
  const activo = notif.on && Notification.permission === "granted";
  botonNotif.textContent = activo ? "Desactivar avisos en el móvil" : "Activar avisos en el móvil";
  estadoNotif.textContent = Notification.permission === "denied"
    ? "Tienes las notificaciones bloqueadas en este navegador: actívalas en sus ajustes."
    : activo ? "Activados: te avisaremos al abrir la app si hay algo que revisar (una vez al día). No suena con la app cerrada." : "";
}
botonNotif?.addEventListener("click", async () => {
  if (notif.on && Notification.permission === "granted") { notif.on = false; guardarJson(CLAVE_NOTIF, notif); return pintarNotif(); }
  const permiso = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  notif.on = permiso === "granted";
  guardarJson(CLAVE_NOTIF, notif);
  pintarNotif();
  if (notif.on) avisarSiToca();
});
pintarNotif();
avisarSiToca();

// ---- Guía de inicio: se enseña la primera vez y se puede volver a ver ---------------------------
const CLAVE_TOUR = "taxi.tour";
const tour = document.getElementById("tour"), verTour = document.getElementById("tour-ver");
const mostrarTour = (on) => { tour.hidden = !on; verTour.hidden = on; };
mostrarTour(leerJson(CLAVE_TOUR, null) !== "visto");
document.getElementById("tour-cerrar").addEventListener("click", () => { guardarJson(CLAVE_TOUR, "visto"); mostrarTour(false); verTour.focus(); });
verTour.addEventListener("click", () => { mostrarTour(true); tour.scrollIntoView({ block: "start" }); });

// ---- Copia de seguridad (archivo .json, sin cuentas) ------------------------------------------
const CLAVE_ULTIMA = "taxi.copia.ultima";
const estadoCopia = document.getElementById("copia-estado");
const pintarUltima = () => {
  const u = leerJson(CLAVE_ULTIMA, null);
  estadoCopia.textContent = typeof u === "string" ? `Última copia guardada desde este móvil: ${fechaCorta(u.slice(0, 10))}.` : "Aún no has guardado ninguna copia.";
};
pintarUltima();
document.getElementById("copia-guardar").addEventListener("click", () => {
  const copia = crearCopia();
  if (!Object.keys(copia.datos).length) { estadoCopia.textContent = "Todavía no hay datos que guardar."; return; }
  const { nombre, texto } = archivoCopia(copia);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
  a.download = nombre;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  guardarJson(CLAVE_ULTIMA, copia.fecha);
  estadoCopia.textContent = `Copia descargada (${nombre}). Guárdala en un sitio seguro.`;
});
let pendiente = null;
const confirmar = (on) => { document.getElementById("copia-confirmar").hidden = !on; if (!on) pendiente = null; };
document.getElementById("copia-archivo").addEventListener("change", async (ev) => {
  const f = ev.target.files[0];
  confirmar(false);
  if (!f) return;
  const r = leerCopia(f.size > 8_000_000 ? "" : await f.text());
  ev.target.value = "";
  if (r.error) { estadoCopia.textContent = r.error; return; }
  pendiente = r.copia;
  document.getElementById("copia-resumen").textContent = `Copia ${r.copia.fecha ? `del ${fechaCorta(r.copia.fecha.slice(0, 10))}` : "sin fecha"} con ${r.n} apartados. Restaurar sustituye en este móvil lo que traiga la copia; lo demás no se toca.`;
  confirmar(true);
});
document.getElementById("copia-no").addEventListener("click", () => { confirmar(false); estadoCopia.textContent = "No se ha cambiado nada."; });
document.getElementById("copia-si").addEventListener("click", () => {
  if (!pendiente) return;
  const r = restaurarCopia(pendiente);
  confirmar(false);
  estadoCopia.textContent = r.error ?? `Restaurado: ${r.n} apartados. Recarga la página para verlo todo.`;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
