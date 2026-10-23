// Normaliza la respuesta del Ministerio para una provincia (FiltroProvincia/{id}) a filas de
// taxi_gasolineras_estaciones / taxi_gasolineras_precios. La conversión (coma decimal, fecha en hora
// peninsular, campos «Precio …») es la de gasol-ingest/normalizar.ts de Gasol-IA, copiada aquí.
// Sin red ni base de datos: se prueba con Deno (normalizar.test.ts).
import { type Abierta24h, clasificarHorario } from "./horario.ts";

export const FUENTE_BASE =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/";

/** Provincias que carga Taxi-IA y el mínimo de estaciones para dar una respuesta por buena. */
export const PROVINCIAS: Record<string, { nombre: string; minimo: number }> = {
  "28": { nombre: "Madrid", minimo: 300 },
  "08": { nombre: "Barcelona", minimo: 300 },
  "46": { nombre: "Valencia", minimo: 200 },
  "41": { nombre: "Sevilla", minimo: 200 },
};

// Campo oficial -> código (los mismos códigos que Gasol-IA). Un campo «Precio …» nuevo se ignora y se avisa.
export const COMBUSTIBLES: Record<string, string> = {
  "Precio Gasoleo A": "gasoleo_a",
  "Precio Gasoleo B": "gasoleo_b",
  "Precio Gasoleo Premium": "gasoleo_premium",
  "Precio Diésel Renovable": "diesel_renovable",
  "Precio Biodiesel": "biodiesel",
  "Precio Adblue": "adblue",
  "Precio Gasolina 95 E5": "gasolina_95_e5",
  "Precio Gasolina 95 E5 Premium": "gasolina_95_e5_premium",
  "Precio Gasolina 95 E10": "gasolina_95_e10",
  "Precio Gasolina 95 E25": "gasolina_95_e25",
  "Precio Gasolina 95 E85": "gasolina_95_e85",
  "Precio Gasolina 98 E5": "gasolina_98_e5",
  "Precio Gasolina 98 E10": "gasolina_98_e10",
  "Precio Gasolina Renovable": "gasolina_renovable",
  "Precio Bioetanol": "bioetanol",
  "Precio Gases licuados del petróleo": "glp",
  "Precio Gas Natural Comprimido": "gnc",
  "Precio Gas Natural Licuado": "gnl",
  "Precio Biogas Natural Comprimido": "biogas_comprimido",
  "Precio Biogas Natural Licuado": "biogas_licuado",
  "Precio Hidrogeno": "hidrogeno",
  "Precio Amoniaco": "amoniaco",
  "Precio Metanol": "metanol",
};

export interface Estacion {
  ideess: string;
  rotulo: string;
  direccion: string;
  municipio: string;
  id_municipio: string;
  provincia: string;
  id_provincia: string;
  lat: number;
  lon: number;
  horario_texto: string;
  abierta_24h: Abierta24h;
}

export interface Precio {
  ideess: string;
  combustible: string;
  precio: number;
}

export interface Normalizado {
  provincia: string;
  fechaFuente: string; // ISO UTC
  estaciones: Estacion[];
  precios: Precio[];
  avisos: string[];
}

