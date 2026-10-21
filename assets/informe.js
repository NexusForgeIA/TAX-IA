// Taxi-IA · informe del mes para guardar como PDF (window.print). Solo datos del usuario, en este navegador:
// carreras (Facturación), repostajes y cuentakilómetros (Gastos) y trayectos GPS. Nada se envía a ningún servidor.
import "./nav.js";
import { $, el, cifras, descargarCSV } from "./util.js";
import { euros } from "./numeros.js";
import { hoyMadrid, nombreMes, fechaCorta, sumarMeses } from "./fechas.js";
import { leerJson } from "./datos.js";
import { CANALES, COLUMNAS, METODOS, leerCarreras, tablaMensual, cruce } from "./ingresos.js";
import { COMBUSTIBLES_GASTO, celdaCSV, etiquetas, leerRegistros, totales, costePorKm } from "./gastos.js";
import { TIPOS, leerOtros, totalOtros } from "./otros-gastos.js";

const e = (n) => `${euros(n)} €`;
const fechaDeMs = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" });
const trayectos = () => { const l = leerJson("taxi.trayectos", []); return Array.isArray(l) ? l.filter((t) => t && Number.isFinite(t.inicio) && Number.isFinite(t.metros)) : []; };
const km1 = (m) => `${euros(m / 1000)} km`;

const hoy = hoyMadrid();
const carreras = leerCarreras(), repostajes = leerRegistros(), otros = leerOtros(), viajes = trayectos();
const meses = new Set([hoy.slice(0, 7)]);
for (const c of carreras) meses.add(c.fecha.slice(0, 7));
for (const r of repostajes) meses.add(r.fecha.slice(0, 7));
for (const o of otros) meses.add(o.fecha.slice(0, 7));
for (const t of viajes) meses.add(fechaDeMs.format(new Date(t.inicio)).slice(0, 7));
const sel = $("mes");
const selVeh = $("vehiculo");
for (const et of etiquetas([...repostajes, ...otros])) selVeh.append(el("option", { value: et, text: et }));
const delVehiculo = (l) => (selVeh.value ? l.filter((x) => x.etiqueta === selVeh.value) : l);
let ultimo = null; // lo último pintado, para el CSV y el resumen que se comparte
for (const m of [...meses].sort().reverse()) sel.append(el("option", { value: m, text: nombreMes(m) }));

function tabla(cabecera, filas, pie) {
  const fila = (celdas, tag = "td") => el("tr", {}, ...celdas.map((c, i) => (i === 0 && tag === "td" ? el("th", { scope: "row", text: c }) : el(tag === "th" ? "th" : "td", tag === "th" ? { scope: "col", text: c } : { text: c }))));
  return el("table", { class: "tabla-calculo" }, el("thead", {}, fila(cabecera, "th")), el("tbody", {}, ...filas.map((f) => fila(f))), pie ? el("tfoot", {}, el("tr", {}, ...pie.map((c) => el("th", { text: c })))) : null);
}

