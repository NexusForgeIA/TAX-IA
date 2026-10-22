// Taxi-IA · estadísticas con las carreras que el usuario apunta en Facturación. Nada sale del navegador.
import "./nav.js";
import { $, el } from "./util.js";
import { euros } from "./numeros.js";
import { hoyMadrid, sumarDias, nombreMes } from "./fechas.js";
import { CANALES, METODOS, leerCarreras } from "./ingresos.js";
import C from "./herramientas.js";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const e = (n) => `${euros(n)} €`;
const sel = $("periodo");
const hoy = hoyMadrid();
const PERIODOS = [["todo", "Todo"], ["mes", "Este mes"], ["30", "Últimos 30 días"], ["90", "Últimos 90 días"]];
for (const [v, t] of PERIODOS) sel.append(el("option", { value: v, text: v === "mes" ? `Este mes (${nombreMes(hoy.slice(0, 7))})` : t }));

function filtrar(todas) {
  const p = sel.value;
  if (p === "mes") return C.enPeriodo(todas, C.inicioMes(hoy), hoy);
  if (p === "30" || p === "90") return C.enPeriodo(todas, sumarDias(hoy, -(Number(p) - 1)), hoy);
  return todas;
}

function tabla(dest, cabecera, filas) {
  const max = Math.max(0, ...filas.map((f) => f.total));
  const t = el("table", { class: "tabla-calculo" },
    el("thead", {}, el("tr", {}, ...cabecera.map((c) => el("th", { scope: "col", text: c })))),
    el("tbody", {}, ...filas.map((f) => el("tr", {}, el("th", { scope: "row", text: f.etiqueta }), el("td", { text: String(f.n) }),
      el("td", { class: max > 0 && f.total === max ? "max" : "", text: e(f.total) }), el("td", { text: f.medio == null ? "—" : e(f.medio) })))));
  $(dest).replaceChildren(t);
}

const NS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}, ...hijos) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); n.append(...hijos); return n; };
let modo = "n";
/** Gráfica de barras por hora (0-23) con las carreras del usuario. SVG sin estilos en línea. */
function grafica(lista) {
  const datos = C.porHora(lista), v = (x) => (modo === "n" ? x.n : x.total), max = Math.max(0, ...datos.map(v));
  const W = 288, H = 130, base = 104, alto = 90, ancho = W / 24;
  const g = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "grafica-svg", role: "img", "aria-label": "Carreras por hora del día" }, svg("title", {}, document.createTextNode("Tus carreras por hora del día")));
  g.append(svg("line", { x1: 0, y1: base, x2: W, y2: base, class: "grafica-eje" }));
  datos.forEach((x, i) => {
    const h = max > 0 ? Math.round((v(x) / max) * alto) : 0;
    if (h > 0) g.append(svg("rect", { x: i * ancho + 1.5, y: base - h, width: ancho - 3, height: h, rx: 2, class: v(x) === max ? "grafica-barra max" : "grafica-barra" }));
    if (i % 3 === 0) g.append(svg("text", { x: i * ancho + ancho / 2, y: base + 14, class: "grafica-txt", "text-anchor": "middle" }, document.createTextNode(String(i).padStart(2, "0"))));
  });
  $("grafica").replaceChildren(g);
  const picos = datos.map((x, i) => [i, v(x)]).filter(([, y]) => max > 0 && y === max).map(([i]) => `${String(i).padStart(2, "0")}:00–${String(i + 1).padStart(2, "0")}:00`);
  $("grafica-resumen").textContent = max > 0
    ? `Hora con más ${modo === "n" ? "carreras" : "facturación"} en lo que has apuntado: ${picos.join(", ")} (${modo === "n" ? `${max} ${max === 1 ? "carrera" : "carreras"}` : e(max)}). Son tus datos, no una previsión. Las carreras sin hora no entran.`
    : "Apunta la hora en tus carreras para ver aquí tus horas punta.";
}
function pintar() {
  const lista = filtrar(leerCarreras());
  $("vacio").hidden = lista.length > 0;
  $("contenido").hidden = lista.length === 0;
  if (!lista.length) return;
  const r = C.resumen(lista);
  // Las medias solo cuentan carreras con hora: un total sin detallar (p. ej. el cierre del datáfono) no es una carrera.
  const conHora = lista.filter((c) => c.hora != null);
  const media = (l) => (l.length ? Math.round(l.reduce((s, c) => s + c.importe, 0) / l.length * 100) / 100 : null);
  r.medio = media(conHora);
  $("kpis").replaceChildren(...[["Total facturado", e(r.total)], ["Apuntes", String(r.n)], ["Importe medio", r.medio == null ? "—" : e(r.medio)]]
    .flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })]));
  const mediasDia = C.porDiaSemana(conHora);
  tabla("dias", ["Día", "Apuntes", "Total", "Media (solo carreras con hora)"], C.porDiaSemana(lista).map((x, i) => ({ etiqueta: DIAS[i], ...x, medio: mediasDia[i].medio })));
  grafica(lista);
  const fr = C.porFranja(lista);
  tabla("franjas", ["Franja", "Carreras", "Total", "Media"], fr.franjas.map((x, i) => ({ etiqueta: C.franjas[i], ...x })));
  $("sinhora").textContent = fr.sinHora ? `Sin hora: ${fr.sinHora} (totales sin detallar). No entran en las franjas.` : "";
  // Canal y forma de cobro
  const grupos = new Map();
  for (const c of lista) {
    const clave = c.canal === "app" ? `${CANALES.app}${c.app ? ` · ${c.app}` : ""}` : CANALES.calle;
    const g = grupos.get(clave) ?? { etiqueta: clave, n: 0, total: 0 };
    g.n++; g.total += c.importe; if (c.hora != null) { g.nh = (g.nh ?? 0) + 1; g.th = (g.th ?? 0) + c.importe; } grupos.set(clave, g);
  }
  tabla("canales", ["Canal", "Apuntes", "Total", "Media (solo con hora)"], [...grupos.values()].sort((a, b) => b.total - a.total).map((g) => ({ ...g, total: Math.round(g.total * 100) / 100, medio: g.nh ? Math.round(g.th / g.nh * 100) / 100 : null })));
  const formas = new Map();
  for (const c of lista) {
    const k = METODOS[c.canal][c.metodo];
    const g = formas.get(k) ?? { etiqueta: k, n: 0, total: 0 };
    g.n++; g.total += c.importe; if (c.hora != null) { g.nh = (g.nh ?? 0) + 1; g.th = (g.th ?? 0) + c.importe; } formas.set(k, g);
  }
  tabla("metodos", ["Cobro", "Apuntes", "Total", "Media (solo con hora)"], [...formas.values()].map((g) => ({ ...g, total: Math.round(g.total * 100) / 100, medio: g.nh ? Math.round(g.th / g.nh * 100) / 100 : null })));
}

for (const [id, m] of [["ver-n", "n"], ["ver-t", "t"]]) $(id).addEventListener("click", () => {
  modo = m; $("ver-n").setAttribute("aria-pressed", String(m === "n")); $("ver-t").setAttribute("aria-pressed", String(m === "t")); pintar();
});
sel.addEventListener("change", pintar);
pintar();
