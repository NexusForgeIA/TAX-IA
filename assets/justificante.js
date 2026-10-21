// Taxi-IA · justificante informativo de una carrera (window.print / compartir). Solo datos del usuario, en este navegador.
// No es una factura: no calcula IVA ni numera documentos.
import "./nav.js";
import { $, cifras } from "./util.js";
import { euros } from "./numeros.js";
import { fechaLarga } from "./fechas.js";
import { guardarJson, leerJson } from "./datos.js";
import { CANALES, METODOS, leerCarreras } from "./ingresos.js";

const CLAVE_PREF = "taxi.justificante.pref";
const id = new URLSearchParams(location.search).get("id") || "";
const c = leerCarreras().find((x) => x.id === id && x.hora != null);
const form = $("f-just");

if (!c) {
  $("vacio").hidden = false;
} else {
  $("datos").hidden = false;
  $("justificante").hidden = false;
  const pref = leerJson(CLAVE_PREF, {});
  if (typeof pref.conductor === "string") form.conductor.value = pref.conductor;
  if (typeof pref.vehiculo === "string") form.vehiculo.value = pref.vehiculo;
  let texto = "";

  const pintar = () => {
    const v = (k) => form[k].value.trim().replace(/\s+/g, " ");
    const filas = [
      ["Fecha", fechaLarga(c.fecha)], ["Hora", c.hora],
      ["Importe", `${euros(c.importe)} €`, true],
      ["Forma de pago", METODOS[c.canal][c.metodo]],
      c.canal === "app" ? ["Servicio", `Aplicación (${c.app})`] : ["Servicio", CANALES.calle],
    ];
    if (v("origen")) filas.push(["Origen", v("origen")]);
    if (v("destino")) filas.push(["Destino", v("destino")]);
    if (v("conductor")) filas.push(["Conductor", v("conductor")]);
    if (v("vehiculo")) filas.push(["Licencia o matrícula", v("vehiculo")]);
    $("just-cifras").replaceChildren(...cifras(filas).children);
    texto = ["Justificante de carrera (informativo, no es una factura)", ...filas.map(([k, val]) => `${k}: ${val}`)].join("\n");
  };
  form.addEventListener("input", () => { pintar(); guardarJson(CLAVE_PREF, { conductor: form.conductor.value.trim().slice(0, 60), vehiculo: form.vehiculo.value.trim().slice(0, 30) }); });
  form.addEventListener("submit", (ev) => ev.preventDefault());
  pintar();

  $("imprimir").addEventListener("click", () => window.print());
  $("compartir").addEventListener("click", async () => {
    const est = $("estado-just");
    try {
      if (navigator.share) { await navigator.share({ title: "Justificante de carrera", text: texto }); est.textContent = "Compartido."; return; }
      await navigator.clipboard.writeText(texto);
      est.textContent = "Este navegador no puede compartir directamente: el texto se ha copiado, pégalo donde quieras.";
    } catch (err) {
      if (err?.name !== "AbortError") est.textContent = "No se pudo compartir. Usa «Guardar como PDF».";
    }
  });
}
