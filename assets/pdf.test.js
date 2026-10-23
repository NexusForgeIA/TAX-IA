// node assets/pdf.test.js
import assert from "node:assert/strict";
import { anchoTexto, byteWinAnsi, cadenaPdf, nuevoPdf, partir } from "./pdf.js";
import { componerPdf, gastosRango, nombreArchivo, rangoFechas, resumenRango, PIE } from "./informe-pdf.js";

const texto = (bytes) => String.fromCharCode(...bytes);

/** Estructura: cabecera, %%EOF, xref que apunta a cada «n 0 obj», /Count y startxref correctos. */
function validar(bytes) {
  const s = texto(bytes);
  assert.ok(s.startsWith("%PDF-1.4\n")); assert.ok(s.endsWith("%%EOF\n"));
  assert.ok([...bytes].every((b) => b < 128), "todo el archivo es ASCII");
  const sx = Number(s.match(/startxref\n(\d+)\n%%EOF\n$/)[1]);
  assert.equal(s.slice(sx, sx + 4), "xref");
  const [, tam] = s.slice(sx).match(/^xref\n0 (\d+)\n/);
  const filas = s.slice(sx).split("\n").slice(3, 2 + Number(tam));
  filas.forEach((f, i) => { const off = Number(f.slice(0, 10)); assert.equal(s.slice(off, off + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`); });
  for (const m of s.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) assert.equal(s.slice(m.index + m[0].length + Number(m[1]), m.index + m[0].length + Number(m[1]) + 10), "\nendstream");
  return { s, paginas: Number(s.match(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/)[1]) };
}

// WinAnsi: €, ñ, tildes, «», ·; lo que no cabe → «?»
assert.equal(byteWinAnsi("€"), 0x80); assert.equal(byteWinAnsi("ñ"), 0xf1); assert.equal(byteWinAnsi("Ñ"), 0xd1); assert.equal(byteWinAnsi("á"), 0xe1);
assert.equal(byteWinAnsi("😀"), 63);
assert.equal(cadenaPdf("Año (2026) 12,50 € \\ ó"), String.raw`(A\361o \(2026\) 12,50 \200 \\ \363)`);
assert.equal(anchoTexto("Hola", 10), (722 + 556 + 222 + 556) / 100);
assert.equal(anchoTexto("á", 10), anchoTexto("a", 10));
assert.ok(partir("una frase larga que hay que partir en varias líneas", 10, 80).length > 2);
validar(nuevoPdf().texto(50, 800, "Hola").bytes());

// Rangos (calendario de Madrid; el «hoy» lo da el que llama)
assert.deepEqual(rangoFechas("hoy", "2026-10-23"), { desde: "2026-10-23", hasta: "2026-10-23" });
assert.deepEqual(rangoFechas("semana", "2026-10-23"), { desde: "2026-10-19", hasta: "2026-10-25" });
assert.deepEqual(rangoFechas("mes", "2026-02-10"), { desde: "2026-02-01", hasta: "2026-02-28" });
assert.deepEqual(rangoFechas("mes-anterior", "2027-01-05"), { desde: "2026-12-01", hasta: "2026-12-31" });
assert.deepEqual(rangoFechas("personalizado", "2026-10-23", "2026-10-01", "2026-10-15"), { desde: "2026-10-01", hasta: "2026-10-15" });
assert.ok(rangoFechas("personalizado", "2026-10-23", "2026-10-15", "2026-10-01").error);
assert.ok(rangoFechas("personalizado", "2026-10-23", "", "2026-10-01").error);
assert.equal(nombreArchivo("2026-10-01", "2026-10-31"), "taxi-ia-facturacion-2026-10-01_2026-10-31.pdf");

// Resumen: totales = suma de carreras; hora null cuenta en € pero no como carrera
const C = [
  { fecha: "2026-10-01", hora: "08:10", canal: "calle", metodo: "efectivo", app: "", importe: 12.5 },
  { fecha: "2026-10-01", hora: "09:00", canal: "calle", metodo: "tarjeta", app: "", importe: 20.1 },
  { fecha: "2026-10-02", hora: "10:00", canal: "app", metodo: "app", app: "Cabify", importe: 15.25 },
  { fecha: "2026-10-02", hora: null, canal: "calle", metodo: "tarjeta", app: "", importe: 100 },
  { fecha: "2026-10-03", hora: "11:00", canal: "app", metodo: "efectivo", app: "FreeNow", importe: 9.9 },
  { fecha: "2026-11-01", hora: "11:00", canal: "calle", metodo: "efectivo", app: "", importe: 50 },
];
const r = resumenRango(C, "2026-10-01", "2026-10-31");
assert.equal(r.total, 157.75); assert.equal(r.total, Math.round(C.slice(0, 5).reduce((s, c) => s + c.importe, 0) * 100) / 100);
assert.equal(r.carreras, 4); assert.equal(r.sinDetalle, 1);
assert.deepEqual(r.porCanal.map((g) => [g.nombre, g.importe, g.carreras]), [["Calle", 132.6, 2], ["Aplicación", 25.15, 2]]);
assert.deepEqual(r.porMetodo.map((g) => [g.nombre, g.importe, g.carreras]), [["Tarjeta", 120.1, 1], ["Efectivo", 22.4, 2], ["Cobrado por la app", 15.25, 1]]);
assert.deepEqual(r.porApp.map((g) => g.nombre), ["Cabify", "FreeNow"]);
assert.deepEqual(r.dias.map((d) => [d.fecha, d.carreras, d.importe]), [["2026-10-01", 2, 32.6], ["2026-10-02", 1, 115.25], ["2026-10-03", 1, 9.9]]);
for (const g of [r.porCanal, r.porMetodo, r.dias]) assert.equal(Math.round(g.reduce((s, x) => s + x.importe, 0) * 100) / 100, r.total);
assert.equal(resumenRango(C, "2026-12-01", "2026-12-31").lineas, 0);
assert.deepEqual(gastosRango([{ fecha: "2026-10-05", importe: 60 }, { fecha: "2026-09-30", importe: 10 }], [{ fecha: "2026-10-06", importe: 4.5 }], "2026-10-01", "2026-10-31"), { combustible: 60, otros: 4.5, total: 64.5 });

// PDF completo: texto esperado (con acentos, ñ y € en WinAnsi), perfil y gastos opcionales
const generado = "23/10/2026 a las 10:15";
const con = validar(componerPdf({ resumen: r, perfil: { nombre: "José Núñez", licencia: "1234", matricula: "" }, gastos: gastosRango([{ fecha: "2026-10-05", importe: 60 }], [], "2026-10-01", "2026-10-31"), generado }));
for (const t of ["Resumen de facturación", "Del 01/10/2026 al 31/10/2026", "Generado el 23/10/2026 a las 10:15", "Conductor: José Núñez", "Licencia: 1234",
  "Total facturado", "157,75 €", "4 carreras y 1 total sin detallar", "Por canal", "Por forma de pago", "Por aplicación", "Cabify", "Gastos del rango", "Neto (facturación menos gastos)", "97,75 €", "Por día", "02/10/2026", "115,25 €", "Página 1 de 1"]) {
  assert.ok(con.s.includes(cadenaPdf(t).slice(1, -1)), `falta «${t}»`);
}
assert.ok(!con.s.includes(cadenaPdf("Matrícula").slice(1, -1)), "sin matrícula no sale la línea");
assert.ok(con.s.includes(cadenaPdf(PIE.split(" ").slice(0, 6).join(" ")).slice(1, -1)), "pie informativo");
const sin = validar(componerPdf({ resumen: r, generado })).s;
assert.ok(!sin.includes("Conductor") && !sin.includes("Gastos del rango") && !sin.includes("Neto"), "sin perfil ni gastos no salen");

// Paginación automática: 3 meses de días → varias páginas, cabecera repetida y «Página n de n»
const muchas = Array.from({ length: 92 }, (_, i) => ({ fecha: new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10), hora: "10:00", canal: "calle", metodo: "efectivo", app: "", importe: 10 }));
const rm = resumenRango(muchas, "2026-07-01", "2026-09-30");
const pg = validar(componerPdf({ resumen: rm, generado }));
assert.ok(pg.paginas >= 3, `páginas: ${pg.paginas}`);
assert.ok(pg.s.includes(cadenaPdf(`Página ${pg.paginas} de ${pg.paginas}`)));
assert.equal((pg.s.match(/\(Fecha\)/g) || []).length, pg.paginas, "la cabecera de la tabla se repite en cada página");
assert.equal(rm.total, 920); assert.equal(rm.carreras, 92);
console.log(`pdf: ok (${pg.paginas} páginas con 92 días)`);
