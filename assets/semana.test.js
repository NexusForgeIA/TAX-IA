// node assets/semana.test.js
import assert from "node:assert/strict";
import { comparar, fechasSemana, lunesDe, resumenSemana } from "./semana.js";

const c = (fecha, hora, importe) => ({ fecha, hora, importe, canal: "calle", metodo: "efectivo" });

// Lunes de la semana, también con cambio de mes y en el cambio de hora (domingo 25/10/2026)
assert.equal(lunesDe("2026-10-22"), "2026-10-19");
assert.equal(lunesDe("2026-10-19"), "2026-10-19");
assert.equal(lunesDe("2026-10-25"), "2026-10-19");
assert.equal(lunesDe("2026-10-26"), "2026-10-26");
assert.equal(lunesDe("2026-10-01"), "2026-09-28");
assert.deepEqual(fechasSemana("2026-09-28"), ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
assert.deepEqual(fechasSemana("2026-10-19").slice(-1), ["2026-10-25"]);

// Semana sin datos
const v = resumenSemana([], [], "2026-10-19");
assert.equal(v.total, 0); assert.equal(v.carreras, 0); assert.equal(v.lineas, 0); assert.equal(v.media, null);
assert.equal(v.horas, null); assert.equal(v.eurosHora, null); assert.equal(v.mejorDia, null); assert.equal(v.dias.length, 7);
assert.equal(resumenSemana(null, "x", "2026-10-19").total, 0); // datos corruptos no rompen

// Totales sin detallar: cuentan en euros, no como carrera ni en la media
const lista = [c("2026-10-19", "08:10", 12.5), c("2026-10-19", "09:00", 7.5), c("2026-10-21", null, 80), c("2026-10-18", "10:00", 99), c("2026-10-26", "10:00", 99)];
const s = resumenSemana(lista, [], "2026-10-19");
assert.equal(s.total, 100); assert.equal(s.lineas, 3); assert.equal(s.carreras, 2); assert.equal(s.media, 10);
assert.equal(s.dias[0].total, 20); assert.equal(s.dias[2].total, 80); assert.equal(s.dias[2].carreras, 0);
assert.equal(s.mejorDia.fecha, "2026-10-21");
assert.equal(s.domingo, "2026-10-25");

// Cambio de hora: la carrera de las 02:30 del domingo 25 es de esa semana; la del lunes 26, de la siguiente
const dst = [c("2026-10-25", "02:30", 15), c("2026-10-25", "02:45", 10), c("2026-10-26", "00:05", 9)];
assert.equal(resumenSemana(dst, [], "2026-10-19").total, 25);
assert.equal(resumenSemana(dst, [], "2026-10-19").dias[6].carreras, 2);
assert.equal(resumenSemana(dst, [], "2026-10-26").total, 9);

// Cambio de mes: la semana del 28/09 al 04/10 junta los dos meses
const mes = [c("2026-09-30", "10:00", 20), c("2026-10-02", "11:00", 30), c("2026-10-05", "11:00", 50)];
assert.equal(resumenSemana(mes, [], "2026-09-28").total, 50);

// Sin horas en los turnos: no hay horas ni €/hora
const sinH = resumenSemana(lista, [{ fecha: "2026-10-19", horas: null }, { fecha: "2026-10-21" }], "2026-10-19");
assert.equal(sinH.horas, null); assert.equal(sinH.eurosHora, null); assert.equal(sinH.turnos, 2); assert.equal(sinH.turnosConHoras, 0);

// Con horas en todos los turnos: €/hora completo
const conH = resumenSemana(lista, [{ fecha: "2026-10-19", horas: 4 }, { fecha: "2026-10-21", horas: 6 }], "2026-10-19");
assert.equal(conH.horas, 10); assert.deepEqual(conH.eurosHora, { valor: 10, parcial: false }); assert.equal(conH.turnosConHoras, 2);

// Horas en parte de los turnos: horas de N turnos y €/hora solo de los días con horas (parcial)
const parte = resumenSemana(lista, [{ fecha: "2026-10-19", horas: 4 }, { fecha: "2026-10-21", horas: null }, { fecha: "2026-10-12", horas: 9 }], "2026-10-19");
assert.equal(parte.horas, 4); assert.equal(parte.turnos, 2); assert.equal(parte.turnosConHoras, 1);
assert.deepEqual(parte.eurosHora, { valor: 5, parcial: true });

// Dos turnos el mismo día y uno sin horas: ese día no entra en el €/hora
const mixto = resumenSemana(lista, [{ fecha: "2026-10-19", horas: 4 }, { fecha: "2026-10-19", horas: null }], "2026-10-19");
assert.equal(mixto.horas, 4); assert.equal(mixto.eurosHora, null);

// Comparación con la semana anterior
const ant = resumenSemana([c("2026-10-13", "10:00", 80)], [], "2026-10-12");
assert.deepEqual(comparar(s, ant), { anterior: 80, diferencia: 20, pct: 25 });
assert.deepEqual(comparar(ant, s), { anterior: 100, diferencia: -20, pct: -20 });
assert.equal(comparar(s, resumenSemana([], [], "2026-10-12")), null); // sin datos la semana anterior: no se compara
assert.equal(comparar(s, null), null);

console.log("semana: ok");
