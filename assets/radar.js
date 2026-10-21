// Taxi-IA · Radar: próximos eventos de Madrid, Barcelona, Sevilla y Valencia cargados por WhiteMoon
// desde fuentes públicas. Cada evento lleva su fuente y su enlace. La señal «posible más demanda» es
// orientativa: solo sale en eventos marcados como grandes y no lleva cifras. No se envía nada del
// usuario; solo se guarda en este navegador la última ciudad elegida.
import "./nav.js";
import { $, el } from "./util.js";
import { API } from "./config.js";
import { guardarJson, leerJson } from "./datos.js";

const CIUDADES = ["Madrid", "Barcelona", "Sevilla", "Valencia"];
const CLAVE = "taxi.ciudad";
const AENA = "https://www.aena.es/es/infovuelos.html";
const RENFE = "https://www.renfe.com/";
// Enlaces generales a las webs de cada operador (no al panel de cada estación).
const LLEGADAS = {
  Madrid: [["avion", "Barajas", "Vuelos de llegada · AENA", "Oficial", AENA], ["avion", "Barajas por franjas", "Llegadas por franjas horarias", "No oficial", "https://www.aeropuertomadrid-barajas.com/llegadas.html"],
    ["tren", "Atocha y Chamartín", "Renfe: busca tu estación", "Oficial", RENFE], ["autobus", "Estación Sur", "Méndez Álvaro · información", "Info", "https://www.movelia.es/es/estaciones/estacion-sur-de-autobuses-de-madrid"]],
  Barcelona: [["avion", "El Prat", "Vuelos de llegada · AENA", "Oficial", AENA], ["tren", "Barcelona-Sants", "Renfe: busca tu estación", "Oficial", RENFE]],
  Sevilla: [["avion", "San Pablo", "Vuelos de llegada · AENA", "Oficial", AENA], ["tren", "Santa Justa", "Renfe: busca tu estación", "Oficial", RENFE]],
  Valencia: [["avion", "Manises", "Vuelos de llegada · AENA", "Oficial", AENA], ["tren", "Joaquín Sorolla", "Renfe: busca tu estación", "Oficial", RENFE]],
};
// Foto del estadio si el «lugar» del evento lo nombra; si no, la genérica del tipo.
const ESTADIOS = [[/bernab[eé]u/i, "estadio-bernabeu"], [/metropolitano/i, "estadio-metropolitano"], [/camp nou|spotify camp|olímpic lluís|olimpic lluis/i, "estadio-camp-nou"], [/s[aá]nchez.?pizju[aá]n/i, "estadio-sanchez-pizjuan"]];
const fotoDe = (e) => ESTADIOS.find(([r]) => r.test(e.lugar || ""))?.[1] || FOTO[e.tipo] || FOTO.otro;
const FOTO = { futbol: "evento-futbol", feria: "evento-feria", concierto: "evento-otro", otro: "evento-otro" };

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
  const hora = e.hora_ini ? (e.hora_fin ? `${e.hora_ini}–${e.hora_fin}` : `${e.hora_ini} h`) : (e.fecha_fin && e.fecha_fin !== e.fecha ? "Varios días" : "Hora por confirmar");
  const f = fotoDe(e);
  const chips = el("div", { class: "eventos-etiquetas" }, el("span", { class: "etiqueta-estado hoy", text: cuando(e, hoy) }));
  if (e.grande) chips.append(el("span", { class: "etiqueta-estado proximo", text: "Gran evento" }));
  const pie = el("div", { class: "evento-texto" },
    el("h3", { text: e.nombre }),
    el("p", { class: "evento-lugar", text: `${hora} · ${e.lugar}` }));
  if (e.grande) pie.append(el("p", { class: "evento-nota", text: "Posible más demanda al terminar (orientativo, sin garantía)." }));
  const u = enlaceSeguro(e.fuente_url);
  pie.append(el("p", { class: "evento-nota" }, "Fuente: ", u ? el("a", { href: u, target: "_blank", rel: "noopener noreferrer", text: e.fuente }) : e.fuente));
  const foto = el("picture", {}, el("source", { srcset: `assets/img/${f}.webp`, type: "image/webp" }),
    el("img", { src: `assets/img/${f}.jpg`, width: "400", height: "500", alt: "", loading: "lazy", decoding: "async" }));
  return el("li", { class: "evento" }, foto, chips, pie);
}

function pintarLlegadas(ciudad) {
  $("llegadas").replaceChildren(...LLEGADAS[ciudad].map(([ic, t, s, ins, u]) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icono"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use"); use.setAttribute("href", `assets/iconos.svg#${ic}`); svg.append(use);
    return el("li", {}, el("a", { href: u, target: "_blank", rel: "noopener noreferrer" }, svg,
      el("span", { class: "llegada-txt" }, el("strong", { text: t }), el("span", { text: s })),
      el("span", { class: `insignia${ins === "Oficial" ? " ok" : ""}`, text: ins })));
  }));
}

let ultima = 0; // descarta respuestas de una ciudad que ya no es la elegida
async function cargar(ciudad) {
  const n = ++ultima, estado = $("estado-eventos");
  estado.hidden = false; estado.classList.remove("error"); estado.textContent = "Cargando eventos…";
  $("eventos").replaceChildren();
  try {
    const r = await fetch(`${API}/taxi-eventos?ciudad=${encodeURIComponent(ciudad)}`, { credentials: "omit" });
    if (!r.ok) throw new Error(String(r.status));
    const { hoy, eventos } = await r.json();
    if (n !== ultima) return;
    if (!Array.isArray(eventos) || !eventos.length) { estado.textContent = `Aún no hay eventos cargados para ${ciudad} en los próximos días.`; return; }
    estado.hidden = true;
    $("eventos").replaceChildren(...eventos.map((e) => tarjeta(e, hoy)));
  } catch (e) {
    if (n !== ultima) return;
    estado.textContent = "No se han podido cargar los eventos. Comprueba la conexión e inténtalo de nuevo.";
    estado.classList.add("error");
    console.warn("Radar:", e.message);
  }
}

let ciudad = leerJson(CLAVE, "Madrid");
if (!CIUDADES.includes(ciudad)) ciudad = "Madrid";
const pildoras = $("ciudades");
const botones = CIUDADES.map((c) => { const b = el("button", { type: "button", class: "pildora", text: c }); b.addEventListener("click", () => elegir(c)); return b; });
pildoras.append(...botones);
function elegir(c, guardar = true) {
  ciudad = c;
  botones.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === c)));
  if (guardar) guardarJson(CLAVE, c);
  pintarLlegadas(c); cargar(c);
}
elegir(ciudad, false);
