// Taxi-IA · justificante informativo de una carrera (window.print / compartir). Solo datos del usuario, en este navegador.
// No es una factura: no calcula IVA ni numera documentos.
import "./nav.js";
import { $, cifras } from "./util.js";
import { euros } from "./numeros.js";
import { fechaLarga } from "./fechas.js";
import { guardarPerfil, leerPerfil } from "./perfil.js";
import { CANALES, METODOS, leerCarreras } from "./ingresos.js";

const id = new URLSearchParams(location.search).get("id") || "";
const c = leerCarreras().find((x) => x.id === id && x.hora != null);
const form = $("f-just");

if (!c) {
  $("vacio").hidden = false;
} else {
  $("datos").hidden = false;
  $("justificante").hidden = false;
  const perfil = leerPerfil();
  form.conductor.value = perfil.nombre;
  form.licencia.value = perfil.licencia;
  form.matricula.value = perfil.matricula;
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
    if (v("licencia")) filas.push(["Licencia", v("licencia")]);
    if (v("matricula")) filas.push(["Matrícula", v("matricula")]);
    $("just-cifras").replaceChildren(...cifras(filas).children);
    texto = ["Justificante de carrera (informativo, no es una factura)", ...filas.map(([k, val]) => `${k}: ${val}`)].join("\n");
  };
  // Nombre, licencia y matrícula son los de Mi perfil: lo que se cambie aquí se guarda allí.
  form.addEventListener("input", () => { pintar(); guardarPerfil({ nombre: form.conductor.value, licencia: form.licencia.value, matricula: form.matricula.value }); });
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
