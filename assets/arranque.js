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
