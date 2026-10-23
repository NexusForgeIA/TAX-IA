// Solicitud «Me interesa» de la pantalla Ayudas: validación y texto del aviso. Sin DOM ni red; lo prueba
// solicitud.test.ts. Los límites son los mismos que los CHECK de la migración 20261023140000_taxi_ayuda_solicitudes.sql.

export const MAX_BYTES = 4_096;
export const LIM = { nombre: 80, mensaje: 500 };
/** Solicitudes por hora entre todos: frena el abuso del formulario público. */
export const LIMITE_SOLICITUDES_HORA = 30;
/** Versión del texto de consentimiento que acepta el formulario (ayudas-solicitud.html). */
export const VERSIONES = ["ayuda-v1-2026-10-23"] as const;

export type Solicitud = { nombre: string; telefono: string; mensaje: string; version: string };

const limpio = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");

/** Teléfono sin espacios, puntos, guiones ni paréntesis. Admite un «+» delante. */
export const normalizarTelefono = (t: string) => t.replace(/[\s.\-()]/g, "");

/** Lee el cuerpo JSON. Devuelve la solicitud limpia o {error} con un texto para el usuario. */
export function leerSolicitud(texto: string): Solicitud | { error: string } {
  if (new TextEncoder().encode(texto).length > MAX_BYTES) return { error: "La solicitud es demasiado larga." };
  let d: unknown;
  try { d = JSON.parse(texto); } catch { return { error: "Solicitud no válida." }; }
  if (!d || typeof d !== "object" || Array.isArray(d)) return { error: "Solicitud no válida." };
  const o = d as Record<string, unknown>;
  if (o.consentimiento !== true) return { error: "Falta tu autorización para enviar los datos." };
  if (!VERSIONES.includes(o.version as typeof VERSIONES[number])) return { error: "Solicitud no válida." };
  const nombre = limpio(o.nombre);
  if (nombre.length < 2 || nombre.length > LIM.nombre) return { error: "Escribe tu nombre." };
  const telefono = normalizarTelefono(limpio(o.telefono));
  if (!/^\+?[0-9]{9,15}$/.test(telefono)) return { error: "Escribe un teléfono válido." };
  const mensaje = typeof o.mensaje === "string" ? o.mensaje.trim() : "";
  if (mensaje.length > LIM.mensaje) return { error: "El mensaje es demasiado largo." };
  return { nombre, telefono, mensaje, version: o.version as string };
}

/** Texto plano del aviso a Telegram (sin parse_mode: nada de lo que escribe el usuario se interpreta). */
export function textoAviso(s: Solicitud) {
  return ["Taxi-IA · Ayuda Auto+: nueva solicitud", `Nombre: ${s.nombre}`, `Teléfono: ${s.telefono}`, `Mensaje: ${s.mensaje || "—"}`].join("\n");
}
