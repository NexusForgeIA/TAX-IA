// Composición del resumen diario (sin red ni base de datos: se prueba con Deno). Se cuentan
// aperturas, no personas; lo que no hay se dice «sin datos», sin inventar cifras.

export interface DatosResumen {
  visitas: { pagina: string; modo: string; recuento: number }[];
  horas_tope: number;
}

/** Día de ayer en Madrid como "AAAA-MM-DD". */
export function ayerMadrid(ahora = new Date()): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(ahora);
  const [y, m, d] = hoy.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

const fecha = (dia: string) => dia.split("-").reverse().join("/");
const n = (x: number) => new Intl.NumberFormat("es-ES").format(x);

export function componerResumen(dia: string, datos: DatosResumen): string {
  const lineas = [`Taxi-IA · resumen de ayer (${fecha(dia)})`, "Aperturas, no personas."];
  const v = datos.visitas ?? [];
  // "instalar-clic", "instalacion" y "primera-instalada" no son aperturas: se cuentan aparte.
  const vApp = v.filter((x) => x.pagina !== "instalar-clic" && x.pagina !== "instalacion" && x.pagina !== "primera-instalada");
  const hechos = (p: string) => v.filter((x) => x.pagina === p).reduce((s, x) => s + x.recuento, 0);
  if (!vApp.length) {
    lineas.push("Aperturas: sin datos", "Páginas más abiertas: sin datos");
  } else {
    const total = vApp.reduce((s, x) => s + x.recuento, 0);
    const porModo = (m: string) => vApp.filter((x) => x.modo === m).reduce((s, x) => s + x.recuento, 0);
    lineas.push(`Aperturas: ${n(total)} (navegador ${n(porModo("navegador"))} · instalada ${n(porModo("instalada"))})`);
    const paginas = new Map<string, number>();
    for (const x of vApp) paginas.set(x.pagina, (paginas.get(x.pagina) ?? 0) + x.recuento);
    const top = [...paginas].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).slice(0, 3);
    lineas.push(`Páginas más abiertas: ${top.map(([p, r]) => `${p} ${n(r)}`).join(" · ")}`);
  }
  lineas.push(`Instalación: clics en Instalar ${n(hechos("instalar-clic"))} · instalaciones confirmadas ${n(hechos("instalacion"))} (solo Android y ordenador) · móviles que abren la app instalada por primera vez ${n(hechos("primera-instalada"))} (también iPhone)`);
  if (datos.horas_tope > 0) {
    lineas.push(`Dato orientativo: tope alcanzado en ${datos.horas_tope} ${datos.horas_tope === 1 ? "hora" : "horas"}.`);
  }
  return lineas.join("\n");
}

/** Compara dos claves en tiempo constante (se comparan sus SHA-256, siempre de 32 bytes). */
export async function claveIgual(a: string, b: string): Promise<boolean> {
  const h = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x[i] ^ y[i];
  return dif === 0;
}

// ---- Frescura de los precios de Gasolineras (taxi-gasolineras-ingest) --------------------------------------------

export interface FrescuraProvincia { provincia: string; fecha_fuente: string | null; n_estaciones: number | null; ultimo_estado: string | null }

const NOMBRE_PROVINCIA: Record<string, string> = { "28": "Madrid", "08": "Barcelona", "46": "Valencia", "41": "Sevilla" };
const HORA = 3600_000;

/** «hace 25 min», «hace 4 h», «hace 2 días». */
export function edadTexto(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 48 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} días`;
}

/**
 * Desactualizada si no hay captura buena, si supera 12 h, o si supera 3 h en horario de carga (06:00-23:59 hora
 * peninsular; la carga corre cada 30 min de 06:00 a 23:30).
 */
export function desactualizada(fecha: string | null, ahora: Date): boolean {
  if (!fecha || Number.isNaN(Date.parse(fecha))) return true;
  const edad = ahora.getTime() - Date.parse(fecha);
  const hora = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hourCycle: "h23" }).format(ahora));
  return edad > 12 * HORA || (hora >= 6 && edad > 3 * HORA);
}

/** Líneas del resumen: edad de la última captura buena por provincia y «PRECIOS DESACTUALIZADOS» si toca. */
export function componerFrescura(filas: FrescuraProvincia[], ahora = new Date()): string[] {
  const partes = (filas ?? []).map((f) => {
    const nombre = NOMBRE_PROVINCIA[f.provincia] ?? f.provincia;
    const edad = f.fecha_fuente && !Number.isNaN(Date.parse(f.fecha_fuente)) ? edadTexto(ahora.getTime() - Date.parse(f.fecha_fuente)) : "sin captura buena";
    const fallo = f.ultimo_estado === "error" ? " (último intento con error)" : "";
    return { nombre, texto: `${nombre} ${edad}${fallo}`, vieja: desactualizada(f.fecha_fuente, ahora) };
  });
  if (!partes.length) return ["Gasolineras: sin datos de carga", "PRECIOS DESACTUALIZADOS: no hay ninguna captura."];
  const lineas = [`Gasolineras, última captura buena: ${partes.map((p) => p.texto).join(" · ")}`];
  const viejas = partes.filter((p) => p.vieja);
  if (viejas.length) lineas.push(`PRECIOS DESACTUALIZADOS: ${viejas.map((p) => p.nombre).join(", ")}.`);
  return lineas;
}