function pintar() {
  const mes = sel.value;
  const t = tablaMensual(carreras, mes);
  const gastos = delVehiculo(repostajes).filter((r) => r.fecha.startsWith(`${mes}-`));
  const otrosMes = delVehiculo(otros).filter((o) => o.fecha.startsWith(`${mes}-`));
  const viajesMes = viajes.filter((v) => fechaDeMs.format(new Date(v.inicio)).startsWith(mes));
  const hay = t.total.lineas || gastos.length || otrosMes.length || viajesMes.length;
  $("vacio").hidden = !!hay;
  $("informe").hidden = !hay;
  for (const id of ["imprimir", "csv", "compartir"]) $(id).disabled = !hay;
  if (!hay) { ultimo = null; return; }

  $("inf-titulo").textContent = `Informe de ${nombreMes(mes)}`;
  $("inf-sub").textContent = `Generado el ${fechaCorta(hoy)} con los datos apuntados en Taxi-IA.${selVeh.value ? ` Gastos del turno o vehículo: ${selVeh.value}.` : ""}`;

  const F = t.total;
  const filasF = [["Total facturado", e(F.total), true], ["Carreras apuntadas", String(F.carreras)], ...COLUMNAS.map(([k, n]) => [n, e(F[k])]), ["Efectivo en mano (calle + app)", e(F.efectivo_en_mano)], ["Cobrado por banco, datáfono o app", e(F.cobrado_banco_app)]];
  const sinDetalle = F.lineas - F.carreras;
  $("fact").replaceChildren(...cifras(filasF).children);
  if (sinDetalle) $("fact").append(el("dt", { text: "Totales sin detallar" }), el("dd", { text: `${sinDetalle} (suman al total, no cuentan como carrera)` }));

  const G = totales(gastos);
  const filasG = [["Repostajes", String(G.repostajes)], ["Litros", euros(G.litros)], ["Importe pagado", e(G.importe), true]];
  if (G.precio_medio != null) filasG.push(["Precio medio pagado", `${euros(G.precio_medio, 3)} €/l`]);
  const O = totalOtros(otrosMes);
  if (O.n) filasG.push(["Otros gastos del coche", e(O.total)]);
  if (F.total > 0 || G.importe > 0 || O.n) filasG.push([O.n ? "Facturación menos combustible y otros gastos" : "Facturación menos combustible", e(cruce(F.total, G.importe + O.total, 0).menos_combustible), true]);
  $("gas").replaceChildren(...cifras(filasG).children);

  const cp = costePorKm(gastos);
  const filasK = [];
  if (cp) {
    filasK.push(["Recorridos según cuentakilómetros", `${euros(cp.km, 0)} km`]);
    filasK.push(["Coste de combustible por km", `${euros(cp.coste_km, 3)} €/km`]);
  }
  if (viajesMes.length) filasK.push([`Trayectos con GPS (${viajesMes.length})`, km1(viajesMes.reduce((s, v) => s + v.metros, 0))]);
  $("km").replaceChildren(...cifras(filasK).children);
  $("km-nota").textContent = filasK.length
    ? "Cuentakilómetros: entre la primera y la última lectura apuntadas en repostajes del mes. GPS: estimación, solo de los trayectos grabados."
    : "Sin lecturas de cuentakilómetros (hacen falta dos repostajes con km) ni trayectos GPS este mes.";

  const ant = sumarMeses(mes, -1);
  const tAnt = tablaMensual(carreras, ant).total;
  const gAnt = totales(delVehiculo(repostajes).filter((r) => r.fecha.startsWith(`${ant}-`))).importe;
  const oAnt = totalOtros(delVehiculo(otros).filter((o) => o.fecha.startsWith(`${ant}-`))).total;
  const dif = (a, b) => `${b - a > 0 ? "+" : ""}${e(Math.round((b - a) * 100) / 100)}`;
  const gastoAnt = Math.round((gAnt + oAnt) * 100) / 100, gastoMes = Math.round((G.importe + O.total) * 100) / 100;
  $("comparar").replaceChildren(tAnt.lineas || gastoAnt ? tabla([" ", nombreMes(ant), nombreMes(mes), "Diferencia"], [
    ["Facturado", e(tAnt.total), e(F.total), dif(tAnt.total, F.total)],
    ["Carreras apuntadas", String(tAnt.carreras), String(F.carreras), `${F.carreras - tAnt.carreras > 0 ? "+" : ""}${F.carreras - tAnt.carreras}`],
    ["Gastos (combustible y otros)", e(gastoAnt), e(gastoMes), dif(gastoAnt, gastoMes)],
  ]) : el("p", { class: "nota", text: "No hay datos del mes anterior para comparar." }));

  const dias = t.dias.filter((d) => d.lineas);
  $("dias").replaceChildren(dias.length ? tabla(["Día", "Carreras", "Calle efectivo", "Calle tarjeta", "App cobrado", "App efectivo", "Total"],
    dias.map((d) => [fechaCorta(d.fecha), String(d.carreras), e(d.calle_efectivo), e(d.calle_tarjeta), e(d.app_cobrado), e(d.app_efectivo), e(d.total)]),
    ["Mes", String(F.carreras), e(F.calle_efectivo), e(F.calle_tarjeta), e(F.app_cobrado), e(F.app_efectivo), e(F.total)]) : el("p", { class: "nota", text: "Sin facturación apuntada este mes." }));

  $("otros").replaceChildren(O.n ? tabla(["Fecha", "Tipo", "Nota", "Importe"],
    [...otrosMes].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((o) => [fechaCorta(o.fecha), TIPOS[o.tipo], o.nota || "—", e(o.importe)]),
    ["Total", "", "", e(O.total)]) : el("p", { class: "nota", text: "Sin otros gastos apuntados este mes." }));

  $("repostajes").replaceChildren(gastos.length ? tabla(["Fecha", "Combustible", "Litros", "Importe", "Cuentakm"],
    [...gastos].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((r) => [fechaCorta(r.fecha), COMBUSTIBLES_GASTO[r.combustible], euros(r.litros), e(r.importe), r.km == null ? "—" : euros(r.km, 0)]),
    ["Total", "", euros(G.litros), e(G.importe), ""]) : el("p", { class: "nota", text: "Sin repostajes apuntados este mes." }));
  const gastoTotal = Math.round((G.importe + O.total) * 100) / 100;
  ultimo = {
    mes, t, gastos, otrosMes, viajesMes,
    texto: [`Informe de ${nombreMes(mes)} · Taxi-IA`,
      `Facturado: ${e(F.total)} (${F.carreras} carreras)`,
      `Efectivo en mano: ${e(F.efectivo_en_mano)} · Datáfono, banco o app: ${e(F.cobrado_banco_app)}`,
      `Combustible: ${e(G.importe)}${O.n ? ` · Otros gastos: ${e(O.total)}` : ""}`,
      `Facturación menos gastos: ${e(Math.round((F.total - gastoTotal) * 100) / 100)}`,
      cp ? `Km según cuentakilómetros: ${euros(cp.km, 0)}` : null,
      "Informativo, hecho con mis datos; no es una factura.",
    ].filter(Boolean).join("\n"),
  };
}

