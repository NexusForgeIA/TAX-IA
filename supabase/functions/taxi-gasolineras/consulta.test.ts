import { assertEquals } from "jsr:@std/assert@1.0.13";
import { leerConsulta } from "./consulta.ts";

const q = (s: string) => leerConsulta(new URLSearchParams(s));

Deno.test("ciudad con su municipio por defecto y gasóleo A", () => {
  assertEquals(q("ciudad=Madrid"), { provincia: "28", municipio: "4354", combustible: "gasoleo_a", solo24: false });
  assertEquals(q("ciudad=Barcelona&combustible=glp&solo24h=1"), { provincia: "08", municipio: "881", combustible: "glp", solo24: true });
  assertEquals(q("ciudad=Valencia&municipio=7001&solo24h=0"), { provincia: "46", municipio: "7001", combustible: "gasoleo_a", solo24: false });
  assertEquals(q("ciudad=Sevilla&municipio="), { provincia: "41", municipio: "6148", combustible: "gasoleo_a", solo24: false });
});

Deno.test("rechaza lo que no está en las listas", () => {
  for (const malo of ["", "ciudad=Bilbao", "ciudad=madrid", "ciudad=Madrid&municipio=12a", "ciudad=Madrid&municipio=1234567",
    "ciudad=Madrid&combustible=hidrogeno", "ciudad=Madrid&combustible=", "ciudad=Madrid&solo24h=si", "ciudad=Madrid&lat=40.4&municipio=x"]) {
    assertEquals("error" in q(malo), true, malo);
  }
});
