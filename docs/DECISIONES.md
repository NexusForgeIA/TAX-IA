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
11. **Gráfica de horas punta (21/10/2026):** en Estadísticas, barras por hora (0-23) con las carreras que apunta el propio taxista (carreras o facturado). Solo datos del usuario, en el navegador; no se usa «horas concurridas» de Google Maps (dato propio de Google, sin API oficial). Las carreras sin hora no entran.
12. **Fotos de estadios (21/10/2026):** en el Radar, un evento de fútbol usa la foto del estadio si su «lugar» lo nombra (Bernabéu, Metropolitano, Camp Nou, Sánchez-Pizjuán); si no, la genérica. Fotos aportadas por el titular; pendiente confirmar origen/licencia (salen escudos y rótulos).
13. **Tipografía (21/10/2026):** Plus Jakarta Sans (OFL), variable, alojada en `assets/fonts/` (la CSP no permite fuentes externas). Títulos y botones con más peso. SW taxi-v13.
14. **Texto con más cuerpo (21/10/2026):** peso base 600, segundas líneas de las tarjetas a 1 rem y más claras, `--muted` más luminoso; también dentro de las páginas. SW taxi-v14.
15. **Panel de llegadas (21/10/2026):** estilo de panel con icono, nombre en negrita, detalle e insignia (Oficial / No oficial / Info). Sin cifras de vuelos ni trenes: no hay fuente en vivo todavía. SW taxi-v15.
16. **Eventos del Radar desde webs de turismo (21/10/2026):** solo eventos grandes (estadios, arenas, Palau Sant Jordi, IFEMA, FIBES, ferias), leídos de Turismo de Madrid (esmadrid.com), Turismo de València (visitvalencia.com) y las webs oficiales de los recintos; cada uno con su fuente y enlace. Cargados a mano con `insert into taxi_eventos`; se refrescan cuando lo pida el titular. Sin hora cuando la fuente no la da («Hora por confirmar»). Pendiente: partidos de Barça, Betis, Sevilla y Valencia CF (no se encontró calendario fiable). Descartada la agenda de datos abiertos del Ayuntamiento de Madrid (CC BY 4.0): son actividades culturales pequeñas, sin recintos grandes.
17. **Trayecto con GPS (21/10/2026):** `trayecto.html`. Iniciar/Terminar, con `watchPosition` solo mientras la app está abierta (y Wake Lock para mantener la pantalla). Descarta lecturas >40 m de error, ruido <8 m y saltos >70 m/s. Guarda en localStorage (`taxi.trayectos`, máx. 200 y 6000 puntos); trazado en SVG sin mapas de terceros; exportar CSV (sin puntos) y borrar. Regla de ubicación cambiada en CLAUDE.md. Fuera de alcance: grabar en segundo plano (requiere app nativa), unir con Facturación.

18. **Contar instalaciones (21/10/2026):** `instalar.html` tiene un botón «Instalar» real que solo aparece si el navegador ofrece la instalación (`beforeinstallprompt`: Chrome y Edge en Android y ordenador). Dos recuentos anónimos más en el contador de aperturas, como páginas de la lista cerrada: `instalar-clic` (pulsan el botón) e `instalacion` (el evento `appinstalled` confirma la instalación). En iPhone (Safari) el navegador no avisa: ahí solo se ve de forma indirecta en las aperturas en modo «instalada». Sin identificadores. El resumen diario los cuenta aparte. Migración 20261021150000. SW taxi-v18.

19. **Primera apertura desde el icono (21/10/2026):** para medir también las instalaciones en iPhone (Safari no avisa), la primera vez que un móvil abre la app en modo «instalada» se cuenta una vez como `primera-instalada`. Para saber que es la primera, el navegador guarda una marca local (`taxi.instalada-contada` en localStorage) que no se envía ni identifica a nadie. Cambia la regla anterior de «nada en el dispositivo»: actualizado en Privacidad. Es una aproximación (si se borran los datos del navegador, puede contar dos veces; quien la añade y nunca la abre no se ve). Migración 20261021170000. SW taxi-v19.

20. **Señal «Fuerte demanda» en el Radar (21/10/2026):** los eventos marcados `grande` (estadios, arenas, Palau Sant Jordi…) llevan una etiqueta amarilla «Fuerte demanda» y la nota «mucha gente a la entrada y, sobre todo, a la salida». Es lógica de afluencia por el tipo de recinto: no hay cifras de asistentes (nadie las publica y no se inventan) ni promesa de carreras; que el taxista las coja o no depende de él. Sin cambios en la base de datos. SW taxi-v20.
21. **Cierre del datáfono (21/10/2026):** botón en Facturación que precarga un «total sin detallar» Calle · Tarjeta con la nota «Cierre del datáfono». Suma al total del día y del mes junto al efectivo, sin contar como carrera. El importe lo escribe el taxista (lo da su TPV). Si ya hay un cierre ese día, se avisa de que se edite para no contarlo dos veces. Sin cambios en la base de datos. SW taxi-v22.
22. **Informe del mes en PDF (21/10/2026):** página `informe.html` (menú Más y barra superior) con un selector de mes y el botón «Guardar como PDF / imprimir» (`window.print()`, hoja de estilo de impresión en blanco y negro). Incluye facturación por columnas y por día, repostajes y gasto de combustible, km según cuentakilómetros (entre la primera y la última lectura del mes) y km de los trayectos GPS (estimación). Solo datos del usuario, todo en el navegador; no se genera nada en servidor. Documento informativo: no es factura ni justificante fiscal. No carga `visita.js` (la lista cerrada de páginas del contador no la incluye). SW taxi-v23.
23. **Otros gastos del coche (21/10/2026):** sección en Gastos para peajes, parking, lavado, multas, seguro y otros, con importe, nota y turno/vehículo que pone el usuario (`taxi.otros-gastos`, solo en el navegador). Entran en el informe del mes (con neto «facturación menos combustible y otros gastos») y en «Traer de Facturación y Gastos» del cierre de turno. Sin categorías fiscales ni consejo. SW taxi-v24.
24. **Cierre de turno en un paso (21/10/2026):** «Traer todo lo del día» en Turnos rellena recaudación (con el datáfono incluido), gastos (combustible + otros gastos) y km del GPS de ese día, y muestra el desglose efectivo / datáfono-banco-app. El taxista revisa, pone el porcentaje si hay asalariado y guarda. Km del GPS = estimación. SW taxi-v25.
25. **Objetivo diario y comparar meses (21/10/2026):** en Facturación, un objetivo de hoy que escribe el taxista (sin cifra por defecto; `taxi.objetivo`) con barra de lo facturado hoy; en el informe, tabla «Comparado con el mes anterior» (facturado, carreras y gastos, con la diferencia). Solo sus datos, sin previsiones. SW taxi-v26.
