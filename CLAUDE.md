# CLAUDE.md — Taxi-IA

App para taxistas (titular y asalariado): facturación por carrera, turnos y reparto, calculadoras, gastos del coche,
estadísticas, vencimientos (ITV, taxímetro, revista municipal, seguro), mantenimiento y avisos municipales.
**Sin precios de combustible** (eso es Gasol-IA). El frontend es el de Gasol-IA (nav, iconos SVG, tarjetas, firma);
al portar cambios de allí, no traer comparador, ruta, favoritas, visita ni nada de Supabase/Ministerio.

## Stack
- Cliente: HTML/CSS/JS vanilla, PWA instalable. Sin frameworks ni npm. CSP estricta (sin scripts ni estilos inline).
- Hosting: GitHub Pages. Pruebas de cálculo: `node assets/herramientas.test.js`. Módulos ES; claves de `localStorage` con prefijo `taxi.`.
- Backend (cuando haga falta): Supabase `mlaqtniujnvfxcvcourm`, compartido. Tablas `taxi_*`, Edge Functions `taxi-*`.
  Antes de crear nada, consultar el esquema real; no tocar nada que no sea `taxi*`. RLS en todo, VIEW con
  `security_invoker = on`, secretos en Supabase Secrets, nunca claves en el cliente.
  Edge Functions públicas: `supabase functions deploy <nombre> --no-verify-jwt --project-ref mlaqtniujnvfxcvcourm`.

## Datos y claims
- Sin datos inventados: ninguna tarifa, plazo, porcentaje, cifra de ahorro ni testimonio. Tarifas, % de reparto,
  periodicidades y objetivos **los pone el usuario**.
- Plazos de ITV/taxímetro/revisión municipal: dependen del vehículo y del ayuntamiento; no se afirman. Solo fechas del usuario.
- Sin consejo fiscal ni legal. El justificante de carrera es informativo y **no sustituye a la factura**.
- Avisos municipales automáticos: no antes de confirmar fuente y licencia de uso de cada ayuntamiento.
- Sin WhatsApp Business API. Aviso de IA visible donde se use IA.
- Seguridad al volante: se anota con el coche parado.
- Sin emojis como iconos: solo el sprite `assets/iconos.svg` (24×24, trazo). Toda página lleva «Desarrollado por WhiteMoon Agencia IA» (firma con el logo 3D).

## RGPD
- Prototipo: todo en `localStorage`, nada sale del dispositivo. Con cuentas: exportar y borrar datos desde la app.
- Ubicación: no se usa. Si se añade, redondeada y sin guardar.

## Git
- Ramas + PR (`feat/`, `fix/`, `docs/`, `refactor/`). Un PR, una cosa. Nunca push a `main` para cambios grandes.

## Diseño
- Mobile-first y accesible; paleta solo negro, amarillo (#ffc800) y blanco (rojo solo para errores y borrar). Lighthouse móvil >= 85, cero errores de consola,
  sin desbordamiento horizontal a 390 px, `prefers-reduced-motion`.
