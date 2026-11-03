---
id: HU-003
feature: F-002
epic: E-001
module: 01-workspace
needs: [HU-001]
screen: workspace
---

# HU-003 — Publicar un descubrimiento significativo

Como operador, quiero dejar en el tablero una afirmación que cambie lo que el resto haría, para no guardar el registro crudo de las herramientas.

**Aceptación**

- WHEN publico afirmación, por qué importa y origen, los tres con texto, THEN aparece un evento nuevo en `.bigswarm/events/` y en la ventana.
- WHEN cierro y vuelvo a abrir la carpeta, THEN ese evento sigue ahí.
- IF falta la afirmación, el porqué o el origen, THEN no se escribe el evento.
- IF la carpeta no está inicializada, THEN no se escribe el evento.

**Tablero**

No aplica. El tablero de esta HU es la carpeta de eventos, no un tile de home.
