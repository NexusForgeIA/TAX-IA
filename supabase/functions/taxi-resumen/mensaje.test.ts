import { assertEquals } from "jsr:@std/assert@1.0.13";
import { ayerMadrid, claveIgual, componerFrescura, componerResumen, desactualizada, edadTexto } from "./mensaje.ts";

Deno.test("resumen sin datos: «sin datos», sin cifras inventadas", () => {
  assertEquals(componerResumen("2026-10-17", { visitas: [], horas_tope: 0 }), [
    "Taxi-IA · resumen de ayer (17/10/2026)",
    "Aperturas, no personas.",
    "Aperturas: sin datos",
    "Páginas más abiertas: sin datos",
    "Instalación: clics en Instalar 0 · instalaciones confirmadas 0 (solo Android y ordenador) · móviles que abren la app instalada por primera vez 0 (también iPhone)",
  ].join("\n"));
});

Deno.test("resumen con datos: total, modos, tres páginas más abiertas y tope", () => {
  const texto = componerResumen("2026-10-18", {
    visitas: [
      { pagina: "inicio", modo: "navegador", recuento: 900 },
      { pagina: "inicio", modo: "instalada", recuento: 300 },
      { pagina: "turnos", modo: "navegador", recuento: 40 },
      { pagina: "ingresos", modo: "instalada", recuento: 40 },
      { pagina: "gastos", modo: "navegador", recuento: 5 },
    ],
    horas_tope: 2,
  });
  assertEquals(texto, [
    "Taxi-IA · resumen de ayer (18/10/2026)",
    "Aperturas, no personas.",
    "Aperturas: 1285 (navegador 945 · instalada 340)",
    "Páginas más abiertas: inicio 1200 · ingresos 40 · turnos 40",
    "Instalación: clics en Instalar 0 · instalaciones confirmadas 0 (solo Android y ordenador) · móviles que abren la app instalada por primera vez 0 (también iPhone)",
    "Dato orientativo: tope alcanzado en 2 horas.",
  ].join("\n"));
});

Deno.test("un modo que falta vale 0; una hora de tope en singular", () => {
  const texto = componerResumen("2026-10-18", { visitas: [{ pagina: "privacidad", modo: "navegador", recuento: 2 }], horas_tope: 1 });
  assertEquals(texto.split("\n").slice(2), [
    "Aperturas: 2 (navegador 2 · instalada 0)",
    "Páginas más abiertas: privacidad 2",
    "Instalación: clics en Instalar 0 · instalaciones confirmadas 0 (solo Android y ordenador) · móviles que abren la app instalada por primera vez 0 (también iPhone)",
    "Dato orientativo: tope alcanzado en 1 hora.",
  ]);
});

Deno.test("ayer en Madrid, también con el cambio de hora del 25/10/2026", () => {
  assertEquals(ayerMadrid(new Date("2026-10-18T06:00:00Z")), "2026-10-17");
  assertEquals(ayerMadrid(new Date("2026-10-26T07:00:00Z")), "2026-10-25");
  assertEquals(ayerMadrid(new Date("2026-10-31T23:30:00Z")), "2026-10-31");
});

Deno.test("claves: comparación por SHA-256 en tiempo constante", async () => {
  assertEquals(await claveIgual("abc", "abc"), true);
  assertEquals(await claveIgual("abc", "abd"), false);
  assertEquals(await claveIgual("abc", ""), false);
});

Deno.test("frescura: edades por provincia y sin aviso si todo está al día", () => {
  const ahora = new Date("2026-10-24T06:00:00Z"); // 08:00 en Madrid (horario de carga)
  const f = (p: string, horas: number) => ({ provincia: p, fecha_fuente: new Date(ahora.getTime() - horas * 3600_000).toISOString(), n_estaciones: 1, ultimo_estado: "ok" });
  assertEquals(componerFrescura([f("28", 0.5), f("08", 1), f("46", 2), f("41", 2.9)], ahora),
    ["Gasolineras, última captura buena: Madrid hace 30 min · Barcelona hace 1 h · Valencia hace 2 h · Sevilla hace 2 h"]);
});

Deno.test("frescura: más de 3 h en horario de carga, más de 12 h siempre, o sin captura -> PRECIOS DESACTUALIZADOS", () => {
  const dia = new Date("2026-10-24T10:00:00Z"); // 12:00 en Madrid
  const f = (p: string, horas: number | null, estado = "ok") => ({ provincia: p, fecha_fuente: horas === null ? null : new Date(dia.getTime() - horas * 3600_000).toISOString(), n_estaciones: 1, ultimo_estado: estado });
  assertEquals(componerFrescura([f("28", 1), f("08", 3.5, "error"), f("46", 1), f("41", null)], dia), [
    "Gasolineras, última captura buena: Madrid hace 1 h · Barcelona hace 3 h (último intento con error) · Valencia hace 1 h · Sevilla sin captura buena",
    "PRECIOS DESACTUALIZADOS: Barcelona, Sevilla.",
  ]);
  const noche = new Date("2026-10-24T02:00:00Z"); // 04:00 en Madrid: fuera de horario, solo cuenta el tope de 12 h
  assertEquals(desactualizada(new Date(noche.getTime() - 5 * 3600_000).toISOString(), noche), false);
  assertEquals(desactualizada(new Date(noche.getTime() - 13 * 3600_000).toISOString(), noche), true);
  assertEquals(componerFrescura([], dia), ["Gasolineras: sin datos de carga", "PRECIOS DESACTUALIZADOS: no hay ninguna captura."]);
  assertEquals(edadTexto(50 * 3600_000), "hace 2 días");
});
