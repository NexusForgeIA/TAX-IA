// Otros gastos del coche (peajes, parking, lavado, multas, seguro…), solo con lo que apunta el usuario.
// Se guardan en este navegador (localStorage). Módulo sin DOM: lo usan otros-gastos-vista.js, informe.js y turnos.js.
import { esFechaISO, hoyMadrid, sumarDias } from "./fechas.js";
import { leerNumero, redondear } from "./numeros.js";
import { almacen } from "./datos.js";

export const CLAVE_OTROS = "taxi.otros-gastos";
export const MAX_OTROS = 5000;
export const TIPOS = { peaje: "Peaje", parking: "Parking", lavado: "Lavado", multa: "Multa", seguro: "Seguro", otro: "Otro" };
const nuevoId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

/** Valida lo que escribe el usuario. Devuelve {gasto} o {error, campo}. datos: {fecha, tipo, importe, nota?, etiqueta?} */
export function validarOtro(datos, hoy = hoyMadrid()) {
  const d = datos || {};
  if (!esFechaISO(d.fecha) || d.fecha < "2000-01-01" || d.fecha > sumarDias(hoy, 1)) return { error: "Indica una fecha válida (no futura).", campo: "fecha" };
  if (!Object.hasOwn(TIPOS, d.tipo)) return { error: "Elige el tipo de gasto.", campo: "tipo" };
  const importe = typeof d.importe === "number" ? d.importe : leerNumero(d.importe);
  if (!(Number.isFinite(importe) && importe > 0 && importe <= 100000)) return { error: "Indica el importe (más de 0 y hasta 100.000 €).", campo: "importe" };
  const nota = String(d.nota ?? "").trim().replace(/\s+/g, " ");
  if (nota.length > 80) return { error: "La nota admite hasta 80 caracteres.", campo: "nota" };
  const etiqueta = String(d.etiqueta ?? "").trim().replace(/\s+/g, " ");
  if (etiqueta.length > 40) return { error: "El turno o vehículo admite hasta 40 caracteres.", campo: "etiqueta" };
  return { gasto: { fecha: d.fecha, tipo: d.tipo, importe: redondear(importe, 2), nota, etiqueta } };
}

const ordenar = (l) => l.sort((a, b) => b.fecha.localeCompare(a.fecha));

/** Gastos guardados, el más reciente primero. Descarta lo corrupto sin romper. */
export function leerOtros(store = almacen) {
  let datos;
  try { datos = JSON.parse(store.get(CLAVE_OTROS)); } catch { return []; }
  if (!Array.isArray(datos)) return [];
  const vistos = new Set(), lista = [];
  for (const r of datos) {
    if (!r || typeof r.id !== "string" || vistos.has(r.id)) continue;
    const v = validarOtro(r, "9999-12-30");
    if (v.error) continue;
    vistos.add(r.id);
    lista.push({ id: r.id, ...v.gasto });
    if (lista.length === MAX_OTROS) break;
  }
  return ordenar(lista);
}

const escribir = (store, lista) => store.set(CLAVE_OTROS, JSON.stringify(lista));
const SIN_GUARDAR = { error: "Este navegador no permite guardar datos." };

export function anadirOtro(datos, store = almacen, hoy) {
  const v = validarOtro(datos, hoy);
  if (v.error) return v;
  const lista = leerOtros(store);
  if (lista.length >= MAX_OTROS) return { error: `Puedes guardar hasta ${MAX_OTROS} gastos.` };
  const gasto = { id: nuevoId(), ...v.gasto };
  return escribir(store, ordenar([...lista, gasto])) ? { gasto } : SIN_GUARDAR;
}
export function restaurarOtro(gasto, store = almacen) {
  const lista = leerOtros(store);
  if (lista.some((g) => g.id === gasto.id)) return { gasto };
  return escribir(store, ordenar([...lista, gasto])) ? { gasto } : SIN_GUARDAR;
}
export function borrarOtro(id, store = almacen) {
  return escribir(store, leerOtros(store).filter((g) => g.id !== id));
}
export const borrarOtros = (store = almacen) => store.del(CLAVE_OTROS);

/** Total e importes por tipo de una lista de gastos. */
export function totalOtros(lista) {
  const porTipo = {};
  let total = 0;
  for (const g of lista) { porTipo[g.tipo] = (porTipo[g.tipo] ?? 0) + g.importe; total += g.importe; }
  for (const k of Object.keys(porTipo)) porTipo[k] = redondear(porTipo[k]);
  return { total: redondear(total), porTipo, n: lista.length };
}
