// Utilidades numéricas comunes. Sin DOM.
export const euros = (n, dec = 2) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);

/** Lee un número escrito por el usuario (admite coma decimal). Vacío → NaN. */
export function leerNumero(v) {
  const s = String(v ?? "").trim().replace(/\s/g, "").replace(",", ".");
  return s === "" ? NaN : Number(s);
}

/** Redondeo a `dec` decimales sin el error típico de coma flotante (1,005 → 1,01). */
export function redondear(n, dec = 2) {
  const f = 10 ** dec;
  return Math.round((n + Math.sign(n) * Number.EPSILON) * f) / f;
}
