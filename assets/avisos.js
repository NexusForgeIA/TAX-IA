// Taxi-IA · avisos municipales que apunta el usuario (revista, cambios de normativa, cortes, paradas…).
// No hay avisos automáticos: cada ayuntamiento publica de forma distinta y no se afirma ninguna fuente.
import "./nav.js";
import { $, el } from "./util.js";
import { guardarJson, leerJson, nuevoId } from "./datos.js";
import { esFechaISO, fechaCorta } from "./fechas.js";

const CLAVE = "taxi.avisos";
const form = $("f-aviso");
let lista = leerJson(CLAVE, []);
if (!Array.isArray(lista)) lista = [];
lista = lista.filter((a) => a && typeof a.id === "string" && typeof a.titulo === "string");
let ultimoBorrado = null;

/** Solo enlaces http(s): cualquier otro esquema (javascript:, data:…) se descarta. */
function enlaceSeguro(u) {
  try { const x = new URL(u); return x.protocol === "https:" || x.protocol === "http:" ? x.href : null; } catch { return null; }
}
const guardar = () => guardarJson(CLAVE, lista);

function pintar() {
  $("vacio").hidden = lista.length > 0;
  $("lista").replaceChildren(...lista.slice().sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).map((a) => {
    const botones = el("div", { class: "botones" });
    const u = a.url && enlaceSeguro(a.url);
    if (u) botones.append(el("a", { class: "boton-sec", href: u, target: "_blank", rel: "noopener noreferrer", text: "Abrir enlace", "aria-label": `Abrir el enlace de «${a.titulo}»` }));
    const b = el("button", { type: "button", class: "boton-peligro", text: "Borrar", "aria-label": `Borrar el aviso «${a.titulo}»` });
    b.addEventListener("click", () => {
      lista = lista.filter((q) => q.id !== a.id);
      ultimoBorrado = a;
      guardar();
      pintar();
      const des = el("button", { type: "button", class: "boton-sec", text: "Deshacer" });
      des.addEventListener("click", () => { if (ultimoBorrado) { lista.push(ultimoBorrado); ultimoBorrado = null; guardar(); $("estado-lista").textContent = "Aviso recuperado."; pintar(); } });
      $("estado-lista").replaceChildren(document.createTextNode(`Borrado «${a.titulo}». `), des);
    });
    botones.append(b);
    return el("li", { class: "ruta-guardada" }, el("strong", { text: a.titulo }),
      a.fecha ? el("span", { class: "detalle", text: fechaCorta(a.fecha) }) : null,
      a.texto ? el("span", { class: "detalle", text: a.texto }) : null, botones);
  }));
}

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const est = $("estado-form");
  const fallo = (t, c) => { est.textContent = t; est.classList.add("error"); form[c].focus(); };
  const titulo = form.titulo.value.trim().replace(/\s+/g, " ");
  if (!titulo) return fallo("Escribe un título.", "titulo");
  if (titulo.length > 80) return fallo("El título admite hasta 80 caracteres.", "titulo");
  if (form.fecha.value && !esFechaISO(form.fecha.value)) return fallo("La fecha no es válida.", "fecha");
  const url = form.url.value.trim();
  if (url && !enlaceSeguro(url)) return fallo("El enlace debe empezar por https:// o http://.", "url");
  const texto = form.texto.value.trim().slice(0, 300);
  if (lista.length >= 500) return fallo("Has llegado al máximo de avisos guardados.", "titulo");
  lista.push({ id: nuevoId(), titulo, fecha: form.fecha.value, url, texto });
  if (!guardar()) { lista.pop(); return fallo("No se pudo guardar en este navegador.", "titulo"); }
  est.classList.remove("error");
  est.textContent = "Aviso guardado.";
  form.reset();
  pintar();
});

pintar();
