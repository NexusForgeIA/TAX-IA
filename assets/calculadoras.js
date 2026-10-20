// Taxi-IA · calculadoras. Ninguna cifra viene de fábrica: tarifa, porcentajes, gastos y objetivos
// los escribe el usuario. Todo se calcula en este navegador y no se envía nada.
import "./nav.js";
import { $, cifras, error } from "./util.js";
import { euros, leerNumero } from "./numeros.js";
import { guardarJson, leerJson } from "./datos.js";
import C from "./herramientas.js";

const CLAVE_TARIFA = "taxi.tarifa";
const CLAVE_REPARTO = "taxi.reparto";
const e = (n) => `${euros(n)} €`;

/** Lee los campos pedidos de un formulario; devuelve {v} o {error}. opcionales: pueden ir vacíos (→ 0). */
function leer(form, requeridos, opcionales = []) {
  const v = {};
  for (const [nombre, texto] of requeridos) {
    const n = leerNumero(form[nombre].value);
    if (!(Number.isFinite(n) && n > 0)) return { error: `Escribe ${texto} (un número mayor que 0).`, campo: nombre };
    v[nombre] = n;
  }
  for (const nombre of opcionales) {
    const bruto = form[nombre].value.trim();
    const n = bruto === "" ? 0 : leerNumero(bruto);
    if (!(Number.isFinite(n) && n >= 0)) return { error: "Los campos opcionales deben ser números de 0 en adelante.", campo: nombre };
    v[nombre] = n;
  }
  return { v };
}

function mostrar(form, nodo) {
  form.parentElement.querySelector(".resultado-calc").replaceChildren(nodo);
}

function conectar(id, fn) {
  const form = $(id);
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    form.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
    const r = fn(form);
    if (r?.error) {
      mostrar(form, error(r.error));
      if (r.campo && form[r.campo]) { form[r.campo].setAttribute("aria-invalid", "true"); form[r.campo].focus(); }
    } else if (r?.nodo) mostrar(form, r.nodo);
  });
}

// ---- Tu tarifa (se recuerda en este navegador) ---------------------------------------------
const TARIFA = ["bajada", "porKm", "porMinuto", "suplemento", "minimo"];
const tarifa = leerJson(CLAVE_TARIFA, {});
const f1 = $("f-importe");
for (const k of TARIFA) if (typeof tarifa[k] === "string") f1[k].value = tarifa[k];

conectar("f-importe", (f) => {
  const dist = leer(f, [], ["km", "min"]);
  if (dist.error) return dist;
  const t = {};
  for (const k of TARIFA) {
    const bruto = f[k].value.trim();
    const n = bruto === "" ? 0 : leerNumero(bruto);
    if (!(Number.isFinite(n) && n >= 0)) return { error: "Revisa tu tarifa: solo números de 0 en adelante.", campo: k };
    t[k] = bruto;
  }
  if (!(dist.v.km > 0 || dist.v.min > 0)) return { error: "Indica los km o los minutos de la carrera.", campo: "km" };
  guardarJson(CLAVE_TARIFA, t);
  const importe = C.importeCarrera({ bajada: t.bajada, porKm: t.porKm, porMinuto: t.porMinuto, suplemento: t.suplemento, minimo: t.minimo }, dist.v.km, dist.v.min);
  return { nodo: cifras([["Importe de la carrera con tu tarifa", e(importe), true]]) };
});

// ---- Beneficio de un turno -----------------------------------------------------------------
conectar("f-turno", (f) => {
  const r = leer(f, [["recaudacion", "la recaudación"]], ["combustible", "peajes", "alquiler", "otros", "km", "horas"]);
  if (r.error) return r;
  const b = C.beneficioTurno(r.v);
  const filas = [["Gastos del turno", e(b.gastos)], ["Beneficio del turno", e(b.neto), true]];
  if (b.porHora != null) filas.push(["Por hora", e(b.porHora)]);
  if (b.porKm != null) filas.push(["Beneficio por km", e(b.porKm)], ["Ingreso por km", e(b.ingresoPorKm)]);
  return { nodo: cifras(filas) };
});

// ---- Reparto titular / asalariado (el % lo pacta el usuario) -------------------------------
const rep = leerJson(CLAVE_REPARTO, {});
const f3 = $("f-reparto");
if (typeof rep.porcentaje === "string") f3.porcentaje.value = rep.porcentaje;
if (rep.base === "recaudacion" || rep.base === "neto") f3.base.value = rep.base;

conectar("f-reparto", (f) => {
  const r = leer(f, [["recaudacion", "la recaudación"], ["porcentaje", "el porcentaje pactado"]], ["gastos"]);
  if (r.error) return r;
  if (r.v.porcentaje > 100) return { error: "El porcentaje no puede pasar de 100.", campo: "porcentaje" };
  guardarJson(CLAVE_REPARTO, { porcentaje: f.porcentaje.value.trim(), base: f.base.value });
  const x = C.reparto({ recaudacion: r.v.recaudacion, gastos: r.v.gastos, porcentaje: r.v.porcentaje, base: f.base.value });
  return { nodo: cifras([["Base del reparto", e(x.base)], ["Para el asalariado", e(x.asalariado), true], ["Para el titular, tras gastos", e(x.titular), true]]) };
});

// ---- Objetivo de ingresos ------------------------------------------------------------------
conectar("f-objetivo", (f) => {
  const r = leer(f, [["objetivoMes", "tu objetivo del mes"], ["dias", "los días que vas a trabajar"]], ["importeMedio"]);
  if (r.error) return r;
  if (r.v.dias > 31) return { error: "Los días de trabajo no pueden pasar de 31.", campo: "dias" };
  const x = C.objetivo({ objetivoMes: r.v.objetivoMes, dias: r.v.dias, importeMedio: r.v.importeMedio });
  const filas = [["Por día de trabajo", e(x.porDia), true]];
  if (x.carrerasDia != null) filas.push(["Carreras al día con ese importe medio", String(x.carrerasDia)]);
  return { nodo: cifras(filas) };
});

// ---- Coste por km --------------------------------------------------------------------------
conectar("f-coste", (f) => {
  const r = leer(f, [["gastos", "los gastos del periodo"], ["km", "los km del periodo"]]);
  if (r.error) return r;
  return { nodo: cifras([["Tu coste por km", e(C.costeKm(r.v)), true]]) };
});

if (location.hash && $(location.hash.slice(1))) $(location.hash.slice(1)).scrollIntoView();
