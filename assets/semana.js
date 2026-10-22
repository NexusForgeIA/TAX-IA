// Semana de lunes a domingo con las carreras y los turnos que apunta el usuario. Módulo ES sin DOM:
// lo usan semana-vista.js e inicio.js y lo prueba node (semana.test.js). Solo fechas de calendario.
import { esFechaISO, sumarDias } from "./fechas.js";
import { redondear } from "./numeros.js";

/** Lunes de la semana de una fecha "AAAA-MM-DD". */
export function lunesDe(fecha) {
  const [y, m, d] = fecha.split("-").map(Number);
  return sumarDias(fecha, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7));
}

/** Las 7 fechas de la semana que empieza en `lunes`. */
export const fechasSemana = (lunes) => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

const deLaSemana = (lista, lunes) => { const fin = sumarDias(lunes, 6); return lista.filter((x) => x && esFechaISO(x.fecha) && x.fecha >= lunes && x.fecha <= fin); };
const conHorasValidas = (t) => typeof t.horas === "number" && Number.isFinite(t.horas) && t.horas > 0;

/**
 * KPIs de la semana que empieza en `lunes`.
 * - total: todas las líneas, también los totales sin detallar (hora null), como el resto de la app.
 * - carreras y media: solo las que tienen hora (un total sin detallar no es una carrera).
 * - horas: solo de los turnos que las tienen; `turnos` y `turnosConHoras` dicen cuántos son.
 * - eurosHora: lo facturado en los días cuyos turnos tienen todos horas, entre esas horas;
 *   `parcial` si se ha dejado fuera algún día con facturación. null si no hay horas.
 * - anterior: la semana previa, solo si tiene algo apuntado.
 */
export function resumenSemana(carreras, turnos, lunes) {
  const lineas = deLaSemana(Array.isArray(carreras) ? carreras : [], lunes).filter((c) => Number.isFinite(c.importe));
  const ts = deLaSemana(Array.isArray(turnos) ? turnos : [], lunes);
  const dias = fechasSemana(lunes).map((fecha) => {
    const l = lineas.filter((c) => c.fecha === fecha);
    return { fecha, total: redondear(l.reduce((s, c) => s + c.importe, 0)), carreras: l.filter((c) => c.hora != null).length, lineas: l.length };
  });
  const total = redondear(dias.reduce((s, d) => s + d.total, 0));
  const conHora = lineas.filter((c) => c.hora != null);
  const media = conHora.length ? redondear(conHora.reduce((s, c) => s + c.importe, 0) / conHora.length) : null;

  const tsHoras = ts.filter(conHorasValidas);
  const horas = tsHoras.length ? redondear(tsHoras.reduce((s, t) => s + t.horas, 0)) : null;
  let eurosHora = null;
  if (horas != null) {
    // Un día cuenta si tiene turnos y todos llevan horas: así euros y horas son del mismo tiempo.
    const diasOk = new Set(dias.map((d) => d.fecha).filter((f) => { const del = ts.filter((t) => t.fecha === f); return del.length && del.every(conHorasValidas); }));
    const h = tsHoras.filter((t) => diasOk.has(t.fecha)).reduce((s, t) => s + t.horas, 0);
    const eur = dias.filter((d) => diasOk.has(d.fecha)).reduce((s, d) => s + d.total, 0);
    if (h > 0) eurosHora = { valor: redondear(eur / h), parcial: dias.some((d) => d.total !== 0 && !diasOk.has(d.fecha)) };
  }

  const max = Math.max(0, ...dias.map((d) => d.total));
  const mejorDia = max > 0 ? dias.find((d) => d.total === max) : null;
  return {
    lunes, domingo: sumarDias(lunes, 6), dias, total, lineas: lineas.length, carreras: conHora.length, media,
    horas, turnos: ts.length, turnosConHoras: tsHoras.length, eurosHora, mejorDia,
  };
}

/** Diferencia con la semana anterior, o null si esa semana no tiene nada apuntado. */
export function comparar(actual, anterior) {
  if (!anterior || anterior.lineas === 0) return null;
  const diferencia = redondear(actual.total - anterior.total);
  return { anterior: anterior.total, diferencia, pct: anterior.total > 0 ? redondear((diferencia / anterior.total) * 100, 1) : null };
}
