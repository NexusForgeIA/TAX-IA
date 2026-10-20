// Taxi-IA · mantenimiento por km. Cada cuántos km se hace cada cosa y en qué km se hizo lo pone el usuario.
import "./nav.js";
import { $, el } from "./util.js";
import { leerNumero } from "./numeros.js";
import { guardarJson, leerJson, nuevoId } from "./datos.js";
import C from "./herramientas.js";

const CLAVE = "taxi.mantenimiento";
const CLAVE_KM = "taxi.kmActual";
const fmt = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const form = $("f-mant");
let editando = null;
let lista = leerJson(CLAVE, null);
if (!Array.isArray(lista)) lista = ["Aceite y filtro", "Frenos", "Neumáticos"].map((nombre) => ({ id: nuevoId(), nombre }));
lista = lista.filter((m) => m && typeof m.id === "string" && typeof m.nombre === "string");
let km = leerJson(CLAVE_KM, "");
$("km-actual").value = km === "" ? "" : String(km);

const TXT = { ok: "Al día", pronto: "Pronto", vencido: "Toca ya", sin: "Faltan datos" };
const CLASE = { ok: "ok", pronto: "duda", vencido: "vencido", sin: "" };
const guardar = () => { guardarJson(CLAVE, lista); pintar(); };

function pintar() {
  $("lista").replaceChildren(...lista.map((m) => ({ m, s: C.estadoMantenimiento(m, km) }))
    .sort((a, b) => (a.s.quedan ?? 1e12) - (b.s.quedan ?? 1e12))
    .map(({ m, s }) => {
      const hecho = el("button", { type: "button", class: "boton-sec", text: "Hecho ahora", "aria-label": `Marcar «${m.nombre}» como hecho ahora` });
      hecho.addEventListener("click", () => {
        if (km === "") { $("estado-km").textContent = "Primero guarda los km actuales."; $("estado-km").classList.add("error"); $("km-actual").focus(); return; }
        m.ultimoKm = String(km);
        guardar();
      });
      const ed = el("button", { type: "button", class: "boton-sec", text: "Editar", "aria-label": `Editar «${m.nombre}»` });
      ed.addEventListener("click", () => editar(m));
      const bo = el("button", { type: "button", class: "boton-peligro", text: "Borrar", "aria-label": `Borrar «${m.nombre}»` });
      bo.addEventListener("click", () => { lista = lista.filter((q) => q.id !== m.id); if (editando === m.id) limpiar(); guardar(); });
      const detalle = s.quedan == null
        ? "Pon los km actuales, cada cuántos km se hace y en qué km se hizo."
        : `${s.quedan < 0 ? `Te pasaste ${fmt.format(-s.quedan)} km` : `Quedan ${fmt.format(s.quedan)} km`} · cada ${fmt.format(C.num(m.cadaKm))} km · hecho en ${fmt.format(C.num(m.ultimoKm))}`;
      return el("li", { class: "ruta-guardada" },
        el("strong", { text: m.nombre }), document.createTextNode(" "), el("span", { class: `chip ${CLASE[s.estado]}`, text: TXT[s.estado] }),
        el("span", { class: "detalle", text: detalle }), el("div", { class: "botones" }, hecho, ed, bo));
    }));
}

function editar(m) {
  editando = m.id;
  $("t-form").textContent = `Editar «${m.nombre}»`;
  for (const k of ["nombre", "cadaKm", "ultimoKm", "avisoKm"]) form[k].value = m[k] == null ? "" : String(m[k]);
  $("guardar").textContent = "Guardar cambios";
  $("cancelar").hidden = false;
  form.nombre.focus();
}
function limpiar() {
  editando = null;
  form.reset();
  $("t-form").textContent = "Añadir mantenimiento";
  $("guardar").textContent = "Añadir";
  $("cancelar").hidden = true;
}
$("cancelar").addEventListener("click", limpiar);

$("f-km").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const n = leerNumero($("km-actual").value.replace(/\./g, ""));
  const s = $("estado-km");
  if (!(Number.isFinite(n) && n >= 0 && n <= 9999999)) { s.textContent = "Escribe los km del cuentakilómetros (0 a 9.999.999)."; s.classList.add("error"); return; }
  km = Math.round(n);
  guardarJson(CLAVE_KM, km);
  s.classList.remove("error");
  s.textContent = "Km guardados.";
  pintar();
});

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const est = $("estado-form");
  const nombre = form.nombre.value.trim().replace(/\s+/g, " ").slice(0, 50);
  const cada = leerNumero(form.cadaKm.value.replace(/\./g, ""));
  const ult = form.ultimoKm.value.trim() === "" ? "" : leerNumero(form.ultimoKm.value.replace(/\./g, ""));
  const aviso = form.avisoKm.value.trim() === "" ? "" : leerNumero(form.avisoKm.value.replace(/\./g, ""));
  const fallo = (t, c) => { est.textContent = t; est.classList.add("error"); form[c].focus(); };
  if (!nombre) return fallo("Escribe qué es (p. ej. Aceite y filtro).", "nombre");
  if (!(cada > 0 && cada <= 999999)) return fallo("Escribe cada cuántos km se hace (mayor que 0).", "cadaKm");
  if (ult !== "" && !(ult >= 0 && ult <= 9999999)) return fallo("Los km de la última vez deben ser un número, o déjalo vacío.", "ultimoKm");
  if (aviso !== "" && !(aviso >= 0 && aviso <= 999999)) return fallo("Los km de antelación deben ser un número, o déjalo vacío.", "avisoKm");
  const o = { nombre, cadaKm: cada, ultimoKm: ult, avisoKm: aviso };
  if (editando) lista = lista.map((m) => (m.id === editando ? { id: editando, ...o } : m));
  else {
    if (lista.length >= 100) return fallo("Has llegado al máximo de elementos.", "nombre");
    lista.push({ id: nuevoId(), ...o });
  }
  est.classList.remove("error");
  est.textContent = editando ? "Cambios guardados." : "Añadido.";
  limpiar();
  guardar();
});

pintar();
