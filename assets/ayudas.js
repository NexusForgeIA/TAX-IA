// Taxi-IA · Ayudas (Auto+): la lista de documentación que el taxista marca. Se guarda solo en este navegador
// («taxi.ayudas»: {v: 1, hechos: [nombres]}) y va en la copia de seguridad. No calcula ninguna ayuda.
import "./nav.js";
import { $ } from "./util.js";
import { guardarJson, leerJson } from "./datos.js";

const CLAVE = "taxi.ayudas";
const lista = $("docs");
const estado = $("estado-docs");
const casillas = [...lista.querySelectorAll("input[type=checkbox]")];

const guardado = leerJson(CLAVE, null);
const hechos = new Set(Array.isArray(guardado?.hechos) ? guardado.hechos : []);
for (const c of casillas) c.checked = hechos.has(c.name);

function contar() {
  const n = casillas.filter((c) => c.checked).length;
  return `${n} de ${casillas.length} documentos marcados.`;
}
estado.textContent = contar();

lista.addEventListener("change", () => {
  const ok = guardarJson(CLAVE, { v: 1, hechos: casillas.filter((c) => c.checked).map((c) => c.name) });
  estado.textContent = ok ? contar() : "Este navegador no deja guardar. No se ha cambiado nada.";
});