sel.addEventListener("change", pintar);
$("imprimir").addEventListener("click", () => window.print());
selVeh.addEventListener("change", pintar);
const aviso = (t) => { $("estado-informe").textContent = t; };

$("csv").addEventListener("click", () => {
  if (!ultimo) return;
  const hora = (c) => c.hora ?? "total sin detallar";
  const filas = [["tipo", "fecha", "hora", "detalle", "litros", "importe_eur", "cuentakm", "turno_o_vehiculo"]];
  const coma = (n) => (n == null ? "" : n.toFixed(2).replace(".", ","));
  for (const d of ultimo.t.dias) for (const c of d.lista) filas.push(["carrera", c.fecha, hora(c), [CANALES[c.canal], c.app, METODOS[c.canal][c.metodo], c.nota].filter(Boolean).join(" · "), "", coma(c.importe), "", ""]);
  for (const r of ultimo.gastos) filas.push(["repostaje", r.fecha, "", COMBUSTIBLES_GASTO[r.combustible], coma(r.litros), coma(r.importe), r.km ?? "", r.etiqueta]);
  for (const o of ultimo.otrosMes) filas.push(["otro gasto", o.fecha, "", [TIPOS[o.tipo], o.nota].filter(Boolean).join(" · "), "", coma(o.importe), "", o.etiqueta]);
  descargarCSV(`taxi-informe-${ultimo.mes}.csv`, filas.map((f) => f.map(celdaCSV).join(";")).join("\r\n") + "\r\n");
  aviso("CSV descargado.");
});

$("compartir").addEventListener("click", async () => {
  if (!ultimo) return;
  try {
    if (navigator.share) { await navigator.share({ title: `Informe de ${nombreMes(ultimo.mes)}`, text: ultimo.texto }); return aviso("Compartido."); }
    await navigator.clipboard.writeText(ultimo.texto);
    aviso("Este navegador no puede compartir directamente: el resumen se ha copiado, pégalo donde quieras.");
  } catch (err) {
    if (err?.name !== "AbortError") aviso("No se pudo compartir. Usa «Guardar como PDF» o «Descargar CSV».");
  }
});
pintar();
