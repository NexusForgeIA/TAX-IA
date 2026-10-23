import { assertEquals } from "jsr:@std/assert@1.0.13";
import { contarVisita, LIMITE_VISITAS_HORA, leerVisita, MODOS, PAGINAS } from "./limites.ts";

Deno.test("lista cerrada: 19 páginas y dos modos; lo demás se rechaza", () => {
  assertEquals(PAGINAS.length, 19);
  assertEquals([...MODOS], ["navegador", "instalada"]);
  assertEquals(leerVisita('{"pagina":"turnos","modo":"instalada"}'), { pagina: "turnos", modo: "instalada" });
  for (const malo of ['{"pagina":"otra","modo":"navegador"}', '{"pagina":"turnos","modo":"app"}', '{"pagina":"turnos"}', "{roto", "null", "", '["turnos","navegador"]',
    '{"pagina":"../turnos","modo":"navegador"}', '{"pagina":"TURNOS","modo":"navegador"}']) {
    assertEquals(leerVisita(malo), null, malo);
  }
  assertEquals(leerVisita('{"pagina":"inicio","modo":"navegador","lat":40.4,"id":"x"}'), { pagina: "inicio", modo: "navegador" });
});

/** Imita taxi_contar_visita: tope por hora y recuento por día, página y modo. */
function contadorFalso(reloj: { hora: string; dia: string }) {
  const horas = new Map<string, number>(), dias = new Map<string, number>();
  const llamadas: unknown[] = [];
  const rpc = (nombre: string, args: Record<string, unknown>) => {
    llamadas.push({ nombre, args });
    const h = (horas.get(reloj.hora) ?? 0) + 1;
    horas.set(reloj.hora, h);
    if (h > (args.p_limite_hora as number)) return Promise.resolve("tope");
    const k = `${reloj.dia}/${args.p_pagina}/${args.p_modo}`;
    dias.set(k, (dias.get(k) ?? 0) + 1);
    return Promise.resolve("ok");
  };
  return { rpc, dias, llamadas };
}

Deno.test("tope por hora: 300 cuentan, el resto de la hora no; la hora siguiente vuelve a contar", async () => {
  const reloj = { hora: "2026-10-21T10", dia: "2026-10-21" };
  const { rpc, dias } = contadorFalso(reloj);
  for (let i = 0; i < LIMITE_VISITAS_HORA; i++) assertEquals(await contarVisita(rpc, { pagina: "inicio", modo: "navegador" }), "ok");
  assertEquals(await contarVisita(rpc, { pagina: "inicio", modo: "navegador" }), "tope");
  assertEquals(dias.get("2026-10-21/inicio/navegador"), LIMITE_VISITAS_HORA);
  reloj.hora = "2026-10-21T11";
  assertEquals(await contarVisita(rpc, { pagina: "turnos", modo: "instalada" }), "ok");
  assertEquals(LIMITE_VISITAS_HORA * 24, 7200);
});

Deno.test("la carga útil no lleva datos personales: solo página, modo y tope", async () => {
  const { rpc, llamadas } = contadorFalso({ hora: "h", dia: "d" });
  await contarVisita(rpc, leerVisita('{"pagina":"gastos","modo":"navegador","ip":"1.2.3.4","lat":40.41,"lon":-3.7}')!);
  assertEquals(llamadas, [{ nombre: "taxi_contar_visita", args: { p_pagina: "gastos", p_modo: "navegador", p_limite_hora: LIMITE_VISITAS_HORA } }]);
  assertEquals(/ip|lat|lon|1\.2\.3\.4|40\.41/i.test(JSON.stringify(llamadas)), false);
});

Deno.test("la lista de páginas coincide con la de la última migración", async () => {
  const sql = await Deno.readTextFile(new URL("../../migrations/20261023160000_taxi_gasolineras.sql", import.meta.url));
  const enSql = [...sql.matchAll(/pagina (?:not )?in \(([^)]*)\)/g)].map((m) => m[1].replace(/'/g, "").split(",").map((x) => x.trim()));
  for (const lista of enSql) assertEquals([...lista].sort(), [...PAGINAS].sort());
  assertEquals(enSql.length >= 2, true);
});
