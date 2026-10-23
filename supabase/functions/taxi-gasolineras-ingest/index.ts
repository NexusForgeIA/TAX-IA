// taxi-gasolineras-ingest: carga los precios del Ministerio de Madrid, Barcelona, Valencia y Sevilla (una petición por
// provincia). Pública (--no-verify-jwt) pero exige la cabecera x-taxi-token, que se valida contra Vault
// (taxi_gasolineras_token_valido); el token no va nunca al cliente.
//
// Dos pasos, cada 30 min de 06:00 a 23:30 hora peninsular (migración 20261023201000): a :00/:30 la base pide las
// descargas a pg_net (el servidor oficial solo acepta TLS 1.2 con RSA estático y el fetch de Deno no conecta) y a :02/:32
// el cron llama a esta función, que recoge cada respuesta (esperando como mucho 30 s), valida y normaliza (normalizar.ts)
// y sustituye la captura anterior en una sola transacción SOLO si la nueva es válida. La función no pide descargas: si lo
// hiciera mientras pg_net la está llamando, pg_net no las atendería hasta el final y se agotaría la espera.
// Si una provincia falla, se anota el error, se conserva su última captura buena y las demás siguen.
// Idempotente por huella: un contenido igual al de la última captura buena no se recarga.
import { cors, respuesta, rpcServicio } from "../_shared/supa.ts";
import { huellaDe, normalizar, PROVINCIAS } from "./normalizar.ts";

const CORS = cors("POST");
const json = respuesta(CORS);
const ESPERA_MS = 30_000;
const PASO_MS = 1_000;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Recoge la descarga que pidió la base para esta provincia (esperando como mucho 30 s). */
async function descargar(provincia: string): Promise<unknown> {
  const id = await rpcServicio("taxi_gasolineras_pendiente", { p_provincia: provincia });
  if (id === null) throw new Error("No hay ninguna descarga pedida en los últimos 20 min");
  for (let t = 0; t <= ESPERA_MS; t += PASO_MS) {
    const filas = await rpcServicio("taxi_gasolineras_descarga_resultado", { p_id: id });
    if (!Array.isArray(filas) || filas.length === 0) { await espera(PASO_MS); continue; }
    const [r] = filas;
    if (r.timed_out || r.error_msg) throw new Error(`Descarga fallida: ${r.timed_out ? "tiempo agotado" : String(r.error_msg).slice(0, 120)}`);
    if (r.status_code !== 200) throw new Error(`El Ministerio respondió ${r.status_code}`);
    try { return JSON.parse(r.content); } catch { throw new Error("Respuesta que no es JSON"); }
  }
  throw new Error("La descarga no terminó en 30 s");
}

async function cargarProvincia(provincia: string) {
  const inicio = Date.now();
  try {
    const datos = normalizar(await descargar(provincia), provincia);
    // Si normalizar() no lanzó, la captura es válida; «sustituir» o «duplicada» lo decide la base comparando la huella con la
    // de la última captura buena, en la misma transacción y con bloqueo por provincia (la regla de decidir() en normalizar.ts).
    const huella = await huellaDe(datos);
    const r = await rpcServicio("taxi_gasolineras_sustituir", {
      p_provincia: provincia, p_fecha_fuente: datos.fechaFuente, p_huella: huella, p_estaciones: datos.estaciones, p_precios: datos.precios,
    });
    return { provincia, ...r, fecha_fuente: datos.fechaFuente, avisos: datos.avisos.length, ms: Date.now() - inicio };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`taxi-gasolineras-ingest ${provincia}:`, error.slice(0, 200));
    try { await rpcServicio("taxi_gasolineras_captura_error", { p_provincia: provincia, p_fecha_fuente: null, p_error: error }); }
    catch { console.error(`taxi-gasolineras-ingest ${provincia}: no se pudo anotar el error`); }
    return { provincia, estado: "error", error, ms: Date.now() - inicio };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const token = req.headers.get("x-taxi-token") ?? "";
  if (token.length < 32 || token.length > 128 || (await rpcServicio("taxi_gasolineras_token_valido", { p_token: token })) !== true) {
    return json({ error: "No autorizado" }, 401);
  }
  // Las cuatro a la vez: cada una con su tope de 30 s y su propio resultado.
  const resultados = await Promise.all(Object.keys(PROVINCIAS).map(cargarProvincia));
  const fallos = resultados.filter((r) => r.estado === "error").length;
  return json({ resultados }, fallos === resultados.length ? 502 : 200);
});
