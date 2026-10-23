// Gasolineras: datos y enlaces sin DOM (se prueban con node assets/gasolineras.test.js).
// Los precios los da la función pública gasol-buscar (la misma de Gasol-IA); aquí solo se arma la
// consulta y se leen sus filas. Sin ubicación del usuario: se busca por provincia y municipio.

/** Ciudades del listado: provincia y municipio con los códigos de gasol-buscar (?listado=territorios). */
export const CIUDADES = {
  Madrid: { provincia: "28", municipio: "4354" },
  Barcelona: { provincia: "08", municipio: "881" },
  Sevilla: { provincia: "41", municipio: "6148" },
  Valencia: { provincia: "46", municipio: "7214" },
};

/** Los combustibles que admite gasol-buscar, con su nombre (los de Gasol-IA). */
export const COMBUSTIBLES = [
  ["gasoleo_a", "Gasóleo A"],
  ["gasoleo_premium", "Gasóleo Premium"],
  ["diesel_renovable", "Diésel renovable"],
  ["gasolina_95_e5", "Gasolina 95 E5"],
  ["gasolina_98_e5", "Gasolina 98 E5"],
  ["glp", "GLP (autogás)"],
  ["gnc", "GNC (gas natural comprimido)"],
  ["gnl", "GNL (gas natural licuado)"],
  ["biogas_comprimido", "Biogás comprimido"],
  ["biogas_licuado", "Biogás licuado"],
  ["adblue", "AdBlue"],
];
/** El Ministerio publica los gases en €/kg; el resto, en €/l. */
const EN_KG = new Set(["gnc", "gnl", "biogas_comprimido", "biogas_licuado"]);
export const porUnidad = (c) => (EN_KG.has(c) ? "por kg" : "por litro");

export const LIMITE = 30;
export const ATRIBUCION = "Origen de los datos: Ministerio para la Transición Ecológica y el Reto Demográfico";

/** Consulta de gasol-buscar: las LIMITE más baratas del municipio (el servidor ya las ordena por precio). */
export function urlBusqueda(api, { combustible, provincia, municipio, solo24 }) {
  const q = new URLSearchParams({ combustible, provincia, municipio, limite: String(LIMITE) });
  if (solo24) q.set("solo24", "1");
  return `${api}/gasol-buscar?${q}`;
}

/** Municipios de una provincia con estaciones, por orden alfabético: [[id, nombre], ...]. */
export function municipiosDe(territorios, provincia) {
  return (Array.isArray(territorios) ? territorios : [])
    .filter((t) => t && t.id_provincia === provincia && /^\d{1,6}$/.test(String(t.id_municipio)) && t.municipio)
    .map((t) => [String(t.id_municipio), String(t.municipio)])
    .sort((a, b) => a[1].localeCompare(b[1], "es"));
}

/** Filas válidas: precio > 0 y fecha de captura legible (nada estimado), de menor a mayor precio. */
export function filasValidas(filas) {
  return (Array.isArray(filas) ? filas : [])
    .filter((f) => f && Number(f.precio) > 0 && f.fecha_captura && !Number.isNaN(Date.parse(f.fecha_captura)))
    .sort((a, b) => Number(a.precio) - Number(b.precio));
}

const enEspana = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && lat >= 27 && lat <= 44.5 && lon >= -18.5 && lon <= 4.5;

/** «Cómo llegar» con Google Maps o Waze: solo el destino (las coordenadas de la gasolinera); el origen lo pone el móvil. */
export function enlacesLlegar(f) {
  const lat = Number(f?.lat), lon = Number(f?.lon);
  if (!enEspana(lat, lon)) return null;
  const c = `${lat},${lon}`;
  return {
    maps: `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: c, travelmode: "driving" })}`,
    waze: `https://waze.com/ul?ll=${encodeURIComponent(c)}&navigate=yes`,
  };
}

/** Enlace a la fuente solo si es https y del servicio del Ministerio. */
export function fuenteSegura(u) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" && /(^|\.)minetur\.gob\.es$/.test(x.hostname) ? x.href : null;
  } catch { return null; }
}

/** Horas enteras desde la captura (para avisar si los datos son de hace más de un día). */
export const horasDesde = (iso, ahora = Date.now()) => Math.floor((ahora - Date.parse(iso)) / 3600000);
