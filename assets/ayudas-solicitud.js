// Taxi-IA · «Me interesa» (Ayudas): envía nombre, teléfono y un mensaje opcional a taxi-ayuda, solo si el taxista
// marca la autorización. Es lo único de la app que sale del dispositivo con datos personales (decisión 47). No se
// guarda nada en el navegador; si el envío falla, lo escrito se queda en el formulario.
import "./nav.js";
import { $ } from "./util.js";
import { API } from "./config.js";

/** Versión del texto de autorización: la misma que acepta taxi-ayuda (solicitud.ts). */
const VERSION_TEXTO = "ayuda-v1-2026-10-23";
const form = $("f-solicitud");
const enviar = $("enviar");
const estado = $("estado-solicitud");

const actualizar = () => { enviar.disabled = !form.consentimiento.checked; };
form.consentimiento.addEventListener("change", actualizar);
actualizar();

function aviso(texto, campo) {
  estado.textContent = texto;
  estado.classList.add("error");
  campo?.focus();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.consentimiento.checked) return;
  const nombre = form.nombre.value.trim();
  const telefono = form.telefono.value.replace(/[\s.\-()]/g, "");
  if (nombre.length < 2) return aviso("Escribe tu nombre.", form.nombre);
  if (!/^\+?[0-9]{9,15}$/.test(telefono)) return aviso("Escribe un teléfono válido (9 cifras o con prefijo).", form.telefono);

  enviar.disabled = true;
  estado.classList.remove("error");
  estado.textContent = "Enviando…";
  try {
    const r = await fetch(`${API}/taxi-ayuda`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify({ nombre, telefono, mensaje: form.mensaje.value.trim(), consentimiento: true, version: VERSION_TEXTO }),
      signal: AbortSignal.timeout(20_000),
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok || !datos.recibido) throw new Error(datos.error || "No se ha podido enviar.");
    $("bloque-solicitud").hidden = true;
    const ok = $("recibido");
    ok.hidden = false;
    ok.focus();
  } catch (err) {
    const texto = err?.name === "TypeError" || err?.name === "TimeoutError" ? "No se ha podido enviar: revisa la conexión." : err.message;
    aviso(`${texto} Lo que has escrito sigue aquí; vuelve a intentarlo.`);
  } finally {
    actualizar();
  }
});
