// Ayudas de DOM comunes a las páginas de Taxi-IA. Todo texto va con textContent (nada de innerHTML).
export const $ = (id) => document.getElementById(id);

export function el(tag, attrs = {}, ...hijos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const h of hijos) if (h != null && h !== false) n.append(h);
  return n;
}

/** Lista de pares etiqueta/valor (<dl class="cifras">). */
export function cifras(filas) {
  const dl = el("dl", { class: "cifras" });
  for (const [k, v, fuerte] of filas) dl.append(el("dt", { text: k }), el("dd", { class: fuerte ? "fuerte" : "", text: v }));
  return dl;
}

export function error(texto) { return el("p", { class: "error", text: texto }); }

/** Descarga un CSV (con BOM para que Excel respete los acentos). */
export function descargarCSV(nombre, contenido) {
  const blob = new Blob(["﻿", contenido], { type: "text/csv;charset=utf-8" });
  const a = el("a", { href: URL.createObjectURL(blob), download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Registra el service worker (la app funciona sin conexión con lo ya cargado). */
export function registrarSW() {
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
