// Tema Día / Noche (lo carga cada página en <head>, después de las metas theme-color, para que no haya parpadeo).
// «taxi.tema»: "auto" (por defecto, sigue prefers-color-scheme), "dia" o "noche". Pone data-tema en <html>; sin JS
// la app se queda en Noche (los tokens de :root en taxi.css). assets/tema.js avisa con el evento «taxi:tema».
(() => {
  const raiz = document.documentElement;
  const claro = window.matchMedia("(prefers-color-scheme: light)");
  const leer = () => {
    try { const t = JSON.parse(localStorage.getItem("taxi.tema")); return t === "dia" || t === "noche" ? t : "auto"; } catch { return "auto"; }
  };
  const aplicar = () => {
    const t = leer();
    raiz.dataset.tema = t === "auto" ? (claro.matches ? "dia" : "noche") : t;
    // Automático: cada meta con su media. Fijado: las dos con el color del tema elegido.
    for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
      m.content = t === "auto" ? (m.media.includes("light") ? "#ffffff" : "#000000") : (t === "dia" ? "#ffffff" : "#000000");
    }
  };
  aplicar();
  claro.addEventListener("change", aplicar);
  document.addEventListener("taxi:tema", aplicar);
})();

// Antes de pintar Inicio: si la guía de inicio está por ver, se marca en <html> para que salga desde el
// primer pintado y no empuje el panel después (CLS). Solo lee «taxi.tour»; inicio.js la gestiona luego.
try {
  if (localStorage.getItem("taxi.tour") !== JSON.stringify("visto")) document.documentElement.classList.add("con-tour");
} catch { /* sin almacenamiento: la guía se queda oculta hasta que la muestre inicio.js */ }

// Splash de arranque (assets/splash.css): una vez por sesión, en Inicio (data-splash="siempre") y en la
// portada solo si se abre como app instalada (data-splash="instalada"). Se decide aquí, antes de pintar, para
// que salga desde el primer frame o no salga; assets/splash.js solo lo quita.
try {
  const modo = document.documentElement.dataset.splash;
  const instalada = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if ((modo === "siempre" || (modo === "instalada" && instalada)) && !sessionStorage.getItem("taxi.splash")) {
    sessionStorage.setItem("taxi.splash", JSON.stringify("visto"));
    document.documentElement.classList.add("con-splash");
  }
} catch { /* sin almacenamiento de sesión: sin splash, mejor que repetirlo en cada página */ }
