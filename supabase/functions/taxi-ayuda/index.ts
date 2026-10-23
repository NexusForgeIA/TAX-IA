// taxi-ayuda: recibe una solicitud «Me interesa» de la pantalla Ayudas (nombre, teléfono, mensaje opcional y el
// consentimiento), la guarda en taxi_ayuda_solicitudes y avisa por Telegram. La derivación a la gestoría la hace
// Cris a mano desde el aviso: nada se envía a terceros desde aquí. Ni los secretos ni los datos van a los logs.
import { cors, respuesta, rpcServicio } from "../_shared/supa.ts";
import { LIMITE_SOLICITUDES_HORA, leerSolicitud, MAX_BYTES, textoAviso } from "./solicitud.ts";

const CORS = cors("POST");
const json = respuesta(CORS);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chat = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chat) return json({ error: "No se ha podido enviar. Inténtalo más tarde." }, 500);

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return json({ error: "La solicitud es demasiado larga." }, 413);
  const s = leerSolicitud(await req.text().catch(() => ""));
  if ("error" in s) return json({ error: s.error }, 400);

  try {
    const r = await rpcServicio("taxi_guardar_solicitud_ayuda", {
      p_nombre: s.nombre, p_telefono: s.telefono, p_mensaje: s.mensaje, p_version: s.version, p_limite_hora: LIMITE_SOLICITUDES_HORA,
    });
    if (r === "tope") return json({ error: "Hay muchas solicitudes ahora mismo. Inténtalo dentro de un rato." }, 429);
  } catch {
    console.error("taxi-ayuda: no se pudo guardar la solicitud");
    return json({ error: "No se ha podido enviar. Inténtalo más tarde." }, 500);
  }

  // La solicitud ya está guardada: si Telegram falla, no se pierde (se ve en la tabla) y al usuario se le confirma.
  try {
    const t = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: textoAviso(s), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!t.ok) console.error("taxi-ayuda: Telegram respondió", t.status);
  } catch {
    console.error("taxi-ayuda: no se pudo avisar por Telegram");
  }
  return json({ recibido: true });
});
