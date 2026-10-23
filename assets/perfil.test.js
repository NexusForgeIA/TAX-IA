// node assets/perfil.test.js
import assert from "node:assert/strict";
import { CLAVE_PERFIL, CLAVE_PREF_ANTIGUA, guardarPerfil, leerPerfil, perfilValido } from "./perfil.js";

const falso = (ini = {}) => {
  const m = new Map(Object.entries(ini));
  return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => { m.set(k, v); return true; }, del: (k) => m.delete(k), m };
};

// Sin nada: vacío y no escribe
const a = falso();
assert.deepEqual(leerPerfil(a), { nombre: "", licencia: "", matricula: "" });
assert.equal(a.m.size, 0);

// Migración una sola vez desde el justificante: conductor → nombre, vehiculo → licencia; la clave vieja se borra
const b = falso({ [CLAVE_PREF_ANTIGUA]: JSON.stringify({ conductor: "  José   Núñez ", vehiculo: "Lic 77 / 1234ABC" }) });
assert.deepEqual(leerPerfil(b), { nombre: "José Núñez", licencia: "Lic 77 / 1234ABC", matricula: "" });
assert.equal(b.get(CLAVE_PREF_ANTIGUA), null);
assert.deepEqual(JSON.parse(b.get(CLAVE_PERFIL)), { v: 1, nombre: "José Núñez", licencia: "Lic 77 / 1234ABC", matricula: "" });
// Si ya hay perfil, la clave vieja no lo pisa
const c = falso({ [CLAVE_PERFIL]: JSON.stringify({ v: 1, nombre: "Ana" }), [CLAVE_PREF_ANTIGUA]: JSON.stringify({ conductor: "Otro" }) });
assert.equal(leerPerfil(c).nombre, "Ana");

// Guardar recorta y limita; la forma se valida
const d = falso();
guardarPerfil({ nombre: "x".repeat(80), licencia: " 12 ", matricula: "1234   ABC", extra: "no" }, d);
const g = JSON.parse(d.get(CLAVE_PERFIL));
assert.deepEqual(g, { v: 1, nombre: "x".repeat(60), licencia: "12", matricula: "1234 ABC" });
assert.ok(perfilValido(g));
assert.ok(!perfilValido({ nombre: "x" })); assert.ok(!perfilValido({ v: 1, licencia: 3 })); assert.ok(!perfilValido(null)); assert.ok(!perfilValido([]));
// Corrupto: vacío, sin romper
assert.deepEqual(leerPerfil(falso({ [CLAVE_PERFIL]: "{roto" })), { nombre: "", licencia: "", matricula: "" });
console.log("perfil: ok");
