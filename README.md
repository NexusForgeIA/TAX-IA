# Taxi-IA
Herramientas para taxistas (titular y asalariado): facturación por carrera, turnos y reparto, calculadoras,
gastos del coche, estadísticas, vencimientos (ITV, taxímetro, revista municipal, seguro), mantenimiento y avisos municipales.

Mismo frontend que Gasol-IA (menú, iconos, tarjetas), en negro, amarillo y blanco. Desarrollado por WhiteMoon Agencia IA.
Prototipo 100 % en el navegador (`localStorage`, claves `taxi.*`): sin cuenta, sin servidor, sin precios de combustible.

- Probar en local: `python3 -m http.server` en la raíz y abrir `http://localhost:8000`.
- Tests de cálculo: `node assets/herramientas.test.js`.
- Reglas y límites: `CLAUDE.md`. Ideas pendientes: `docs/IDEAS.md`.
- Publicar: GitHub Pages (Settings → Pages → rama `main`, carpeta raíz).
