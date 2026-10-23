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
- Seguridad al volante: se anota con el coche parado; el GPS se inicia y se termina con el coche parado. Los km del GPS son estimación, no sustituyen al taxímetro.
- Sin emojis como iconos: solo el sprite `assets/iconos.svg` (24×24, trazo). La firma «Desarrollado por WhiteMoon Agencia IA» (logo 3D pequeño, enlace a https://whitemoon.es con rel="noopener") va solo en Inicio (abajo, discreta) y en Privacidad; el resto de páginas no la lleva. Excepción: el splash de arranque (`assets/splash.css`) lleva el texto «Desarrollado por WhiteMoon Agencia IA» bajo el logo, sin enlace ni logo de WhiteMoon.

## RGPD
- Prototipo: todo en `localStorage`, nada sale del dispositivo, salvo la solicitud de ayuda (`ayudas-solicitud.html` → Edge Function `taxi-ayuda` → `taxi_ayuda_solicitudes` + aviso a Telegram), opcional y con consentimiento: nombre, teléfono y mensaje; 12 meses como máximo; la derivación a la gestoría la hace Cris a mano. Con cuentas: exportar y borrar datos desde la app.
- Ubicación: solo en `trayecto.html`, solo mientras el taxista graba una carrera (Iniciar/Terminar), guardada únicamente en localStorage (`taxi.trayectos`), nunca enviada a ningún servidor; borrable desde la app. Decidido por Cris (2026-10-21). En el resto de la app no se usa.

## Git
- Ramas + PR (`feat/`, `fix/`, `docs/`, `refactor/`). Un PR, una cosa. Nunca push a `main` para cambios grandes.

## Diseño
- Mobile-first y accesible; paleta solo negro, amarillo (#ffc800) y blanco (rojo solo para errores y borrar). Lighthouse móvil >= 85, cero errores de consola,
  sin desbordamiento horizontal a 390 px, `prefers-reduced-motion`.
