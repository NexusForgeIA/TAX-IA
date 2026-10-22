// Antes de pintar Inicio: si la guía de inicio está por ver, se marca en <html> para que salga desde el
// primer pintado y no empuje el panel después (CLS). Solo lee «taxi.tour»; inicio.js la gestiona luego.
try {
  if (localStorage.getItem("taxi.tour") !== JSON.stringify("visto")) document.documentElement.classList.add("con-tour");
} catch { /* sin almacenamiento: la guía se queda oculta hasta que la muestre inicio.js */ }
