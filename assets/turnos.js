// Taxi-IA · cierre de turno. Recaudación, gastos y reparto con las cifras del usuario.
// Puede traer el total de Facturación y el combustible de Gastos de ese día. Solo en este navegador.
import "./nav.js";
import { $, cifras, descargarCSV, el } from "./util.js";
import { euros, leerNumero, redondear } from "./numeros.js";
import { guardarJson, leerJson, nuevoId } from "./datos.js";
import { esFechaISO, fechaCorta, hoyMadrid, sumarDias } from "./fechas.js";
import { leerCarreras, totalesCarreras } from "./ingresos.js";
import { celdaCSV, leerRegistros } from "./gastos.js";
import { leerOtros } from "./otros-gastos.js";
import C from "./herramientas.js";

const CLAVE = "taxi.turnos";
const CLAVE_PREF = "taxi.turnos.pref";
const MAX = 3000;
const form = $("f-turno");
const e = (n) => `${euros(n)} €`;
let lista = leerJson(CLAVE, []);
if (!Array.isArray(lista)) lista = [];
lista = lista.filter((t) => t && typeof t.id === "string" && esFechaISO(t.fecha));
let ultimoBorrado = null;

const pref = leerJson(CLAVE_PREF, {});
form.fecha.value = hoyMadrid();
form.fecha.max = sumarDias(hoyMadrid(), 1);
if (typeof pref.pct === "string") form.pct.value = pref.pct;
if (pref.base === "recaudacion" || pref.base === "neto") form.base.value = pref.base;

const guardar = () => guardarJson(CLAVE, lista);
const msg = (t, err = false) => { $("estado-form").textContent = t; $("estado-form").classList.toggle("error", err); };
const num = (v) => { const n = leerNumero(v); return Number.isFinite(n) ? n : 0; };

const fechaDeMs = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" });
const kmGpsDelDia = (dia) => {
  const l = leerJson("taxi.trayectos", []);
  return Array.isArray(l) ? l.filter((t) => t && Number.isFinite(t.inicio) && Number.isFinite(t.metros) && fechaDeMs.format(new Date(t.inicio)) === dia).reduce((s, t) => s + t.metros, 0) / 1000 : 0;
};

// Trae del día elegido todo lo apuntado: recaudación, gastos (combustible y otros), km del GPS y el desglose por forma de cobro.
$("traer").addEventListener("click", () => {
  const dia = form.fecha.value;
  if (!esFechaISO(dia)) return msg("Elige primero la fecha del turno.", true);
  const carreras = leerCarreras().filter((c) => c.fecha === dia);
  const repost = leerRegistros().filter((r) => r.fecha === dia);
  const otros = leerOtros().filter((g) => g.fecha === dia);
  const km = redondear(kmGpsDelDia(dia));
  if (!carreras.length && !repost.length && !otros.length && !(km > 0)) return msg("No hay nada apuntado ese día en Facturación, Gastos ni Trayecto.", true);
  const T = totalesCarreras(carreras);
  const comb = redondear(repost.reduce((s, r) => s + r.importe, 0));
  const otr = redondear(otros.reduce((s, g) => s + g.importe, 0));
  const gastos = redondear(comb + otr);
  if (T.total > 0) form.recaudacion.value = String(T.total).replace(".", ",");
  if (gastos > 0) form.gastos.value = String(gastos).replace(".", ",");
  if (km > 0 && form.km.value.trim() === "") form.km.value = String(km).replace(".", ",");
  const filas = [];
  if (T.total > 0) filas.push(["Efectivo en mano (calle + app)", e(T.efectivo_en_mano)], ["Datáfono, banco o app", e(T.cobrado_banco_app)], ["Total facturado", e(T.total), true]);
  if (comb > 0) filas.push(["Combustible", e(comb)]);
  if (otr > 0) filas.push(["Otros gastos", e(otr)]);
  if (km > 0) filas.push(["Km con GPS (estimación)", `${euros(km)} km`]);
  $("desglose").replaceChildren(...(filas.length ? [el("h3", { text: `Lo apuntado el ${fechaCorta(dia)}` }), cifras(filas)] : []));
  msg("Traído. Revisa las cifras, pon el porcentaje si hay asalariado y guarda el turno.");
});

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  form.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
  const fallo = (t, campo) => { msg(t, true); form[campo].setAttribute("aria-invalid", "true"); form[campo].focus(); };
  if (!esFechaISO(form.fecha.value) || form.fecha.value < "2000-01-01") return fallo("Indica una fecha válida.", "fecha");
  const rec = leerNumero(form.recaudacion.value);
  if (!(rec > 0 && rec <= 100000)) return fallo("Escribe la recaudación (mayor que 0).", "recaudacion");
  for (const [campo, nombre] of [["gastos", "los gastos"], ["km", "los km"], ["horas", "las horas"]]) {
    const b = form[campo].value.trim();
    if (b !== "" && !(leerNumero(b) >= 0)) return fallo(`Revisa ${nombre}: un número de 0 en adelante, o déjalo vacío.`, campo);
  }
  const pct = leerNumero(form.pct.value);
  if (form.pct.value.trim() !== "" && !(pct >= 0 && pct <= 100)) return fallo("El porcentaje va de 0 a 100, o déjalo vacío si no hay asalariado.", "pct");
  if (lista.length >= MAX) return msg("Has llegado al máximo de turnos guardados. Exporta y borra los antiguos.", true);
  const r = C.reparto({ recaudacion: rec, gastos: num(form.gastos.value), porcentaje: Number.isFinite(pct) ? pct : 0, base: form.base.value });
  lista.push({
    id: nuevoId(), fecha: form.fecha.value, conductor: form.conductor.value.trim().slice(0, 40),
    recaudacion: redondear(rec), gastos: redondear(num(form.gastos.value)),
    km: form.km.value.trim() === "" ? null : redondear(num(form.km.value)), horas: form.horas.value.trim() === "" ? null : redondear(num(form.horas.value)),
    pct: Number.isFinite(pct) ? pct : 0, base: form.base.value, asalariado: r.asalariado, titular: r.titular,
  });
  guardarJson(CLAVE_PREF, { pct: form.pct.value.trim(), base: form.base.value });
  if (!guardar()) { lista.pop(); return msg("No se pudo guardar en este navegador.", true); }
  for (const c of ["recaudacion", "gastos", "km", "horas"]) form[c].value = "";
  msg("Turno guardado.");
  pintar();
});

