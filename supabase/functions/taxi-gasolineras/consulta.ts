// Validación de la consulta de taxi-gasolineras (sin red ni base de datos: se prueba con Deno).

/** Ciudad -> provincia del Ministerio y municipio de la capital (municipio por defecto). */
export const CIUDADES: Record<string, { provincia: string; municipio: string }> = {
  Madrid: { provincia: "28", municipio: "4354" },
  Barcelona: { provincia: "08", municipio: "881" },
  Sevilla: { provincia: "41", municipio: "6148" },
  Valencia: { provincia: "46", municipio: "7214" },
};

/** Los combustibles que ofrece la pantalla Gasolineras. */
export const COMBUSTIBLES = new Set([
  "gasoleo_a", "gasoleo_premium", "diesel_renovable", "gasolina_95_e5", "gasolina_98_e5",
  "glp", "gnc", "gnl", "biogas_comprimido", "biogas_licuado", "adblue",
]);

export const LIMITE = 30;

export type Consulta = { provincia: string; municipio: string; combustible: string; solo24: boolean };

/** Lee y valida los parámetros. Devuelve la consulta o un mensaje de error (400). */
export function leerConsulta(q: URLSearchParams): Consulta | { error: string } {
  const c = CIUDADES[q.get("ciudad") ?? ""];
  if (!c) return { error: "Ciudad no válida." };
  const municipio = q.get("municipio") || c.municipio;
  if (!/^\d{1,6}$/.test(municipio)) return { error: "Municipio no válido." };
  const combustible = q.get("combustible") ?? "gasoleo_a";
  if (!COMBUSTIBLES.has(combustible)) return { error: "Combustible no válido." };
  const s = q.get("solo24h");
  if (s !== null && s !== "1" && s !== "0") return { error: "solo24h no válido." };
  return { provincia: c.provincia, municipio, combustible, solo24: s === "1" };
}
