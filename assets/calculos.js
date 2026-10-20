/* Cálculos puros de Taxi-IA. Ninguna cifra viene de fábrica: tarifas, porcentajes y gastos los pone el usuario. */
(function (raiz) {
  "use strict";
  var C = {};
  var num = function (v) { var n = Number(String(v == null ? "" : v).replace(",", ".")); return isFinite(n) ? n : 0; };
  var r2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  C.num = num; C.r2 = r2;

  /* Importe de una carrera con la tarifa que escribe el usuario. */
  C.importeCarrera = function (t, km, min) {
    var bruto = num(t.bajada) + num(km) * num(t.porKm) + num(min) * num(t.porMinuto) + num(t.suplemento);
    return r2(Math.max(bruto, num(t.minimo)));
  };

  /* Beneficio de un turno: recaudación menos los gastos que anota el usuario. */
  C.beneficioTurno = function (d) {
    var gastos = num(d.combustible) + num(d.peajes) + num(d.otros) + num(d.alquiler);
    var neto = num(d.recaudacion) - gastos;
    var km = num(d.km), horas = num(d.horas);
    return {
      gastos: r2(gastos), neto: r2(neto),
      porKm: km > 0 ? r2(neto / km) : null,
      porHora: horas > 0 ? r2(neto / horas) : null,
      ingresoPorKm: km > 0 ? r2(num(d.recaudacion) / km) : null,
    };
  };

  /* Reparto titular / asalariado según el porcentaje pactado (lo pone el usuario). */
  C.reparto = function (d) {
    var base = d.base === "neto" ? num(d.recaudacion) - num(d.gastos) : num(d.recaudacion);
    var pct = Math.min(100, Math.max(0, num(d.porcentaje)));
    var asalariado = r2(base * pct / 100);
    return { base: r2(base), asalariado: asalariado, titular: r2(num(d.recaudacion) - num(d.gastos) - asalariado) };
  };

  /* Objetivo de ingresos: cuánto hay que hacer por día y cuántas carreras, con el importe medio que indique el usuario. */
  C.objetivo = function (d) {
    var dias = num(d.dias), obj = num(d.objetivoMes), medio = num(d.importeMedio);
    var porDia = dias > 0 ? obj / dias : null;
    return { porDia: porDia == null ? null : r2(porDia), carrerasDia: porDia != null && medio > 0 ? Math.ceil(porDia / medio) : null };
  };

  /* Coste por km propio a partir de gastos y km del periodo. */
  C.costeKm = function (d) {
    var g = num(d.gastos), km = num(d.km);
    return km > 0 ? r2(g / km) : null;
  };

  /* Fechas: se trabaja siempre con texto AAAA-MM-DD. */
  var parse = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
  var fmt = function (d) { return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2); };
  C.hoy = function () { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
  C.sumarMeses = function (s, meses) {
    var d = parse(s); if (!d) return null;
    var dia = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + Math.round(num(meses)));
    var ult = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(dia, ult)); return fmt(d);
  };
  C.diasHasta = function (fecha, hoy) {
    var a = parse(fecha), b = parse(hoy || C.hoy()); if (!a || !b) return null;
    return Math.round((a - b) / 86400000);
  };
  /* Estado de un vencimiento: vencido / pronto (dentro del aviso) / ok / sin fecha. */
  C.estadoVencimiento = function (v, hoy) {
    var fecha = v.fecha || (v.ultima && v.cadaMeses ? C.sumarMeses(v.ultima, v.cadaMeses) : null);
    if (!fecha) return { estado: "sin", fecha: null, dias: null };
    var d = C.diasHasta(fecha, hoy), aviso = v.aviso == null || v.aviso === "" ? 30 : num(v.aviso);
    return { estado: d < 0 ? "vencido" : d <= aviso ? "pronto" : "ok", fecha: fecha, dias: d };
  };

  /* Resumen de carreras de una lista (ya filtrada por el periodo). */
  C.resumen = function (lista) {
    var r = { n: 0, total: 0, km: 0, porMetodo: {} };
    lista.forEach(function (c) {
      r.n++; r.total += num(c.importe); r.km += num(c.km);
      var m = c.metodo || "otro"; r.porMetodo[m] = (r.porMetodo[m] || 0) + num(c.importe);
    });
    r.total = r2(r.total); r.km = r2(r.km);
    Object.keys(r.porMetodo).forEach(function (k) { r.porMetodo[k] = r2(r.porMetodo[k]); });
    r.medio = r.n ? r2(r.total / r.n) : null;
    r.porKm = r.km > 0 ? r2(r.total / r.km) : null;
    return r;
  };
  C.enPeriodo = function (lista, desde, hasta) {
    return lista.filter(function (c) { return (!desde || c.fecha >= desde) && (!hasta || c.fecha <= hasta); });
  };
  C.inicioSemana = function (s) { var d = parse(s); var wd = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - wd); return fmt(d); };
  C.inicioMes = function (s) { return s.slice(0, 8) + "01"; };

  /* CSV para el gestor (separador ; y coma decimal, como lo abre Excel en España). */
  var cel = function (v) { var t = String(v == null ? "" : v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  C.csv = function (lista) {
    var cab = ["fecha", "hora", "importe", "metodo", "km", "origen", "destino", "nota"];
    var filas = lista.slice().sort(function (a, b) { return (a.fecha + (a.hora || "")) < (b.fecha + (b.hora || "")) ? -1 : 1; }).map(function (c) {
      return cab.map(function (k) { return cel(k === "importe" || k === "km" ? String(c[k] == null ? "" : c[k]).replace(".", ",") : c[k]); }).join(";");
    });
    return "﻿" + cab.join(";") + "\n" + filas.join("\n");
  };

  if (typeof module !== "undefined" && module.exports) module.exports = C; else raiz.Calculos = C;
})(typeof window !== "undefined" ? window : this);
