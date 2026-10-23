// Flecha «Volver» de la barra superior de las pantallas interiores. En el HTML es un enlace a Inicio
// (funciona sin JS); aquí, si se llegó desde otra pantalla de Taxi-IA, vuelve a esa con history.back().
// Solo cuenta como interno un referrer dentro de la carpeta de la app: en github.io el mismo origen
// sirve otras webs, y la flecha nunca debe sacar al usuario de Taxi-IA.
const flecha = document.querySelector(".atras");

function vieneDeLaApp() {
  try {
    const base = new URL(".", location.href).href;
    return document.referrer.startsWith(base) && document.referrer !== location.href && history.length > 1;
  } catch {
    return false;
  }
}

if (flecha) {
  flecha.addEventListener("click", (e) => {
    if (!vieneDeLaApp()) return; // sigue el enlace a inicio.html
    e.preventDefault();
    history.back();
  });
}
