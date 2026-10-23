// Tema Día / Noche: guardar la elección («taxi.tema», solo en este navegador) y pedir a arranque.js que lo aplique.
// Lo usan Mi perfil (selector de tres opciones) e Inicio (botón rápido sol/luna).
import { almacen } from "./datos.js";

export const CLAVE_TEMA = "taxi.tema";
export const TEMAS = ["auto", "dia", "noche"];

/** "auto", "dia" o "noche". Lo que no se reconoce cuenta como "auto". */
export function leerTema(store = almacen) {
  try { const t = JSON.parse(store.get(CLAVE_TEMA)); return TEMAS.includes(t) ? t : "auto"; } catch { return "auto"; }
}

/** Tema que se ve ahora ("dia" o "noche"), lo ponga el usuario o el sistema. */
export const temaVisible = () => (document.documentElement.dataset.tema === "dia" ? "dia" : "noche");

/** Guarda y aplica. Devuelve false si el navegador no deja guardar (el tema no cambia). */
export function cambiarTema(t, store = almacen) {
  if (!TEMAS.includes(t) || !store.set(CLAVE_TEMA, JSON.stringify(t))) return false;
  document.dispatchEvent(new Event("taxi:tema"));
  return true;
}
