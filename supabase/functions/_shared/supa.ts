// Utilidades comunes de las Edge Functions taxi-*. Solo llamadas con service_role a funciones
// taxi_* de servidor; el cliente no lleva ninguna clave.

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function cors(metodos: string) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, x-taxi-clave",
    "Access-Control-Allow-Methods": `${metodos}, OPTIONS`,
  };
}

export function respuesta(cabeceras: Record<string, string>) {
  return (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cabeceras, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
}

export async function rpcServicio(nombre: string, args: unknown) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${nombre} ${r.status}: ${texto.slice(0, 200)}`);
  return texto ? JSON.parse(texto) : null;
}
