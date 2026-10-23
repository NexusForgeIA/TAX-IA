// taxi-gasolineras: lectura pública de los precios que carga taxi-gasolineras-ingest (GET, CORS, sin clave en el cliente).
//   ?ciudad=Madrid|Barcelona|Sevilla|Valencia[&municipio=4354][&combustible=gasoleo_a][&solo24h=1]
// Devuelve las 30 más baratas del municipio (por defecto, la capital), los municipios de la provincia con estaciones y la
// fecha de la captura. Solo se reciben esos parámetros: no hay datos del usuario y no se guarda nada.
import { cors, rpcServicio } from "../_shared/supa.ts";
import { LIMITE, leerConsulta } from "./consulta.ts";

const CORS = cors("GET");
const ATRIBUCION = "Origen de los datos: Ministerio para la Transición Ecológica y el Reto Demográfico";
const FUENTE = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const json = (body: unknown, status = 200, cache = "no-store") =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET") return json({ error: "Método no permitido." }, 405);
  const c = leerConsulta(new URL(req.url).searchParams);
  if ("error" in c) return json(c, 400);
  try {
    const d = await rpcServicio("taxi_gasolineras_buscar", {
      p_provincia: c.provincia, p_municipio: c.municipio, p_combustible: c.combustible, p_solo24: c.solo24, p_limite: LIMITE,
    });
    return json({ combustible: c.combustible, municipio: c.municipio, atribucion: ATRIBUCION, fuente: FUENTE, ...d }, 200, "public, max-age=120");
  } catch {
    console.error("taxi-gasolineras: error al leer los precios");
    return json({ error: "No se pudieron consultar los precios ahora mismo." }, 502);
  }
});
