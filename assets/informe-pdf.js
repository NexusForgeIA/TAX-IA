// PDF de facturación por rangos: rangos de fechas (calendario de Madrid), resumen de las carreras del usuario y
// maquetación con pdf.js (A4, paginación automática). Solo sus datos: sin porcentajes ni estimaciones.
// Módulo sin DOM: lo usa informe.js y lo prueba pdf.test.js.
import { diasDelMes, esFechaISO, fechaCorta, sumarDias, sumarMeses } from "./fechas.js";
import { euros, redondear } from "./numeros.js";
import { lunesDe } from "./semana.js";
import { A4, nuevoPdf, partir } from "./pdf.js";

export const RANGOS = { hoy: "Hoy", semana: "Esta semana", mes: "Este mes", "mes-anterior": "Mes anterior", personalizado: "Personalizado" };
export const PIE = "Informe informativo generado con Taxi-IA a partir de los datos introducidos por el conductor. No sustituye a la factura ni a ningún documento fiscal.";

const finDeMes = (mes) => `${mes}-${String(diasDelMes(mes)).padStart(2, "0")}`;

/** {desde, hasta} del rango elegido, o {error}. `hoy` es "AAAA-MM-DD" en Madrid. */
export function rangoFechas(tipo, hoy, desde, hasta) {
  if (tipo === "hoy") return { desde: hoy, hasta: hoy };
  if (tipo === "semana") { const l = lunesDe(hoy); return { desde: l, hasta: sumarDias(l, 6) }; }
  if (tipo === "mes") return { desde: `${hoy.slice(0, 7)}-01`, hasta: finDeMes(hoy.slice(0, 7)) };
  if (tipo === "mes-anterior") { const m = sumarMeses(hoy.slice(0, 7), -1); return { desde: `${m}-01`, hasta: finDeMes(m) }; }
  if (tipo === "personalizado") {
    if (!esFechaISO(desde) || !esFechaISO(hasta)) return { error: "Elige las dos fechas, desde y hasta." };
    if (desde > hasta) return { error: "La fecha «desde» tiene que ser anterior o igual a «hasta»." };
    return { desde, hasta };
  }
  return { error: "Elige un rango." };
}

const METODO = { efectivo: "Efectivo", tarjeta: "Tarjeta", app: "Cobrado por la app" };
const CANAL = { calle: "Calle", app: "Aplicación" };

function agrupar(lista, clave) {
  const m = new Map();
  for (const c of lista) {
    const k = clave(c);
    const g = m.get(k) ?? { nombre: k, importe: 0, carreras: 0 };
    g.importe += c.importe;
    if (c.hora != null) g.carreras++;
    m.set(k, g);
  }
  return [...m.values()].map((g) => ({ ...g, importe: redondear(g.importe) }));
}

/**
 * Resumen de las carreras entre desde y hasta (incluidos). Los totales sin detallar (hora null) suman en € pero
 * no cuentan como carrera.
 */
