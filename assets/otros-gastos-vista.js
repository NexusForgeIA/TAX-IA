// Taxi-IA · otros gastos del coche (vista). Todo en este navegador.
import { $, el } from "./util.js";
import { euros } from "./numeros.js";
import { fechaCorta, hoyMadrid, nombreMes } from "./fechas.js";
import { TIPOS, anadirOtro, borrarOtro, leerOtros, restaurarOtro, totalOtros } from "./otros-gastos.js";

const form = $("f-otro");
const e = (n) => `${euros(n)} €`;
const reiniciar = () => { form.reset(); form.fecha.value = hoyMadrid(); form.fecha.max = hoyMadrid(); };
reiniciar();

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  form.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
  const r = anadirOtro(Object.fromEntries(new FormData(form)));
  const est = $("estado-otro");
  est.classList.toggle("error", !!r.error);
  if (r.error) {
    est.textContent = r.error;
    if (r.campo && form[r.campo]) { form[r.campo].setAttribute("aria-invalid", "true"); form[r.campo].focus(); }
    return;
  }
  est.textContent = "Gasto añadido.";
  reiniciar();
  pintar();
});

function pintar() {
  const lista = leerOtros();
  const mes = hoyMadrid().slice(0, 7);
  const t = totalOtros(lista.filter((g) => g.fecha.startsWith(`${mes}-`)));
  $("resumen-otros").textContent = t.n ? `${nombreMes(mes)}: ${t.n} ${t.n === 1 ? "gasto" : "gastos"} · ${e(t.total)}` : "";
  $("lista-otros").replaceChildren(...lista.slice(0, 100).map((g) => {
    const b = el("button", { type: "button", class: "boton-peligro", text: "Borrar", "aria-label": `Borrar ${TIPOS[g.tipo]} del ${fechaCorta(g.fecha)}` });
    b.addEventListener("click", () => {
      borrarOtro(g.id);
      pintar();
      const des = el("button", { type: "button", class: "boton-sec", text: "Deshacer" });
      des.addEventListener("click", () => { restaurarOtro(g); $("estado-otro").textContent = "Gasto recuperado."; pintar(); });
      $("estado-otro").replaceChildren(document.createTextNode("Gasto borrado. "), des);
    });
    return el("li", { class: "ruta-guardada" },
      el("strong", { text: `${fechaCorta(g.fecha)} · ${TIPOS[g.tipo]} · ${e(g.importe)}` }),
      el("span", { class: "detalle", text: [g.nota, g.etiqueta].filter(Boolean).join(" · ") }),
      el("div", { class: "botones" }, b));
  }));
}
pintar();
