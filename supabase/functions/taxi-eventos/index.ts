// taxi-eventos: devuelve los próximos eventos de Madrid cargados a mano desde fuentes públicas
// (cada uno lleva su fuente y su enlace). GET sin datos del usuario: no se lee ni se guarda nada.
import { cors, rpcServicio } from "../_shared/supa.ts";

const CORS = cors("GET");
const cabeceras = { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" };

/** Día de hoy en Madrid como "AAAA-MM-DD". */
const hoyMadrid = (ahora = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(ahora);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET") return new Response(null, { status: 405, headers: CORS });
  try {
    const eventos = await rpcServicio("taxi_eventos_proximos", { p_hoy: hoyMadrid(), p_limite: 40 });
    return new Response(JSON.stringify({ hoy: hoyMadrid(), eventos }), { headers: cabeceras });
  } catch {
    console.error("taxi-eventos: error al leer los eventos");
    return new Response(JSON.stringify({ error: "No se pudieron cargar los eventos." }), { status: 500, headers: { ...cabeceras, "Cache-Control": "no-store" } });
  }
});
