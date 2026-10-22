// Estadísticas · «Semana»: total, barras por día y KPIs de lunes a domingo con lo que apunta el usuario.
// Las cuentas están en semana.js; aquí solo se pinta. Nada sale del navegador.
import { $, el } from "./util.js";
import { euros } from "./numeros.js";
import { leerJson } from "./datos.js";
import { diaSemana, fechaLarga, hoyMadrid, sumarDias } from "./fechas.js";
import { leerCarreras } from "./ingresos.js";
import { leerObjetivo } from "./objetivo.js";
import { comparar, lunesDe, resumenSemana } from "./semana.js";

const e = (n) => `${euros(n)} €`; // sin partir la cifra del €
const signo = (n) => (n > 0 ? "+" : n < 0 ? "−" : "");
const horasTxt = (h) => `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(h)} h`;
const LETRAS = ["L", "M", "X", "J", "V", "S", "D"];
const fmtDM = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "long" });
const dm = (s) => { const [y, m, d] = s.split("-").map(Number); return fmtDM.format(new Date(Date.UTC(y, m - 1, d))); };
const dia = (s) => Number(s.slice(8));

const hoy = hoyMadrid();
const esta = lunesDe(hoy);
let lunes = esta;

function titulo(r) {
  const rango = r.lunes.slice(0, 7) === r.domingo.slice(0, 7) ? `${dia(r.lunes)}–${dm(r.domingo)}` : `${dm(r.lunes)} – ${dm(r.domingo)}`;
  return lunes === esta ? `Esta semana · ${rango}` : `Semana ${rango}`;
}

const NS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}, ...hijos) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); n.append(...hijos); return n; };
const txt = (s) => document.createTextNode(s);

/** Barras de lunes a domingo con su importe encima; línea discontinua del objetivo solo si el usuario lo puso. */
function grafica(r, objetivo) {
  const W = 288, H = 150, base = 124, alto = 96, ancho = W / 7;
  const max = Math.max(0, objetivo ?? 0, ...r.dias.map((d) => d.total));
  const g = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "grafica-svg", "aria-hidden": "true", focusable: "false" });
  g.append(svg("line", { x1: 0, y1: base, x2: W, y2: base, class: "grafica-eje" }));
  r.dias.forEach((d, i) => {
    const h = max > 0 ? Math.round((d.total / max) * alto) : 0, x = i * ancho;
    if (h > 0) g.append(svg("rect", { x: x + 5, y: base - h, width: ancho - 10, height: h, rx: 3, class: r.mejorDia?.fecha === d.fecha ? "grafica-barra max" : "grafica-barra" }));
    if (d.lineas) g.append(svg("text", { x: x + ancho / 2, y: base - h - 4, class: "grafica-valor", "text-anchor": "middle" }, txt(euros(d.total, 0))));
    g.append(svg("text", { x: x + ancho / 2, y: base + 16, class: d.fecha === hoy ? "grafica-txt hoy" : "grafica-txt", "text-anchor": "middle" }, txt(`${LETRAS[i]} ${dia(d.fecha)}`)));
  });
  if (objetivo != null) { const y = base - Math.round((objetivo / max) * alto); g.append(svg("line", { x1: 0, y1: y, x2: W, y2: y, class: "grafica-objetivo" })); }
  $("sem-grafica").replaceChildren(g);
  // Lo mismo en texto para lectores de pantalla
  $("sem-lista").replaceChildren(...r.dias.map((d) => el("li", { text: `${fechaLarga(d.fecha)}: ${e(d.total)}${d.carreras ? `, ${d.carreras} ${d.carreras === 1 ? "carrera" : "carreras"}` : ""}` })));
}

function pintar() {
  const carreras = leerCarreras(), turnos = leerJson("taxi.turnos", []), objetivo = leerObjetivo();
  const r = resumenSemana(carreras, turnos, lunes);
  const cmp = comparar(r, resumenSemana(carreras, turnos, sumarDias(lunes, -7)));
  $("t-semana").textContent = titulo(r);
  $("sem-sig").disabled = lunes >= esta;
  $("sem-total").textContent = e(r.total);
  $("sem-vacio").hidden = r.lineas > 0;
  $("sem-contenido").hidden = r.lineas === 0;
  $("sem-comparacion").textContent = r.lineas === 0 ? "" : cmp
    ? `${signo(cmp.diferencia)}${e(Math.abs(cmp.diferencia))}${cmp.pct == null ? "" : ` (${signo(cmp.pct)}${euros(Math.abs(cmp.pct), 1)} %)`} frente a la semana anterior (${e(cmp.anterior)})`
    : "La semana anterior no tiene nada apuntado: no hay con qué comparar.";
  if (!r.lineas) return;

  grafica(r, objetivo);
  $("sem-objetivo").textContent = objetivo == null ? "" : `Línea discontinua: tu objetivo diario (${e(objetivo)}). Días que lo alcanzan: ${r.dias.filter((d) => d.total >= objetivo).length} de 7.`;
  const sinDetalle = r.lineas - r.carreras;
  $("sem-kpis").replaceChildren(...[
    ["Carreras", String(r.carreras)],
    ["Media por carrera", r.media == null ? "—" : e(r.media)],
    ["Horas trabajadas", r.horas == null ? "—" : horasTxt(r.horas)],
    ["€ por hora", r.eurosHora == null ? "—" : e(r.eurosHora.valor)],
    ["Mejor día", r.mejorDia ? `${diaSemana(r.mejorDia.fecha)} · ${e(r.mejorDia.total)}` : "—"],
  ].flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })]));
  const notas = [];
  if (r.horas != null && r.turnosConHoras < r.turnos) notas.push(`Horas de ${r.turnosConHoras} de ${r.turnos} turnos: los demás no tienen horas apuntadas. `);
  if (r.eurosHora == null) notas.push("Para ver el € por hora, apunta las horas de cada turno en ", el("a", { href: "turnos.html", text: "Turnos" }), ". ");
  else if (r.eurosHora.parcial) notas.push("El € por hora solo cuenta los días en que todos los turnos tienen horas. ");
  if (sinDetalle) notas.push(`${sinDetalle === 1 ? "Hay 1 total sin detallar: suma" : `Hay ${sinDetalle} totales sin detallar: suman`} en euros, pero no cuenta${sinDetalle === 1 ? "" : "n"} como carrera ni en la media.`);
  $("sem-notas").replaceChildren(...notas);
}

$("sem-ant").addEventListener("click", () => { lunes = sumarDias(lunes, -7); pintar(); });
$("sem-sig").addEventListener("click", () => { if (lunes < esta) { lunes = sumarDias(lunes, 7); pintar(); } });
pintar();
