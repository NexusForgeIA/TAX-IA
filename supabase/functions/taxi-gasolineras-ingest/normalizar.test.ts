import { assertEquals, assertNotEquals, assertThrows } from "jsr:@std/assert@1.0.13";
import { decidir, fechaFuenteAIso, huellaDe, normalizar, PROVINCIAS } from "./normalizar.ts";
import muestra from "./fixtures/madrid.json" with { type: "json" };

Deno.test("las cuatro provincias y sus mínimos", () => {
  // Ojo: las claves numéricas («28», «41», «46») van antes que «08» al recorrer el objeto.
  assertEquals(Object.keys(PROVINCIAS).sort(), ["08", "28", "41", "46"]);
  assertEquals(["28", "08", "46", "41"].map((p) => PROVINCIAS[p].minimo), [300, 300, 200, 200]);
});

Deno.test("fecha de la fuente en hora peninsular -> UTC (verano e invierno)", () => {
  assertEquals(fechaFuenteAIso("23/10/2026 21:48:06"), "2026-10-23T19:48:06.000Z");
  assertEquals(fechaFuenteAIso("15/01/2027 08:00:00"), "2027-01-15T07:00:00.000Z");
});

Deno.test("normaliza estaciones reales: coma decimal, horario 24 h y precios", () => {
  const r = normalizar(muestra, "28", 1);
  assertEquals(r.fechaFuente, "2026-10-23T19:48:06.000Z");
  assertEquals(r.estaciones.length, 3);
  const galp = r.estaciones.find((x) => x.ideess === "4698")!;
  assertEquals([galp.lat, galp.lon, galp.id_municipio, galp.abierta_24h], [40.494167, -3.388028, "4280", "si"]);
  assertEquals(r.estaciones.find((x) => x.ideess === "3118")!.abierta_24h, "no");
  assertEquals(r.estaciones.find((x) => x.ideess === "4490")!.abierta_24h, "no");
  assertEquals(r.precios.find((p) => p.ideess === "4698" && p.combustible === "glp")?.precio, 1.019);
  assertEquals(r.precios.find((p) => p.ideess === "3118" && p.combustible === "gasoleo_a")?.precio, 1.989);
  // Los campos vacíos no generan fila de precio.
  assertEquals(r.precios.some((p) => p.ideess === "3118" && p.combustible === "adblue"), false);
  assertEquals(r.avisos, []);
});

Deno.test("respuesta no válida: no se normaliza (y así no se sustituye nada)", () => {
  assertThrows(() => normalizar(muestra, "28"), Error, "incompleta"); // 3 < 300
  assertThrows(() => normalizar(muestra, "99", 1), Error, "Provincia");
  assertThrows(() => normalizar({ ResultadoConsulta: "KO" }, "28", 1), Error, "OK");
  assertThrows(() => normalizar({ ResultadoConsulta: "OK", Fecha: "23/10/2026 21:48:06" }, "28", 1), Error, "ListaEESSPrecio");
  assertThrows(() => normalizar({ ...muestra, Fecha: "ayer" }, "28", 1), Error, "Fecha");
  // Estaciones de otra provincia no cuentan para el mínimo.
  assertThrows(() => normalizar(muestra, "08", 1), Error, "incompleta");
});

Deno.test("descarta duplicadas, sin coordenadas o con 0,0, e ignora campos de precio nuevos con aviso", () => {
  const base = muestra.ListaEESSPrecio[0];
  const r = normalizar({
    ...muestra,
    ListaEESSPrecio: [base, base, { ...base, IDEESS: "9", Latitud: "" },
      // Caso real (Barcelona, 23/10/2026): estación publicada con 0,0.
      { ...base, IDEESS: "11988", Latitud: "0,000000", "Longitud (WGS84)": "0,000000" },
      { ...base, IDEESS: "10", "Precio Combustible Nuevo": "1,234" }],
  }, "28", 1);
  assertEquals(r.estaciones.map((e) => e.ideess), ["4698", "10"]);
  assertEquals(r.precios.some((p) => p.ideess === "11988"), false);
  assertEquals(r.precios.some((p) => p.combustible.includes("nuevo")), false);
  assertEquals(r.avisos.length, 4);
});

Deno.test("regla de sustitución: solo si es válida y distinta de la última buena", () => {
  assertEquals(decidir(true, "a", "b"), "sustituir");
  assertEquals(decidir(true, "a", null), "sustituir");
  assertEquals(decidir(true, "a", "a"), "duplicada");
  assertEquals(decidir(false, "a", "b"), "conservar");
  assertEquals(decidir(true, null, "b"), "conservar");
});

Deno.test("la huella no depende de la fecha de la petición", async () => {
  const a = normalizar(muestra, "28", 1);
  const b = normalizar({ ...muestra, Fecha: "24/10/2026 06:00:00" }, "28", 1);
  assertEquals(await huellaDe(a), await huellaDe(b));
  const c = normalizar({ ...muestra, ListaEESSPrecio: [{ ...muestra.ListaEESSPrecio[0], "Precio Gasoleo A": "1,830" }] }, "28", 1);
  assertNotEquals(await huellaDe(a), await huellaDe(c));
});
