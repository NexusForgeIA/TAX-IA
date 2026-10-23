// Taxi-IA · Gasolineras: listado de precios por ciudad, de la más barata a la más cara, con los datos de la función
// pública gasol-buscar (Gasol-IA). Se envían solo la ciudad, el municipio, el combustible y el filtro 24 h; sin
// ubicación del usuario ni nada guardado. «Cómo llegar» abre Maps o Waze con el destino; no se calcula ruta ni distancia.
import "./nav.js";
import { $, el } from "./util.js";
import { API } from "./config.js";
import { CIUDADES, COMBUSTIBLES, ATRIBUCION, LIMITE, urlBusqueda, municipiosDe, filasValidas, enlacesLlegar, fuenteSegura, horasDesde, porUnidad } from "./gasolineras-datos.js";

const CACHE_MS = 5 * 60 * 1000;
const fechaHora = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const euros = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const capitalizar = (s) => String(s ?? "").toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
const cuando = (iso) => `${fechaHora.format(new Date(iso))} (hora peninsular)`;

const estado = $("estado-gasolineras"), lista = $("gasolineras"), origen = $("origen-datos");
const selMunicipio = $("municipio"), selCombustible = $("combustible"), solo24 = $("solo24");

const cache = new Map(); // url -> {t, filas}: unos minutos en memoria, solo en esta pestaña
let territorios = null; // Promise de ?listado=territorios (para el selector de municipio)
let ciudad = "Madrid";

const pedir = (url) => fetch(url, { credentials: "omit", signal: AbortSignal.timeout(10000) }) // sin tope se quedaría en «Cargando…»
  .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));

function cargarTerritorios() {
  territorios ??= pedir(`${API}/gasol-buscar?listado=territorios`).then((d) => d.territorios)
    .catch((e) => { territorios = null; throw e; }); // si falla, se reintenta al cambiar de ciudad
  return territorios;
}

/** Selector de municipio: arranca con la ciudad y se completa con los de su provincia cuando llegan. */
async function pintarMunicipios() {
  const { provincia, municipio } = CIUDADES[ciudad];
  selMunicipio.replaceChildren(el("option", { value: municipio, text: ciudad }));
  try {
    const muns = municipiosDe(await cargarTerritorios(), provincia);
    if (CIUDADES[ciudad].provincia !== provincia || !muns.length) return; // ya se eligió otra ciudad
    const elegido = selMunicipio.value;
    selMunicipio.replaceChildren(...muns.map(([id, nombre]) => el("option", { value: id, text: nombre })));
    selMunicipio.value = elegido;
  } catch { /* se queda solo la ciudad */ }
}

function tarjeta(f, combustible, minimo) {
  const llegar = enlacesLlegar(f);
  const chips = el("span", { class: "meta" },
    Number(f.precio) === minimo ? el("span", { class: "primera-etiqueta", text: "Precio más bajo" }) : null,
    f.abierta_24h === "si" ? el("span", { class: "chip si", text: "Abierta 24 h" })
      : f.abierta_24h === "sin_confirmar" ? el("span", { class: "chip duda", text: "Horario sin confirmar" }) : null);
  return el("li", { class: `estacion${Number(f.precio) === minimo ? " primera" : ""}` },
    el("h3", { text: capitalizar(f.rotulo || "Sin rótulo") }),
    el("span", { class: "precio" }, el("strong", { text: `${euros.format(Number(f.precio))} €` }), el("span", { class: "unidad", text: porUnidad(combustible) })),
    el("p", { class: "dir", text: [capitalizar(f.direccion), f.municipio].filter(Boolean).join(" · ") }),
    chips,
    el("p", { class: "captura", text: f.horario_texto ? `Horario publicado por la estación: ${f.horario_texto}` : "Sin horario publicado" }),
    el("p", { class: "captura", text: `Precio capturado el ${cuando(f.fecha_captura)}.` }),
    llegar ? el("div", { class: "botones" },
      el("a", { class: "boton", href: llegar.maps, target: "_blank", rel: "noopener noreferrer", text: "Cómo llegar · Google Maps" }),
      el("a", { class: "boton-sec", href: llegar.waze, target: "_blank", rel: "noopener noreferrer", text: "Waze" })) : null);
}

function pintarOrigen(filas) {
  const ultima = filas.map((f) => f.fecha_captura).sort().at(-1);
  const fuente = fuenteSegura(filas.find((f) => f.fuente)?.fuente);
  const partes = [el("p", { text: `${ATRIBUCION}. Taxi-IA no tiene relación con el Ministerio.` })];
  if (ultima) partes.push(el("p", { text: `Última captura de estos precios: ${cuando(ultima)}.` }));
  if (fuente) partes.push(el("p", {}, "Fuente: ", el("a", { href: fuente, target: "_blank", rel: "noopener noreferrer", text: "servicio de precios de carburantes del Ministerio" }), "."));
  origen.replaceChildren(...partes);
  origen.hidden = false;
  return ultima;
}

let ultimaPeticion = 0; // descarta respuestas de una búsqueda que ya no es la elegida
async function cargar() {
  const n = ++ultimaPeticion;
  const combustible = selCombustible.value;
  const url = urlBusqueda(API, { combustible, provincia: CIUDADES[ciudad].provincia, municipio: selMunicipio.value, solo24: solo24.checked });
  estado.hidden = false; estado.classList.remove("error"); estado.textContent = "Cargando precios…";
  lista.replaceChildren(); origen.hidden = true;
  try {
    let c = cache.get(url);
    if (!c || Date.now() - c.t > CACHE_MS) { c = { t: Date.now(), filas: filasValidas((await pedir(url)).resultados) }; cache.set(url, c); }
    if (n !== ultimaPeticion) return;
    const { filas } = c;
    if (!filas.length) {
      estado.textContent = solo24.checked
        ? "No hay gasolineras con ese combustible abiertas 24 h confirmadas en este municipio. Prueba sin el filtro."
        : "No hay gasolineras con ese combustible en este municipio.";
      return;
    }
    const nombre = selCombustible.selectedOptions[0].textContent;
    const ultima = pintarOrigen(filas);
    const vieja = ultima && horasDesde(ultima) > 24 ? ` Ojo: la última captura disponible es del ${cuando(ultima)}; los precios pueden haber cambiado.` : "";
    estado.textContent = `${filas.length === LIMITE ? `Las ${LIMITE} más baratas` : `${filas.length} gasolineras`} · ${nombre}, de menor a mayor precio.${vieja}`;
    lista.replaceChildren(...filas.map((f) => tarjeta(f, combustible, Number(filas[0].precio))));
  } catch (e) {
    if (n !== ultimaPeticion) return;
    estado.textContent = "No se han podido cargar los precios. Comprueba la conexión e inténtalo de nuevo. ";
    estado.classList.add("error");
    const otra = el("button", { type: "button", class: "boton-sec", text: "Reintentar" });
    otra.addEventListener("click", cargar);
    estado.append(otra);
    console.warn("Gasolineras:", e.message);
  }
}

selCombustible.replaceChildren(...COMBUSTIBLES.map(([v, t]) => el("option", { value: v, text: t })));
const botones = Object.keys(CIUDADES).map((c) => { const b = el("button", { type: "button", class: "pildora", text: c }); b.addEventListener("click", () => elegir(c)); return b; });
$("ciudades").append(...botones);
function elegir(c) {
  ciudad = c;
  botones.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === c)));
  pintarMunicipios();
  cargar();
}
for (const n of [selMunicipio, selCombustible, solo24]) n.addEventListener("change", cargar);
elegir(ciudad);
