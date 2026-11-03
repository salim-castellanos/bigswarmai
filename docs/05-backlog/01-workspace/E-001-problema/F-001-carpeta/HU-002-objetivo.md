---
id: HU-002
feature: F-001
epic: E-001
module: 01-workspace
needs: [HU-001]
screen: workspace
---

# HU-002 — Guardar un objetivo

Como operador, quiero escribir el objetivo de esta carpeta para retomarlo al abrirla de nuevo.

**Aceptación**

- WHEN la carpeta está inicializada y guardo un texto, THEN queda en `.bigswarm/objective.md`.
- WHEN vuelvo a abrir esa carpeta, THEN veo ese mismo texto.
- WHEN guardo otro texto, THEN el anterior se reemplaza.
- IF la carpeta no está inicializada, THEN no se escribe un objetivo.

**Tablero**

No aplica.
