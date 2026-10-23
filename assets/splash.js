// Splash de arranque. Lo pinta el CSS desde el primer frame (arranque.js decide si sale); aquí solo se quita:
// a los ~1,6 s con fundido de 250 ms, o al instante con un toque o Escape. No atrapa el foco.
const splash = document.querySelector(".con-splash .splash");

if (splash) {
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DURACION = quieto ? 900 : 1600; // ms desde el inicio de la carga
  let quitado = false;

  const tecla = (e) => { if (e.key === "Escape") quitar(true); };
  function quitar(alInstante) {
    if (quitado) return;
    quitado = true;
    document.removeEventListener("keydown", tecla);
    if (alInstante || quieto) { splash.remove(); return; }
    splash.classList.add("splash-fuera");
    setTimeout(() => splash.remove(), 250);
  }

  splash.addEventListener("click", () => quitar(true));
  document.addEventListener("keydown", tecla);
  setTimeout(() => quitar(false), Math.max(0, DURACION - performance.now()));
}
