// Taxi-IA · Radar: próximos eventos de Madrid cargados por WhiteMoon desde fuentes públicas.
// Cada evento lleva su fuente y su enlace. La señal «posible más demanda» es orientativa: solo sale
// en eventos marcados como grandes y no lleva cifras. No se envía nada del usuario.
import "./nav.js";
import { $, el } from "./util.js";
import { API } from "./config.js";

const enlaceSeguro = (u) => { try { const x = new URL(u); return x.protocol === "https:" ? x.href : null; } catch { return null; } };
const dm = (iso) => iso.split("-").reverse().slice(0, 2).join("/");
const sumaDias = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };

/** «Hoy», «Mañana», «En curso» (varios días) o la fecha. */
function cuando(e, hoy) {
  const fin = e.fecha_fin || e.fecha;
  if (e.fecha <= hoy && fin >= hoy) return e.fecha_fin && e.fecha < hoy ? "En curso" : "Hoy";
  if (e.fecha === sumaDias(hoy, 1)) return "Mañana";
  return e.fecha_fin && e.fecha_fin !== e.fecha ? `${dm(e.fecha)} – ${dm(e.fecha_fin)}` : dm(e.fecha);
}

function tarjeta(e, hoy) {
  const hora = e.hora_ini ? (e.hora_fin ? `${e.hora_ini}–${e.hora_fin}` : `${e.hora_ini} h`) : "Todo el día";
  const etiquetas = el("div", { class: "eventos-etiquetas" }, el("span", { class: "etiqueta-estado hoy", text: cuando(e, hoy) }));
  if (e.grande) etiquetas.append(el("span", { class: "etiqueta-estado proximo", text: "Gran evento" }));
  const li = el("li", { class: "evento" }, etiquetas,
    el("h3", { text: e.nombre }),
    el("p", { class: "evento-lugar", text: `${e.lugar} · ${hora}` }));
  if (e.grande) li.append(el("p", { class: "nota", text: "Posible más demanda al terminar (orientativo, sin garantía)." }));
  const u = enlaceSeguro(e.fuente_url);
  li.append(el("p", { class: "nota" }, "Fuente: ", u ? el("a", { href: u, target: "_blank", rel: "noopener noreferrer", text: e.fuente }) : e.fuente));
  return li;
}

async function cargar() {
  const estado = $("estado-eventos");
  try {
    const r = await fetch(`${API}/taxi-eventos`, { credentials: "omit" });
    if (!r.ok) throw new Error(String(r.status));
    const { hoy, eventos } = await r.json();
    if (!Array.isArray(eventos) || !eventos.length) { estado.textContent = "No hay eventos cargados para los próximos días."; return; }
    estado.hidden = true;
    $("eventos").replaceChildren(...eventos.map((e) => tarjeta(e, hoy)));
  } catch (e) {
    estado.textContent = "No se han podido cargar los eventos. Comprueba la conexión e inténtalo de nuevo.";
    estado.classList.add("error");
    console.warn("Radar:", e.message);
  }
}
cargar();
