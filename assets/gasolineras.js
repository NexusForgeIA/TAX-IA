// Taxi-IA · Gasolineras: listado de precios por ciudad, de la más barata a la más cara, con los datos que Taxi-IA carga
// del Ministerio (función pública taxi-gasolineras). Se envían solo la ciudad, el municipio, el combustible y el filtro
// 24 h; sin ubicación del usuario ni nada guardado. «Cómo llegar» abre Maps o Waze con el destino; no se calcula ruta ni
// distancia. Si la captura tiene más de 3 horas, se avisa de que los precios pueden estar desactualizados.
import "./nav.js";
import { $, el } from "./util.js";
import { API } from "./config.js";
import { CIUDADES, COMBUSTIBLES, ATRIBUCION, LIMITE, HORAS_DESACTUALIZADA, urlBusqueda, municipiosDe, filasValidas, fechaValida, enlacesLlegar, fuenteSegura, horasDesde, porUnidad } from "./gasolineras-datos.js";

const CACHE_MS = 5 * 60 * 1000;
const fechaHora = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const euros = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const capitalizar = (s) => String(s ?? "").toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
const cuando = (iso) => `${fechaHora.format(new Date(iso))} (hora peninsular)`;

const estado = $("estado-gasolineras"), lista = $("gasolineras"), origen = $("origen-datos"), avisoViejo = $("aviso-desactualizado");
const selMunicipio = $("municipio"), selCombustible = $("combustible"), solo24 = $("solo24");

const cache = new Map(); // url -> {t, d}: unos minutos en memoria, solo en esta pestaña
let ciudad = "Madrid";
let conMunicipios = null; // ciudad cuyo selector ya tiene todos sus municipios

const pedir = (url) => fetch(url, { credentials: "omit", signal: AbortSignal.timeout(10000) }) // sin tope se quedaría en «Cargando…»
  .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));

/** El selector arranca con la capital y se completa con los municipios de la provincia que trae la primera respuesta. */
function pintarMunicipios(listaMunicipios) {
  if (conMunicipios === ciudad) return;
  const muns = municipiosDe(listaMunicipios);
  if (!muns.length) return;
  const elegido = selMunicipio.value;
  selMunicipio.replaceChildren(...muns.map(([id, nombre]) => el("option", { value: id, text: nombre })));
  selMunicipio.value = elegido;
  conMunicipios = ciudad;
}

function tarjeta(f, combustible, minimo, fecha) {
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
    el("p", { class: "captura", text: `Precio capturado el ${cuando(fecha)}.` }),
    llegar ? el("div", { class: "botones" },
      el("a", { class: "boton", href: llegar.maps, target: "_blank", rel: "noopener noreferrer", text: "Cómo llegar · Google Maps" }),
      el("a", { class: "boton-sec", href: llegar.waze, target: "_blank", rel: "noopener noreferrer", text: "Waze" })) : null);
}

function pintarOrigen(fecha, fuenteUrl) {
  const fuente = fuenteSegura(fuenteUrl);
  const partes = [el("p", { text: `${ATRIBUCION}. Taxi-IA no tiene relación con el Ministerio.` }),
    el("p", { text: `Última captura de estos precios: ${cuando(fecha)}.` })];
  if (fuente) partes.push(el("p", {}, "Fuente: ", el("a", { href: fuente, target: "_blank", rel: "noopener noreferrer", text: "servicio de precios de carburantes del Ministerio" }), "."));
  origen.replaceChildren(...partes);
  origen.hidden = false;
}

let ultimaPeticion = 0; // descarta respuestas de una búsqueda que ya no es la elegida
async function cargar() {
  const n = ++ultimaPeticion;
  const combustible = selCombustible.value;
  const url = urlBusqueda(API, { ciudad, municipio: selMunicipio.value, combustible, solo24: solo24.checked });
  estado.hidden = false; estado.classList.remove("error"); estado.textContent = "Cargando precios…";
  lista.replaceChildren(); origen.hidden = true; avisoViejo.hidden = true;
  try {
    let c = cache.get(url);
    if (!c || Date.now() - c.t > CACHE_MS) { c = { t: Date.now(), d: await pedir(url) }; cache.set(url, c); }
    if (n !== ultimaPeticion) return;
    pintarMunicipios(c.d.municipios);
    const fecha = fechaValida(c.d.fecha_fuente);
    if (!fecha) { estado.textContent = `Aún no hay precios cargados para ${ciudad}. Vuelve a intentarlo más tarde.`; return; }
    const filas = filasValidas(c.d.resultados);
    if (!filas.length) {
      estado.textContent = solo24.checked
        ? "No hay gasolineras con ese combustible abiertas 24 h confirmadas en este municipio. Prueba sin el filtro."
        : "No hay gasolineras con ese combustible en este municipio.";
      return;
    }
    if (horasDesde(fecha) >= HORAS_DESACTUALIZADA) {
      avisoViejo.replaceChildren(el("strong", { text: "Los precios pueden estar desactualizados" }), ` (última captura: ${fechaHora.format(new Date(fecha))}, hora peninsular).`);
      avisoViejo.hidden = false;
    }
    const nombre = selCombustible.selectedOptions[0].textContent;
    const cuantas = filas.length === LIMITE ? `Las ${LIMITE} más baratas` : filas.length === 1 ? "1 gasolinera" : `${filas.length} gasolineras`;
    estado.textContent = `${cuantas} · ${nombre}, de menor a mayor precio.`;
    pintarOrigen(fecha, c.d.fuente);
    lista.replaceChildren(...filas.map((f) => tarjeta(f, combustible, Number(filas[0].precio), fecha)));
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
  conMunicipios = null;
  botones.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === c)));
  selMunicipio.replaceChildren(el("option", { value: CIUDADES[c].municipio, text: c }));
  cargar();
}
for (const n of [selMunicipio, selCombustible, solo24]) n.addEventListener("change", cargar);
elegir(ciudad);
