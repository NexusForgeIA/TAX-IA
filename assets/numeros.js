// Utilidades numéricas comunes. Sin DOM.
export const euros = (n, dec = 2) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);

/** Lee un número escrito por el usuario (admite coma decimal). Vacío → NaN. */
export function leerNumero(v) {
  let s = String(v ?? "").trim().replace(/\s/g, "");
  if (s === "") return NaN;
  // «1.500» es ambiguo (¿mil quinientos o uno con cinco?): no se adivina. «1.500,50» y «1500,5» sí se entienden.
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return NaN;
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) s = s.replace(/\./g, "");
  return Number(s.replace(",", "."));
}

/** Redondeo a `dec` decimales sin el error típico de coma flotante (1,005 → 1,01). */
export function redondear(n, dec = 2) {
  const f = 10 ** dec;
  return Math.round((n + Math.sign(n) * Number.EPSILON) * f) / f;
}
