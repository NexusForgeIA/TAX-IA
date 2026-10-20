// Datos del usuario: todo vive en este navegador (localStorage), con prefijo «taxi.».
export const PREFIJO = "taxi.";
export const almacen = {
  get(k) { try { return globalThis.localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { globalThis.localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { globalThis.localStorage.removeItem(k); return true; } catch { return false; } },
  claves() { try { return Object.keys(globalThis.localStorage).filter((k) => k.startsWith(PREFIJO)); } catch { return []; } },
};

/** Lee un JSON guardado; si no existe o está corrupto devuelve `defecto`. */
export function leerJson(clave, defecto, store = almacen) {
  try { const v = JSON.parse(store.get(clave)); return v ?? defecto; } catch { return defecto; }
}
export const guardarJson = (clave, valor, store = almacen) => store.set(clave, JSON.stringify(valor));

export const nuevoId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

/** «Borrar mis datos»: todo lo que Taxi-IA guarda en este navegador. */
export function borrarMisDatos(store = almacen) {
  const claves = store.claves ? store.claves() : [];
  return claves.map((k) => store.del(k)).every(Boolean);
}
