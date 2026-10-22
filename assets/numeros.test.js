// node assets/numeros.test.js
import assert from "node:assert/strict";
import C from "./herramientas.js";
import { leerNumero } from "./numeros.js";

assert.equal(leerNumero("12,5"), 12.5); assert.equal(leerNumero("12.5"), 12.5); assert.equal(leerNumero("1500,5"), 1500.5);
assert.equal(leerNumero("1.500,50"), 1500.5); assert.ok(Number.isNaN(leerNumero("1.500"))); assert.ok(Number.isNaN(leerNumero("1.500.000")));
assert.ok(Number.isNaN(leerNumero(""))); assert.equal(leerNumero("1,500"), 1.5);
// M1: con pérdidas el asalariado no sale en negativo
const r = C.reparto({ recaudacion: 100, gastos: 150, porcentaje: 40, base: "neto" });
assert.equal(r.asalariado, 0); assert.equal(r.base, 0); assert.equal(r.titular, -50);
assert.equal(C.reparto({ recaudacion: 200, gastos: 50, porcentaje: 40, base: "neto" }).asalariado, 60);
assert.equal(C.reparto({ recaudacion: 200, gastos: 50, porcentaje: 40, base: "recaudacion" }).asalariado, 80);
console.log("numeros y reparto: ok");