const num = (s: unknown): number | null => {
  if (typeof s !== "string" || !s.trim()) return null;
  const n = Number(s.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const txt = (s: unknown): string => (typeof s === "string" ? s.trim() : "");

// Coordenadas dentro de España (las mismas cotas que la tabla). El Ministerio publica alguna estación con 0,0.
const enEspana = (lat: number, lon: number) => lat >= 27 && lat <= 44.5 && lon >= -18.5 && lon <= 4.5;

// "17/10/2026 21:54:46" en hora peninsular -> ISO UTC.
export function fechaFuenteAIso(fecha: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(fecha.trim());
  if (!m) throw new Error(`Fecha de la fuente con formato inesperado: ${fecha}`);
  const [d, mo, y, h, mi, s] = m.slice(1).map(Number);
  // Offset de Europe/Madrid para ese instante (CET/CEST).
  const comoUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  const enMadrid = new Date(new Date(comoUtc).toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const enUtc = new Date(new Date(comoUtc).toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(comoUtc - (enMadrid.getTime() - enUtc.getTime())).toISOString();
}

/**
 * Valida y normaliza. Lanza error (y entonces no se sustituye nada) si: la provincia no es de las cuatro,
 * ResultadoConsulta no es OK, falta la lista, llegan menos estaciones que el mínimo o la fecha no se entiende.
 * Las estaciones de otra provincia, sin IDEESS, duplicadas o sin coordenadas válidas (fuera de España, p. ej. 0,0) se
 * descartan con aviso: una estación mal publicada no tumba la provincia.
 */
export function normalizar(json: unknown, provincia: string, minimo = PROVINCIAS[provincia]?.minimo): Normalizado {
  if (!PROVINCIAS[provincia] || minimo === undefined) throw new Error(`Provincia no admitida: ${provincia}`);
  const raiz = json as Record<string, unknown>;
  if (!raiz || raiz.ResultadoConsulta !== "OK") {
    throw new Error(`ResultadoConsulta distinto de OK: ${String(raiz?.ResultadoConsulta)}`);
  }
  const lista = raiz.ListaEESSPrecio;
  if (!Array.isArray(lista)) throw new Error("Falta ListaEESSPrecio");
  const fechaFuente = fechaFuenteAIso(txt(raiz.Fecha));

  const estaciones: Estacion[] = [];
  const precios: Precio[] = [];
  const avisos = new Set<string>();
  const vistos = new Set<string>();
  for (const e of lista as Record<string, unknown>[]) {
    const ideess = txt(e?.["IDEESS"]);
    const lat = num(e?.["Latitud"]);
    const lon = num(e?.["Longitud (WGS84)"]);
    if (!ideess || vistos.has(ideess)) { avisos.add(`Estación sin IDEESS o duplicada descartada (${ideess || "vacío"})`); continue; }
    if (txt(e["IDProvincia"]) !== provincia) { avisos.add(`Estación ${ideess} de otra provincia descartada`); continue; }
    if (lat === null || lon === null || !enEspana(lat, lon)) { avisos.add(`Estación ${ideess} sin coordenadas válidas descartada`); continue; }
    vistos.add(ideess);
    const horario = txt(e["Horario"]);
    estaciones.push({
      ideess,
      rotulo: txt(e["Rótulo"]),
      direccion: txt(e["Dirección"]),
      municipio: txt(e["Municipio"]),
      id_municipio: txt(e["IDMunicipio"]),
      provincia: txt(e["Provincia"]),
      id_provincia: provincia,
      lat,
      lon,
      horario_texto: horario,
      abierta_24h: clasificarHorario(horario),
    });
    for (const [campo, valor] of Object.entries(e)) {
      if (!campo.startsWith("Precio ")) continue;
      const codigo = COMBUSTIBLES[campo];
      if (!codigo) { avisos.add(`Campo de precio no mapeado: "${campo}"`); continue; }
      const precio = num(valor);
      if (precio === null) continue;
      // Límite amplio: el hidrógeno y los gases se publican por kg.
      if (precio <= 0 || precio >= 100) { avisos.add(`Precio fuera de rango descartado: ${ideess} ${codigo} ${valor}`); continue; }
      precios.push({ ideess, combustible: codigo, precio });
    }
  }
  if (estaciones.length < minimo) {
    throw new Error(`Respuesta incompleta: ${estaciones.length} estaciones válidas (< ${minimo})`);
  }
  return { provincia, fechaFuente, estaciones, precios, avisos: [...avisos].slice(0, 20) };
}

/**
 * Regla de sustitución por provincia (la aplica taxi_gasolineras_sustituir en la base, con bloqueo por provincia).
 * Solo una captura válida puede sustituir a la anterior; si su contenido es igual al de la última buena, no se
 * recarga nada (se anota como «duplicada»).
 */
export function decidir(valida: boolean, huella: string | null, huellaAnterior: string | null): "sustituir" | "duplicada" | "conservar" {
  if (!valida || !huella) return "conservar";
  return huella === huellaAnterior ? "duplicada" : "sustituir";
}

/** Huella del contenido (sin la fecha, que el Ministerio pone en cada petición). */
export async function huellaDe(n: Pick<Normalizado, "estaciones" | "precios">): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([n.estaciones, n.precios])));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