export function resumenRango(carreras, desde, hasta) {
  const lista = carreras.filter((c) => c && typeof c.fecha === "string" && c.fecha >= desde && c.fecha <= hasta && Number.isFinite(c.importe));
  const total = redondear(lista.reduce((s, c) => s + c.importe, 0));
  const nCarreras = lista.filter((c) => c.hora != null).length;
  const orden = (a, b) => b.importe - a.importe || a.nombre.localeCompare(b.nombre, "es");
  return {
    desde, hasta, total, carreras: nCarreras, sinDetalle: lista.length - nCarreras, lineas: lista.length,
    porCanal: agrupar(lista, (c) => CANAL[c.canal] ?? c.canal).sort(orden),
    porMetodo: agrupar(lista, (c) => METODO[c.metodo] ?? c.metodo).sort(orden),
    porApp: agrupar(lista.filter((c) => c.canal === "app" && c.app), (c) => c.app).sort(orden),
    dias: agrupar(lista, (c) => c.fecha).map((d) => ({ fecha: d.nombre, carreras: d.carreras, importe: d.importe })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
  };
}

/** Gastos del rango: repostajes y otros gastos del coche que apunta el usuario. */
export function gastosRango(repostajes, otros, desde, hasta) {
  const en = (l) => l.filter((x) => x && x.fecha >= desde && x.fecha <= hasta && Number.isFinite(x.importe));
  const combustible = redondear(en(repostajes).reduce((s, r) => s + r.importe, 0));
  const otrosGastos = redondear(en(otros).reduce((s, o) => s + o.importe, 0));
  return { combustible, otros: otrosGastos, total: redondear(combustible + otrosGastos) };
}

export const nombreArchivo = (desde, hasta) => `taxi-ia-facturacion-${desde}_${hasta}.pdf`;
export const textoRango = (desde, hasta) => (desde === hasta ? `Día ${fechaCorta(desde)}` : `Del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`);

const e = (x) => `${euros(x)} €`;
const M = 50; // margen
const DER = A4.ancho - M;
const ABAJO = 80; // por encima del pie

/**
 * PDF del resumen. perfil: {nombre, licencia, matricula} (los vacíos no salen); gastos: gastosRango(...) o null
 * si el usuario no marca «Incluir gastos»; generado: texto con la fecha y hora de generación.
 */
export function componerPdf({ resumen: r, perfil = {}, gastos = null, generado }) {
  const doc = nuevoPdf({ titulo: `Resumen de facturación · ${textoRango(r.desde, r.hasta)}` });
  let y = 0;
  const nuevaPagina = () => { doc.pagina(); y = A4.alto - M; };
  const hueco = (alto, alSaltar) => { if (y - alto < ABAJO) { nuevaPagina(); alSaltar?.(); } };
  nuevaPagina();

  doc.texto(M, y - 16, "Resumen de facturación", { tam: 20, negrita: true }); y -= 40;
  doc.texto(M, y, textoRango(r.desde, r.hasta), { tam: 12, negrita: true }); y -= 16;
  doc.texto(M, y, `Generado el ${generado}`, { tam: 9, gris: 0.35 }); y -= 14;
  for (const [k, v] of [["Conductor", perfil.nombre], ["Licencia", perfil.licencia], ["Matrícula", perfil.matricula]]) {
    if (v) { doc.texto(M, y, `${k}: ${v}`, { tam: 10 }); y -= 14; }
  }
  y -= 6; doc.linea(M, y, DER, y, { grosor: 1 }); y -= 28;

  doc.texto(M, y, "Total facturado", { tam: 13, negrita: true });
  doc.texto(DER, y, e(r.total), { tam: 18, negrita: true, alinear: "der" }); y -= 18;
  const detalle = `${r.carreras} ${r.carreras === 1 ? "carrera" : "carreras"}${r.sinDetalle ? ` y ${r.sinDetalle} ${r.sinDetalle === 1 ? "total" : "totales"} sin detallar (suman al total, no cuentan como carrera)` : ""}`;
  for (const l of partir(detalle, 9, DER - M)) { doc.texto(M, y, l, { tam: 9, gris: 0.35 }); y -= 12; }
  y -= 12;

  const COL_N = DER - 110;
  const tablaGrupo = (titulo, filas) => {
    if (!filas.length) return;
    hueco(40 + filas.length * 16);
    doc.texto(M, y, titulo, { tam: 12, negrita: true });
    doc.texto(COL_N, y, "Carreras", { tam: 9, gris: 0.35, alinear: "der" });
    doc.texto(DER, y, "Importe", { tam: 9, gris: 0.35, alinear: "der" }); y -= 6;
    doc.linea(M, y, DER, y, { gris: 0.6 }); y -= 14;
    for (const f of filas) {
      hueco(16);
      doc.texto(M, y, f.nombre, { tam: 10 });
      doc.texto(COL_N, y, String(f.carreras), { tam: 10, alinear: "der" });
      doc.texto(DER, y, e(f.importe), { tam: 10, alinear: "der" }); y -= 16;
    }
    y -= 10;
  };
  tablaGrupo("Por canal", r.porCanal);
  tablaGrupo("Por forma de pago", r.porMetodo);
  tablaGrupo("Por aplicación", r.porApp);

  if (gastos) {
    const filas = [["Combustible", gastos.combustible], ["Otros gastos del coche", gastos.otros], ["Total gastos", gastos.total, true], ["Neto (facturación menos gastos)", redondear(r.total - gastos.total), true]];
    hueco(40 + filas.length * 16);
    doc.texto(M, y, "Gastos del rango", { tam: 12, negrita: true }); y -= 6;
    doc.linea(M, y, DER, y, { gris: 0.6 }); y -= 14;
    for (const [k, v, fuerte] of filas) {
      doc.texto(M, y, k, { tam: 10, negrita: !!fuerte });
      doc.texto(DER, y, e(v), { tam: 10, negrita: !!fuerte, alinear: "der" }); y -= 16;
    }
    y -= 10;
  }

  // Tabla por día; la cabecera se repite en cada página.
  const cabeceraDias = () => {
    doc.rect(M, y - 5, DER - M, 18, { gris: 0.9 });
    doc.texto(M + 6, y, "Fecha", { tam: 9, negrita: true });
    doc.texto(COL_N, y, "Carreras", { tam: 9, negrita: true, alinear: "der" });
    doc.texto(DER - 6, y, "Importe", { tam: 9, negrita: true, alinear: "der" }); y -= 20;
  };
  hueco(60);
  doc.texto(M, y, "Por día", { tam: 12, negrita: true }); y -= 20;
  cabeceraDias();
  for (const d of r.dias) {
    hueco(16, cabeceraDias);
    doc.texto(M + 6, y, fechaCorta(d.fecha), { tam: 10 });
    doc.texto(COL_N, y, String(d.carreras), { tam: 10, alinear: "der" });
    doc.texto(DER - 6, y, e(d.importe), { tam: 10, alinear: "der" }); y -= 16;
  }
  hueco(20, cabeceraDias);
  doc.linea(M, y + 10, DER, y + 10, { gris: 0.6 });
  doc.texto(M + 6, y - 2, "Total", { tam: 10, negrita: true });
  doc.texto(COL_N, y - 2, String(r.carreras), { tam: 10, negrita: true, alinear: "der" });
  doc.texto(DER - 6, y - 2, e(r.total), { tam: 10, negrita: true, alinear: "der" });

  // Pie en todas las páginas, con «Página i de n».
  const lineasPie = partir(PIE, 8, DER - M - 70);
  const n = doc.paginas.length;
  for (let i = 0; i < n; i++) {
    doc.en(i).linea(M, 62, DER, 62, { gris: 0.75 });
    lineasPie.forEach((l, j) => doc.texto(M, 50 - j * 10, l, { tam: 8, gris: 0.35 }));
    doc.texto(DER, 50, `Página ${i + 1} de ${n}`, { tam: 8, gris: 0.35, alinear: "der" });
  }
  return doc.bytes();
}
