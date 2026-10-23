// Perfil del taxista: nombre, licencia y matrícula para el justificante y el PDF de facturación. Sin cuenta:
// se guarda solo en este navegador («taxi.perfil») y va en la copia de seguridad. Módulo sin DOM; lo prueba
// perfil.test.js.
import { almacen } from "./datos.js";

export const CLAVE_PERFIL = "taxi.perfil";
export const VERSION_PERFIL = 1;
/** Clave antigua del justificante ({conductor, vehiculo}): se migra una sola vez y se borra. */
export const CLAVE_PREF_ANTIGUA = "taxi.justificante.pref";
export const LIM = { nombre: 60, licencia: 30, matricula: 15 };
const CAMPOS = Object.keys(LIM);

const limpio = (v, max) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const vacio = () => ({ nombre: "", licencia: "", matricula: "" });

/** Forma válida de lo guardado: {v: 1} y, si están, textos dentro del límite. La usa también copia.js. */
export function perfilValido(p) {
  if (!p || typeof p !== "object" || Array.isArray(p) || p.v !== VERSION_PERFIL) return false;
  return CAMPOS.every((k) => p[k] === undefined || (typeof p[k] === "string" && p[k].length <= LIM[k]));
}

/** Guarda el perfil ya recortado. Devuelve false si el navegador no deja guardar. */
export function guardarPerfil(datos, store = almacen) {
  const p = { v: VERSION_PERFIL };
  for (const k of CAMPOS) p[k] = limpio(datos?.[k], LIM[k]);
  return store.set(CLAVE_PERFIL, JSON.stringify(p));
}

/**
 * Perfil {nombre, licencia, matricula} (textos, vacíos si no hay). La primera vez trae lo que el justificante
 * recordaba: conductor → nombre y «licencia o matrícula» → licencia (era un solo campo y no se puede separar).
 */
export function leerPerfil(store = almacen) {
  let p = null;
  try { p = JSON.parse(store.get(CLAVE_PERFIL)); } catch { /* corrupto: como si no hubiera */ }
  if (perfilValido(p)) { const r = vacio(); for (const k of CAMPOS) r[k] = p[k] ?? ""; return r; }
  if (store.get(CLAVE_PERFIL) == null) {
    let viejo = null;
    try { viejo = JSON.parse(store.get(CLAVE_PREF_ANTIGUA)); } catch { /* sin preferencias antiguas */ }
    if (viejo && typeof viejo === "object") {
      const r = { nombre: limpio(viejo.conductor, LIM.nombre), licencia: limpio(viejo.vehiculo, LIM.licencia), matricula: "" };
      if (guardarPerfil(r, store)) store.del(CLAVE_PREF_ANTIGUA);
      return r;
    }
  }
  return vacio();
}
