# Decisiones

1. **Contador de aperturas (21/10/2026), mismo patrón que Gasol-IA.** `taxi_visitas` (día de Madrid,
   página de una lista cerrada de 13, modo «navegador» o «instalada», recuento) y `taxi_visitas_hora`
   (tope de 300 aperturas/hora entre todos), con RLS sin políticas: solo `service_role`. Se cuentan
   aperturas, no personas: sin IP, cookies, localStorage ni identificadores, y nada de lo que apunta el
   taxista. Cliente `assets/visita.js` (sendBeacon `text/plain`, no envía en localhost). La lista de páginas
   está en la migración, en `taxi-visita/limites.ts` y la comprueba `limites.test.ts`. El dato es
   orientativo y no auditable (puede quedar por encima o por debajo de lo real).
2. **Resumen diario por Telegram** (`taxi-resumen`, 08:00 Madrid, pg_cron 06:00 y 07:00 UTC; solo envía si en
   Madrid son las 8). Clave del cron en Vault (`taxi_resumen_clave`), generada en la base; `TAXI_RESUMEN_CLAVE`
   en Secrets es opcional (lanzarla a mano). Empieza por «Taxi-IA · resumen de ayer». El 25/10/2026 cambia la
   hora: comprobar que llega a las 08:00 el 25 y el 26.
3. **Privacidad**: `privacidad.html` explica el contador. Los datos del taxista siguen solo en el dispositivo.
4. **Cómo leer los números**: `select dia, modo, sum(recuento) from taxi_visitas group by 1,2 order by 1 desc;`
5. **Radar de eventos (21/10/2026).** Pantalla `radar.html` con los próximos eventos de Madrid y enlaces a
   las webs oficiales de llegadas (AENA, Renfe, Estación Sur). Los eventos están en `taxi_eventos`
   (RLS sin políticas, solo `service_role`), cargados a mano desde fuentes públicas: `fuente` y `fuente_url`
   (https) son obligatorias. La app los lee con la función `taxi-eventos` (GET público, sin datos del usuario).
   La señal «posible más demanda al terminar» es orientativa, solo sale en eventos marcados `grande` y no lleva
   cifras. Sin vuelos ni trenes en tiempo real: falta confirmar fuente y licencia (o contratar una API).
   «radar» entra en la lista cerrada del contador de aperturas (migración 20261021120000).
7. **Cargar un evento:** `insert into taxi_eventos (nombre, lugar, fecha, fecha_fin, hora_ini, grande, fuente, fuente_url) values (...)`.
8. **Radar en 4 ciudades (21/10/2026):** Madrid, Barcelona, Sevilla y Valencia (las que más demanda tienen por el AVE).
   `taxi_eventos.ciudad` limitada a esas cuatro; `taxi-eventos?ciudad=…` valida la ciudad; el selector guarda la última
   elegida solo en este navegador (`taxi.ciudad`). Los enlaces de llegadas son generales (AENA y Renfe; Estación Sur solo
   en Madrid). `taxi_eventos_proximos` queda sin uso (sustituida por `taxi_eventos_ciudad`).
9. **Radar rediseñado (21/10/2026):** ciudades como pastillas, tarjetas de evento con foto (por `tipo`: futbol/feria/concierto/otro)
   deslizables, y llegadas en bloques con icono (avión/tren/autobús). Código y fotos propios; no se copia diseño ni código de otras apps.
   Migración 20261021140000 (columna `tipo`). SW taxi-v8.
10. **Capa visual moderna (21/10/2026):** `assets/taxi.css` añade degradados, tarjetas con relieve, botones en píldora, barra inferior de cristal y entrada suave (solo con movimiento permitido). Mismo negro/amarillo y mismo contenido; solo estilo. SW taxi-v9.
