/* Cálculos puros de Taxi-IA (módulo ES, sin DOM). Ninguna cifra viene de fábrica: tarifas, porcentajes y gastos los pone el usuario. */
const C = {};
{
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
    if (base < 0) base = 0; // con pérdidas no hay base de reparto: el asalariado nunca sale en negativo
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


  /* Gastos del coche: total y desglose por categoría. */
  C.resumenGastos = function (lista) {
    var r = { n: 0, total: 0, porCategoria: {} };
    lista.forEach(function (g) { r.n++; r.total += num(g.importe); var k = g.categoria || "otros"; r.porCategoria[k] = (r.porCategoria[k] || 0) + num(g.importe); });
    r.total = r2(r.total); Object.keys(r.porCategoria).forEach(function (k) { r.porCategoria[k] = r2(r.porCategoria[k]); });
    return r;
  };
  C.csvGastos = function (lista) {
    var cab = ["fecha", "categoria", "importe", "nota"];
    var filas = lista.slice().sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }).map(function (g) {
      return cab.map(function (k) { return cel(k === "importe" ? String(g[k] == null ? "" : g[k]).replace(".", ",") : g[k]); }).join(";");
    });
    return "\ufeff" + cab.join(";") + "\n" + filas.join("\n");
  };

  /* Mantenimiento por km: cuántos km quedan para el siguiente cambio (lo pone el usuario: cada cuántos km y en qué km se hizo). */
  C.estadoMantenimiento = function (m, kmActual) {
    var cada = num(m.cadaKm), ult = m.ultimoKm === "" || m.ultimoKm == null ? null : num(m.ultimoKm), act = kmActual === "" || kmActual == null ? null : num(kmActual);
    if (!(cada > 0) || ult == null || act == null) return { estado: "sin", quedan: null };
    var quedan = Math.round(ult + cada - act), aviso = m.avisoKm === "" || m.avisoKm == null ? 1000 : num(m.avisoKm);
    return { estado: quedan < 0 ? "vencido" : quedan <= aviso ? "pronto" : "ok", quedan: quedan };
  };

  /* Estadísticas con las carreras del propio usuario. Lunes = 0. */
  C.diaSemana = function (s) { var d = parse(s); return d ? (d.getUTCDay() + 6) % 7 : null; };
  C.porDiaSemana = function (lista) {
    var r = [0, 1, 2, 3, 4, 5, 6].map(function () { return { n: 0, total: 0 }; });
    lista.forEach(function (c) { var i = C.diaSemana(c.fecha); if (i == null) return; r[i].n++; r[i].total += num(c.importe); });
    return r.map(function (x) { return { n: x.n, total: r2(x.total), medio: x.n ? r2(x.total / x.n) : null }; });
  };
  var FR = [[0, 6, "00:00–06:00"], [6, 12, "06:00–12:00"], [12, 18, "12:00–18:00"], [18, 24, "18:00–24:00"]];
  C.franjas = FR.map(function (f) { return f[2]; });
  C.porFranja = function (lista) {
    var r = FR.map(function () { return { n: 0, total: 0 }; }), sinHora = 0;
    lista.forEach(function (c) {
      var m = /^(\d{1,2}):/.exec(c.hora || ""); if (!m) { sinHora++; return; }
      var hh = +m[1]; for (var i = 0; i < FR.length; i++) if (hh >= FR[i][0] && hh < FR[i][1]) { r[i].n++; r[i].total += num(c.importe); break; }
    });
    return { franjas: r.map(function (x) { return { n: x.n, total: r2(x.total), medio: x.n ? r2(x.total / x.n) : null }; }), sinHora: sinHora };
  };
  /* GPS: distancia en metros entre dos puntos {lat, lon} (haversine). */
  C.distanciaM = function (a, b) {
    var R = 6371000, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  /* GPS: suma un punto {lat, lon, prec, t(ms)} al recorrido est {puntos:[[lat,lon,t]], metros}. Descarta lecturas
     poco precisas (>40 m), ruido (<8 m) y saltos imposibles (>70 m/s). Devuelve true si el punto entra. */
  C.sumarPunto = function (est, p) {
    if (!isFinite(p.lat) || !isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) return false;
    if (num(p.prec) > 40) return false;
    var n = est.puntos.length;
    if (n === 0) { est.puntos.push([r5(p.lat), r5(p.lon), p.t]); return true; }
    var u = est.puntos[n - 1], d = C.distanciaM({ lat: u[0], lon: u[1] }, p);
    if (d < 8) return false;
    var dt = (p.t - u[2]) / 1000;
    if (dt > 0 && d / dt > 70) return false;
    est.metros += d; est.puntos.push([r5(p.lat), r5(p.lon), p.t]); return true;
  };
  var r5 = function (n) { return Math.round(n * 1e5) / 1e5; };

  /** Carreras y total por hora del día (0-23). Las carreras sin hora no entran. */
  C.porHora = function (lista) {
    var r = []; for (var i = 0; i < 24; i++) r.push({ n: 0, total: 0 });
    lista.forEach(function (c) {
      var m = /^(\d{1,2}):/.exec(c.hora || ""); if (!m || +m[1] > 23) return;
      r[+m[1]].n++; r[+m[1]].total += num(c.importe);
    });
    return r.map(function (x) { return { n: x.n, total: r2(x.total) }; });
  };

}
export default C;
