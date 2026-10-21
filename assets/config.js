// Configuración del cliente. No contiene claves: tus datos de taxista se guardan solo en el
// navegador del usuario.

// Servidor de Taxi-IA (Edge Functions taxi-*). Hoy solo cuenta aperturas (assets/visita.js); tus datos no se envían.
export const API = "https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1";

// Cuentas y copia en la nube: desactivado. Se activará con tablas taxi_* propias en Supabase.
export const CUENTAS = false;

/** Enseña los enlaces y bloques marcados con data-cuentas si la bandera está activa. */
export function mostrarCuentas() {
  if (CUENTAS) document.querySelectorAll("[data-cuentas]").forEach((n) => { n.hidden = false; });
}

// Contacto para opiniones de la beta: solo correo (sin WhatsApp). Mismo titular que whitemoon.es.
export const CORREO_CONTACTO = "comercial@whitemoon.es";
export const ASUNTO_OPINION = "Opinión Taxi-IA beta";
// Nota de beta: la portada la lleva escrita en el HTML (sin JS).
export const AVISO_BETA = "Versión beta gratuita en pruebas. Puede haber errores. Todas las cifras salen de lo que tú apuntas y se guardan solo en este navegador.";
export const enlaceOpinion = () => `mailto:${CORREO_CONTACTO}?subject=${encodeURIComponent(ASUNTO_OPINION)}`;

// Los enlaces «Enviar opinión» del HTML se rehacen desde la constante: una sola fuente.
if (typeof document !== "undefined") {
  document.querySelectorAll("a[data-opinion]").forEach((a) => { a.href = enlaceOpinion(); });
}
