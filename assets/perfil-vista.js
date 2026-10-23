// Taxi-IA · Mi perfil: nombre, licencia y matrícula para el justificante y el PDF de facturación. Se guarda al
// escribir, solo en este navegador («taxi.perfil»); nada se envía a ningún servidor.
import "./nav.js";
import { $ } from "./util.js";
import { guardarPerfil, leerPerfil } from "./perfil.js";

const form = $("f-perfil");
const estado = $("estado-perfil");
const perfil = leerPerfil();
for (const k of ["nombre", "licencia", "matricula"]) form[k].value = perfil[k];

form.addEventListener("input", () => {
  const ok = guardarPerfil({ nombre: form.nombre.value, licencia: form.licencia.value, matricula: form.matricula.value });
  estado.textContent = ok ? "Guardado en este móvil." : "Este navegador no deja guardar. No se ha cambiado nada.";
});
form.addEventListener("submit", (e) => e.preventDefault());
