// Copia de seguridad y restaurar, sin cuentas ni servidor: un archivo .json con todo lo que Taxi-IA guarda en este
// navegador (claves «taxi.*»). Módulo sin DOM; lo usa inicio.js y lo prueba copia.test.js.
import { almacen } from "./datos.js";

export const FORMATO = "taxi-ia-copia";
export const VERSION_COPIA = 1;
export const MAX_BYTES = 8_000_000;
/** Marcas que no son datos del usuario: no se copian ni se restauran. */
const EXCLUIDAS = new Set(["taxi.instalada-contada", "taxi.trayecto.activo"]);
const CLAVE_VALIDA = /^taxi\.[A-Za-z0-9._-]{1,60}$/;

/** Claves cuyo contenido es una lista: si la copia trae otra cosa, esa clave se descarta (una copia corrupta no rompe las pantallas). */
const LISTAS = new Set(["taxi.gastos", "taxi.otros-gastos", "taxi.turnos", "taxi.trayectos"]);
const contenidoValido = (k, v) => {
  try { const j = JSON.parse(v); return LISTAS.has(k) ? Array.isArray(j) : true; } catch { return false; }
};

export const claveCopiable = (k) => typeof k === "string" && CLAVE_VALIDA.test(k) && !EXCLUIDAS.has(k);

/** Copia con todos los datos guardados. `ahora` solo para las pruebas. */
export function crearCopia(store = almacen, ahora = new Date()) {
  const datos = {};
  for (const k of store.claves().filter(claveCopiable).sort()) {
    const v = store.get(k);
    if (typeof v === "string") datos[k] = v;
  }
  return { formato: FORMATO, v: VERSION_COPIA, fecha: ahora.toISOString(), datos };
}

/** Texto del archivo y su nombre. */
export const archivoCopia = (copia) => ({ nombre: `taxi-ia-copia-${copia.fecha.slice(0, 10)}.json`, texto: JSON.stringify(copia) });

/** Valida el texto de un archivo. Devuelve {copia, n} o {error}. No toca nada. */
export function leerCopia(texto) {
  if (typeof texto !== "string" || texto.length > MAX_BYTES) return { error: "El archivo es demasiado grande o no es una copia de Taxi-IA." };
  let c;
  try { c = JSON.parse(texto); } catch { return { error: "El archivo no es una copia válida de Taxi-IA." }; }
  if (!c || c.formato !== FORMATO || typeof c.datos !== "object" || c.datos === null || Array.isArray(c.datos)) return { error: "El archivo no es una copia de Taxi-IA." };
  if (c.v !== VERSION_COPIA) return { error: "La copia es de una versión que esta app no entiende." };
  const datos = {};
  for (const [k, v] of Object.entries(c.datos)) {
    if (!claveCopiable(k) || typeof v !== "string" || !contenidoValido(k, v)) continue; // se ignora lo ajeno, nunca se escribe fuera de «taxi.»
    datos[k] = v;
  }
  const n = Object.keys(datos).length;
  if (!n) return { error: "La copia no contiene datos que restaurar." };
  const fecha = typeof c.fecha === "string" && /^\d{4}-\d{2}-\d{2}/.test(c.fecha) ? c.fecha : null; // sin fecha válida no se inventa una
  return { copia: { ...c, fecha, datos }, n };
}

/**
 * Restaura una copia ya validada: sustituye las claves que trae. Lo que el móvil tenga y la copia no, se queda.
 * Si falla una escritura, deshace lo escrito y devuelve {error}.
 */
export function restaurarCopia(copia, store = almacen) {
  const previo = {};
  for (const k of Object.keys(copia.datos)) previo[k] = store.get(k);
  for (const [k, v] of Object.entries(copia.datos)) {
    if (!store.set(k, v)) {
      for (const [q, val] of Object.entries(previo)) val == null ? store.del(q) : store.set(q, val);
      return { error: "Este navegador no ha dejado guardar los datos. No se ha cambiado nada." };
    }
  }
  return { n: Object.keys(copia.datos).length };
}
