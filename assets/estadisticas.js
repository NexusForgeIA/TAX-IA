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

function pintar() {
  const lista = filtrar(leerCarreras());
  $("vacio").hidden = lista.length > 0;
  $("contenido").hidden = lista.length === 0;
  if (!lista.length) return;
  const r = C.resumen(lista);
  $("kpis").replaceChildren(...[["Total facturado", e(r.total)], ["Apuntes", String(r.n)], ["Importe medio", r.medio == null ? "—" : e(r.medio)]]
    .flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })]));
  tabla("dias", ["Día", "Apuntes", "Total", "Media"], C.porDiaSemana(lista).map((x, i) => ({ etiqueta: DIAS[i], ...x })));
  const fr = C.porFranja(lista);
  tabla("franjas", ["Franja", "Carreras", "Total", "Media"], fr.franjas.map((x, i) => ({ etiqueta: C.franjas[i], ...x })));
  $("sinhora").textContent = fr.sinHora ? `Sin hora: ${fr.sinHora} (totales sin detallar). No entran en las franjas.` : "";
  // Canal y forma de cobro
  const grupos = new Map();
  for (const c of lista) {
    const clave = c.canal === "app" ? `${CANALES.app}${c.app ? ` · ${c.app}` : ""}` : CANALES.calle;
    const g = grupos.get(clave) ?? { etiqueta: clave, n: 0, total: 0 };
    g.n++; g.total += c.importe; grupos.set(clave, g);
  }
  tabla("canales", ["Canal", "Apuntes", "Total", "Media"], [...grupos.values()].sort((a, b) => b.total - a.total).map((g) => ({ ...g, total: Math.round(g.total * 100) / 100, medio: Math.round(g.total / g.n * 100) / 100 })));
  const formas = new Map();
  for (const c of lista) {
    const k = METODOS[c.canal][c.metodo];
    const g = formas.get(k) ?? { etiqueta: k, n: 0, total: 0 };
    g.n++; g.total += c.importe; formas.set(k, g);
  }
  tabla("metodos", ["Cobro", "Apuntes", "Total", "Media"], [...formas.values()].map((g) => ({ ...g, total: Math.round(g.total * 100) / 100, medio: Math.round(g.total / g.n * 100) / 100 })));
}

sel.addEventListener("change", pintar);
pintar();
