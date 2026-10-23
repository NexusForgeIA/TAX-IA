import assert from "node:assert";
import { CIUDADES, LIMITE, HORAS_DESACTUALIZADA, urlBusqueda, municipiosDe, filasValidas, fechaValida, enlacesLlegar, fuenteSegura, horasDesde, porUnidad } from "./gasolineras-datos.js";

assert.deepStrictEqual(Object.keys(CIUDADES), ["Madrid", "Barcelona", "Sevilla", "Valencia"]);
assert.strictEqual(LIMITE, 30);
assert.strictEqual(HORAS_DESACTUALIZADA, 3);
assert.strictEqual(urlBusqueda("https://x/f", { ciudad: "Madrid", municipio: "4354", combustible: "glp", solo24: false }),
  "https://x/f/taxi-gasolineras?ciudad=Madrid&municipio=4354&combustible=glp");
assert.ok(urlBusqueda("https://x/f", { ciudad: "Madrid", municipio: "4354", combustible: "glp", solo24: true }).endsWith("&solo24h=1"));

assert.deepStrictEqual(municipiosDe([["4354", "Madrid"], ["4280", "Alcalá de Henares"], ["x", "Malo"], ["1"], "nada", ["4277", "Ajalvir"]]),
  [["4277", "Ajalvir"], ["4280", "Alcalá de Henares"], ["4354", "Madrid"]]);
assert.deepStrictEqual(municipiosDe(null), []);

const f = filasValidas([{ precio: 1.6 }, { precio: "1.5" }, { precio: 0 }, { precio: null }, null]);
assert.deepStrictEqual(f.map((x) => Number(x.precio)), [1.5, 1.6]);
assert.strictEqual(fechaValida("2026-10-23T20:10:48+00:00"), "2026-10-23T20:10:48+00:00");
assert.strictEqual(fechaValida(null), null);
assert.strictEqual(fechaValida("ayer"), null);

const e = enlacesLlegar({ lat: 40.393806, lon: -3.654528 });
assert.strictEqual(e.maps, "https://www.google.com/maps/dir/?api=1&destination=40.393806%2C-3.654528&travelmode=driving");
assert.strictEqual(e.waze, "https://waze.com/ul?ll=40.393806%2C-3.654528&navigate=yes");
assert.strictEqual(enlacesLlegar({ lat: 0, lon: 0 }), null);
assert.strictEqual(enlacesLlegar({}), null);

assert.ok(fuenteSegura("https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/"));
assert.strictEqual(fuenteSegura("http://sedeaplicaciones.minetur.gob.es/"), null);
assert.strictEqual(fuenteSegura("https://minetur.gob.es.malo.com/"), null);
assert.strictEqual(fuenteSegura("javascript:alert(1)"), null);

assert.strictEqual(horasDesde("2026-10-17T21:00:00+00:00", Date.parse("2026-10-18T22:30:00+00:00")), 25);
assert.strictEqual(porUnidad("gnc"), "por kg");
assert.strictEqual(porUnidad("gasoleo_a"), "por litro");
console.log("gasolineras: ok");
