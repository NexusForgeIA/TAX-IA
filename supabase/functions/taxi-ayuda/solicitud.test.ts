import { assertEquals } from "jsr:@std/assert@1.0.13";
import { leerSolicitud, MAX_BYTES, normalizarTelefono, textoAviso, VERSIONES } from "./solicitud.ts";

const base = { nombre: "  Ana   Pérez ", telefono: "600 11 22 33", mensaje: " Tengo un Niro ", consentimiento: true, version: VERSIONES[0] };
const leer = (o: unknown) => leerSolicitud(JSON.stringify(o));

Deno.test("solicitud válida: se limpia el nombre, el teléfono y el mensaje", () => {
  assertEquals(leer(base), { nombre: "Ana Pérez", telefono: "600112233", mensaje: "Tengo un Niro", version: VERSIONES[0] });
  assertEquals(normalizarTelefono("+34 (600) 11-22.33"), "+34600112233");
  assertEquals(leer({ ...base, mensaje: undefined }), { nombre: "Ana Pérez", telefono: "600112233", mensaje: "", version: VERSIONES[0] });
});

Deno.test("sin consentimiento, con otra versión del texto o con campos malos, se rechaza", () => {
  for (const malo of [
    { ...base, consentimiento: false }, { ...base, consentimiento: "true" }, { ...base, consentimiento: undefined },
    { ...base, version: "otra" }, { ...base, nombre: "A" }, { ...base, nombre: "x".repeat(81) }, { ...base, nombre: 7 },
    { ...base, telefono: "12345" }, { ...base, telefono: "600-abc-123" }, { ...base, telefono: "+".repeat(3) + "600112233" },
    { ...base, mensaje: "x".repeat(501) },
  ]) assertEquals("error" in leer(malo), true, JSON.stringify(malo));
  for (const roto of ["", "{roto", "null", "[]", '"texto"']) assertEquals("error" in leerSolicitud(roto), true, roto);
  assertEquals("error" in leer({ ...base, mensaje: "x".repeat(MAX_BYTES) }), true);
});

Deno.test("el aviso es texto plano con nombre, teléfono y mensaje", () => {
  const s = leer(base);
  if ("error" in s) throw new Error(s.error);
  assertEquals(textoAviso(s), "Taxi-IA · Ayuda Auto+: nueva solicitud\nNombre: Ana Pérez\nTeléfono: 600112233\nMensaje: Tengo un Niro");
  assertEquals(textoAviso({ ...s, mensaje: "" }).endsWith("Mensaje: —"), true);
});