function pintar() {
  const hoy = hoyMadrid();
  const mes = lista.filter((t) => t.fecha >= C.inicioMes(hoy) && t.fecha <= hoy);
  const rec = mes.reduce((s, t) => s + t.recaudacion, 0);
  const asal = mes.reduce((s, t) => s + t.asalariado, 0);
  const gas = mes.reduce((s, t) => s + t.gastos, 0);
  $("resumen").replaceChildren(cifras([
    ["Turnos este mes", String(mes.length)], ["Recaudación", e(redondear(rec))], ["Gastos anotados", e(redondear(gas))],
    ["Para asalariados", e(redondear(asal))], ["Para el titular, tras gastos", e(redondear(rec - gas - asal)), true],
  ]));
  $("vacio").hidden = lista.length > 0;
  $("lista").replaceChildren(...lista.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 100).map((t) => {
    const b = el("button", { type: "button", class: "boton-peligro", text: "Borrar", "aria-label": `Borrar el turno del ${fechaCorta(t.fecha)}` });
    b.addEventListener("click", () => {
      lista = lista.filter((q) => q.id !== t.id);
      ultimoBorrado = t;
      guardar();
      pintar();
      const des = el("button", { type: "button", class: "boton-sec", text: "Deshacer" });
      des.addEventListener("click", () => { if (ultimoBorrado) { lista.push(ultimoBorrado); ultimoBorrado = null; guardar(); $("estado-lista").textContent = "Turno recuperado."; pintar(); } });
      $("estado-lista").replaceChildren(document.createTextNode(`Borrado el turno del ${fechaCorta(t.fecha)}. `), des);
    });
    return el("li", { class: "ruta-guardada" },
      el("strong", { text: `${fechaCorta(t.fecha)} · ${e(t.recaudacion)}${t.conductor ? ` · ${t.conductor}` : ""}` }),
      el("span", { class: "detalle", text: `Gastos ${e(t.gastos)}${t.pct ? ` · asalariado ${e(t.asalariado)}` : ""} · titular ${e(t.titular)}${t.km ? ` · ${t.km} km` : ""}${t.horas ? ` · ${t.horas} h` : ""}` }),
      el("div", { class: "botones" }, b));
  }));
}

$("exportar").addEventListener("click", () => {
  if (!lista.length) { $("estado-datos").textContent = "No hay turnos que exportar."; return; }
  const cab = ["fecha", "conductor", "recaudacion_eur", "gastos_eur", "km", "horas", "porcentaje", "asalariado_eur", "titular_eur"];
  const coma = (n) => (n == null ? "" : String(n).replace(".", ","));
  const filas = lista.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map((t) =>
    [t.fecha, t.conductor, coma(t.recaudacion), coma(t.gastos), coma(t.km), coma(t.horas), coma(t.pct), coma(t.asalariado), coma(t.titular)].map(celdaCSV).join(";"));
  descargarCSV(`taxi-turnos-${hoyMadrid()}.csv`, [cab.join(";"), ...filas].join("\n"));
  $("estado-datos").textContent = "CSV descargado.";
});

const [si, no, borrar] = [$("borrar-si"), $("borrar-no"), $("borrar")];
const confirmar = (on) => { si.hidden = no.hidden = !on; borrar.hidden = on; };
borrar.addEventListener("click", () => { if (!lista.length) { $("estado-datos").textContent = "No hay turnos guardados."; return; } confirmar(true); $("estado-datos").textContent = "Se borrarán todos los turnos de este navegador. No se puede deshacer."; });
no.addEventListener("click", () => { confirmar(false); $("estado-datos").textContent = ""; });
si.addEventListener("click", () => { lista = []; guardar(); confirmar(false); $("estado-datos").textContent = "Turnos borrados."; pintar(); });

pintar();
