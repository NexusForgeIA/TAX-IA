// Objetivo diario de facturación: lo escribe el usuario (no hay ninguna cifra por defecto) y se guarda solo en este navegador.
import { $ } from "./util.js";
import { euros, leerNumero, redondear } from "./numeros.js";
import { guardarJson, leerJson } from "./datos.js";
import { hoyMadrid } from "./fechas.js";
import { leerCarreras, totalesCarreras } from "./ingresos.js";

const CLAVE = "taxi.objetivo";
const e = (n) => `${euros(n)} €`;

/** Objetivo guardado (número > 0) o null. */
export function leerObjetivo() {
  const v = leerJson(CLAVE, null);
  return typeof v === "number" && v > 0 && v <= 100000 ? v : null;
}

export function pintarObjetivo() {
  const obj = leerObjetivo();
  const hoy = totalesCarreras(leerCarreras().filter((c) => c.fecha === hoyMadrid())).total;
  const barra = $("objetivo-barra");
  $("objetivo-barra-wrap").hidden = obj == null;
  if (obj == null) { $("objetivo-texto").textContent = "Escribe cuánto quieres facturar hoy y verás cuánto llevas."; return; }
  barra.max = obj;
  barra.value = Math.min(hoy, obj);
  barra.setAttribute("aria-label", "Facturado hoy sobre tu objetivo");
  const falta = redondear(obj - hoy);
  $("objetivo-texto").textContent = falta > 0 ? `Llevas ${e(hoy)} de ${e(obj)}. Te faltan ${e(falta)}.` : `Objetivo cumplido: ${e(hoy)} de ${e(obj)}${hoy > obj ? ` (${e(redondear(hoy - obj))} por encima)` : ""}.`;
}

export function iniciarObjetivo() {
  const form = $("f-objetivo");
  const obj = leerObjetivo();
  if (obj != null) form.objetivo.value = String(obj).replace(".", ",");
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const txt = form.objetivo.value.trim();
    const est = $("estado-objetivo");
    if (txt === "") { guardarJson(CLAVE, null); est.textContent = "Objetivo quitado."; est.classList.remove("error"); return pintarObjetivo(); }
    const n = leerNumero(txt);
    if (!(n > 0 && n <= 100000)) { est.textContent = "Escribe un importe mayor que 0 y hasta 100.000 €, o déjalo vacío para quitarlo."; est.classList.add("error"); return form.objetivo.focus(); }
    guardarJson(CLAVE, redondear(n));
    est.textContent = "Objetivo guardado."; est.classList.remove("error");
    pintarObjetivo();
  });
  pintarObjetivo();
}
