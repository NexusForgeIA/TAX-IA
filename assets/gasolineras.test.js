import assert from "node:assert";
import { CIUDADES, LIMITE, urlBusqueda, municipiosDe, filasValidas, enlacesLlegar, fuenteSegura, horasDesde, porUnidad } from "./gasolineras-datos.js";

assert.deepStrictEqual(Object.keys(CIUDADES), ["Madrid", "Barcelona", "Sevilla", "Valencia"]);
assert.strictEqual(LIMITE, 30);
assert.strictEqual(urlBusqueda("https://x/f", { combustible: "glp", provincia: "28", municipio: "4354", solo24: false }),
  "https://x/f/gasol-buscar?combustible=glp&provincia=28&municipio=4354&limite=30");
assert.ok(urlBusqueda("https://x/f", { combustible: "glp", provincia: "28", municipio: "4354", solo24: true }).endsWith("&solo24=1"));

const t = [{ id_provincia: "28", id_municipio: "4354", municipio: "Madrid" }, { id_provincia: "28", id_municipio: "1", municipio: "Alcobendas" },
  { id_provincia: "08", id_municipio: "881", municipio: "Barcelona" }, { id_provincia: "28", id_municipio: "x", municipio: "Malo" }];
assert.deepStrictEqual(municipiosDe(t, "28"), [["1", "Alcobendas"], ["4354", "Madrid"]]);
assert.deepStrictEqual(municipiosDe(null, "28"), []);

const f = filasValidas([{ precio: 1.6, fecha_captura: "2026-10-17T21:12:57+00:00" }, { precio: 1.5, fecha_captura: "2026-10-17T21:12:57+00:00" },
  { precio: 0, fecha_captura: "2026-10-17T21:12:57+00:00" }, { precio: 1.4, fecha_captura: null }, { precio: 1.3, fecha_captura: "no" }]);
assert.deepStrictEqual(f.map((x) => x.precio), [1.5, 1.6]);

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
