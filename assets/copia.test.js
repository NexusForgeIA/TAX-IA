// node assets/copia.test.js
import assert from "node:assert/strict";
import { archivoCopia, crearCopia, leerCopia, restaurarCopia } from "./copia.js";

const falso = (ini = {}, falla = null) => {
  const m = new Map(Object.entries(ini));
  return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => { if (k === falla) return false; m.set(k, v); return true; }, del: (k) => m.delete(k), claves: () => [...m.keys()].filter((k) => k.startsWith("taxi.")), m };
};
const a = falso({ "taxi.ingresos": '{"v":1}', "taxi.objetivo": "150", "taxi.instalada-contada": "1", "taxi.trayecto.activo": "{}", "otra": "x" });
const c = crearCopia(a, new Date("2026-10-22T10:00:00Z"));
assert.deepEqual(Object.keys(c.datos), ["taxi.ingresos", "taxi.objetivo"]);
assert.equal(archivoCopia(c).nombre, "taxi-ia-copia-2026-10-22.json");
const l = leerCopia(archivoCopia(c).texto);
assert.equal(l.n, 2);
const b = falso({ "taxi.objetivo": "999", "taxi.gastos": "[]" });
assert.deepEqual(restaurarCopia(l.copia, b), { n: 2 });
assert.equal(b.get("taxi.objetivo"), "150"); assert.equal(b.get("taxi.gastos"), "[]"); // lo no incluido se conserva
// ajeno, corrupto y futuro
assert.ok(leerCopia("no es json").error); assert.ok(leerCopia('{"formato":"otra"}').error);
assert.ok(leerCopia(JSON.stringify({ formato: "taxi-ia-copia", v: 2, datos: { "taxi.x": "1" } })).error);
const ajeno = leerCopia(JSON.stringify({ formato: "taxi-ia-copia", v: 1, datos: { "taxi.ok": "1", "sesion": "x", "taxi.": "1", "taxi.instalada-contada": "1", "taxi.num": 5 } }));
assert.deepEqual(Object.keys(ajeno.copia.datos), ["taxi.ok"]);
// si falla una escritura, se deshace
const d = falso({ "taxi.objetivo": "999" }, "taxi.ingresos");
assert.ok(restaurarCopia(l.copia, d).error); assert.equal(d.get("taxi.objetivo"), "999");
{
  const base = { formato: "taxi-ia-copia", v: 1, datos: { "taxi.turnos": "{\"x\":1}", "taxi.trayectos": "[]", "taxi.objetivo": "no json", "taxi.tour": "true" } };
  const r = leerCopia(JSON.stringify(base));
  assert.equal(r.copia.fecha, null);
  assert.deepEqual(Object.keys(r.copia.datos).sort(), ["taxi.tour", "taxi.trayectos"]);
}
console.log("copia: ok");
