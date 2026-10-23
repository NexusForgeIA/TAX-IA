// Generador de PDF propio y mínimo (sin librerías): A4, fuentes estándar Helvetica y Helvetica-Bold (no se
// incrustan), texto en WinAnsi (acentos, ñ, «», · y €), líneas y rectángulos. El contenido se escribe en ASCII
// (los bytes no ASCII van como \ooo), así que los desplazamientos del xref son la longitud del texto.
// Módulo sin DOM: lo usa informe-pdf.js y lo prueba pdf.test.js.

export const A4 = { ancho: 595.28, alto: 841.89 };

// Anchos de Helvetica y Helvetica-Bold (métricas AFM estándar, milésimas de em) para los caracteres 32-126.
const ANCHO = {
  normal: [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584],
  negrita: [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
    333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584],
};
// Fuera de ASCII: los que no están en WinAnsi como Latin-1 (0xA0-0xFF), con su byte y ancho; el resto de
// Latin-1 mide como su letra base (á como a) o 556.
const ESPECIALES = { "€": [0x80, 556], "…": [0x85, 1000], "‘": [0x91, 222], "’": [0x92, 222], "“": [0x93, 333], "”": [0x94, 333], "•": [0x95, 350], "–": [0x96, 556], "—": [0x97, 1000] };
const LATIN1 = { "·": 278, "«": 556, "»": 556, "º": 365, "ª": 370, "¿": 611, "¡": 333, " ": 278 };

/** Byte WinAnsi de un carácter; «?» si no se puede representar. */
export function byteWinAnsi(ch) {
  const c = ch.codePointAt(0);
  if (c >= 32 && c <= 126) return c;
  if (ESPECIALES[ch]) return ESPECIALES[ch][0];
  if (c >= 0xa0 && c <= 0xff) return c;
  return 63;
}

function anchoCaracter(ch, negrita) {
  const tabla = negrita ? ANCHO.negrita : ANCHO.normal;
  const c = ch.codePointAt(0);
  if (c >= 32 && c <= 126) return tabla[c - 32];
  if (ESPECIALES[ch]) return ESPECIALES[ch][1];
  if (LATIN1[ch]) return LATIN1[ch];
  const base = ch.normalize("NFD")[0];
  return base !== ch && base.codePointAt(0) <= 126 ? anchoCaracter(base, negrita) : 556;
}

/** Ancho en puntos de un texto. */
export const anchoTexto = (texto, tam, negrita = false) => [...String(texto)].reduce((s, ch) => s + anchoCaracter(ch, negrita), 0) * tam / 1000;

/** Literal de cadena PDF en ASCII: \, ( y ) escapados; los bytes no ASCII como \ooo. */
export function cadenaPdf(texto) {
  let s = "";
  for (const ch of String(texto)) {
    const b = byteWinAnsi(ch);
    if (b === 0x5c || b === 0x28 || b === 0x29) s += `\\${String.fromCharCode(b)}`;
    else if (b < 32 || b > 126) s += `\\${b.toString(8).padStart(3, "0")}`;
    else s += String.fromCharCode(b);
  }
  return `(${s})`;
}

/** Parte un texto en líneas que caben en `ancho` puntos (por palabras). */
export function partir(texto, tam, ancho, negrita = false) {
  const lineas = [];
  let actual = "";
  for (const palabra of String(texto).split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && anchoTexto(prueba, tam, negrita) > ancho) { lineas.push(actual); actual = palabra; } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

const n = (x) => (Math.round(x * 100) / 100).toString();

/** Documento nuevo. Las coordenadas van en puntos desde abajo a la izquierda, como en PDF. */
export function nuevoPdf({ titulo = "" } = {}) {
  const paginas = [];
  let actual = null;
  const doc = {
    paginas,
    pagina() { actual = []; paginas.push(actual); return doc; },
    /** Vuelve a escribir en la página i (desde 0): para el pie con «Página i de n» al final. */
    en(i) { actual = paginas[i]; return doc; },
    /** opciones: {tam = 10, negrita, alinear: "izq" | "der" | "centro", gris (0 negro – 1 blanco)} */
    texto(x, y, texto, { tam = 10, negrita = false, alinear = "izq", gris = 0 } = {}) {
      if (!actual) doc.pagina();
      const w = anchoTexto(texto, tam, negrita);
      const x0 = alinear === "der" ? x - w : alinear === "centro" ? x - w / 2 : x;
      actual.push(`BT /${negrita ? "F2" : "F1"} ${n(tam)} Tf ${n(gris)} g ${n(x0)} ${n(y)} Td ${cadenaPdf(texto)} Tj ET`);
      return doc;
    },
    linea(x1, y1, x2, y2, { grosor = 0.5, gris = 0 } = {}) {
      if (!actual) doc.pagina();
      actual.push(`${n(grosor)} w ${n(gris)} G ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`);
      return doc;
    },
    rect(x, y, w, h, { gris = 0.9 } = {}) {
      if (!actual) doc.pagina();
      actual.push(`${n(gris)} g ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`);
      return doc;
    },
    /** Bytes del PDF (Uint8Array). Todo el archivo es ASCII. */
    bytes() {
      if (!paginas.length) doc.pagina();
      const objs = [];
      const anadir = (cuerpo) => { objs.push(cuerpo); return objs.length; };
      const catalogo = anadir(null), raiz = anadir(null);
      const f1 = anadir("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
      const f2 = anadir("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
      const kids = paginas.map((ops) => {
        const flujo = ops.join("\n");
        const c = anadir(`<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`);
        return anadir(`<< /Type /Page /Parent ${raiz} 0 R /MediaBox [0 0 ${A4.ancho} ${A4.alto}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${c} 0 R >>`);
      });
      objs[catalogo - 1] = `<< /Type /Catalog /Pages ${raiz} 0 R >>`;
      objs[raiz - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
      // Título en UTF-16BE (hex): admite cualquier carácter sin depender de la codificación del documento.
      const hex = [...String(titulo)].map((ch) => { const c = ch.codePointAt(0); return c > 0xffff ? "003F" : c.toString(16).padStart(4, "0"); }).join("").toUpperCase();
      const info = anadir(`<< /Producer (Taxi-IA) /Title <FEFF${hex}> >>`);
      let s = "%PDF-1.4\n";
      const desp = [];
      objs.forEach((cuerpo, i) => { desp.push(s.length); s += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`; });
      const xref = s.length;
      s += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${desp.map((d) => `${String(d).padStart(10, "0")} 00000 n \n`).join("")}`;
      s += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogo} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      const out = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
      return out;
    },
  };
  return doc;
}
