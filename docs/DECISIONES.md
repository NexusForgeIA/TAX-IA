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
