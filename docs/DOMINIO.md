# Dominio propio para Taxi-IA (preparado el 22/10/2026, sin ejecutar)

Estado: la app sirve desde `https://nexusforgeia.github.io/TAX-IA/`. Todas las rutas son relativas, así que un dominio propio solo necesita DNS y un fichero `CNAME`.

## Disponibilidad consultada el 22/10/2026 (registro, no compra)
Libres: `taxi-ia.es`, `taxiia.es`, `taxi-ia.com`, `taxi-ia.app`, `taxiia.app`, `taxistaia.es`. Ocupado: `taxiia.com`. Los precios no se consultaron: mirar al comprar.

## Pasos (los hace Cris: la compra y el DNS son suyos)
1. Comprar el dominio (recomendado `.es`, por ser para España).
2. DNS: para un subdominio `www`, un `CNAME` a `nexusforgeia.github.io`; para el dominio raíz, cuatro registros `A` de GitHub Pages (185.199.108.153, .109.153, .110.153, .111.153). Comprobar las IP en la documentación de GitHub Pages el día de hacerlo.
3. En el repo, un fichero `CNAME` en la raíz con el dominio, y activar HTTPS en Settings → Pages.
4. Cambiar `og:image` de `index.html` al dominio nuevo (única URL absoluta de la app).
5. Dejar `nexusforgeia.github.io/TAX-IA/` redirigiendo (GitHub lo hace solo al activar el dominio).

## Aviso importante: los datos no se mueven solos
Los datos viven en el `localStorage` de **cada origen**. Un taxista que ya usa la app en `github.io` **no verá sus datos** en el dominio nuevo, y la app instalada en el móvil seguirá ligada al origen antiguo.
Antes de cambiar de dominio hay que ofrecer una **copia de seguridad / restaurar** (exportar un archivo en el origen viejo e importarlo en el nuevo). Es la idea 3 de la lista, que Cris dejó fuera por ahora. Hasta que exista, conviene cambiar de dominio cuanto antes (hay pocos usuarios) y avisarles.
