---
id: HU-001
feature: F-001
epic: E-001
module: 01-workspace
needs: []
screen: workspace
---

# HU-001 — Abrir carpeta e inicializar o cargar

Como operador, quiero elegir una carpeta para que BigSwarmAI la reconozca como workspace y no pierda lo que ya había.

**Aceptación**

- WHEN elijo una carpeta sin marca `.bigswarm/workspace.json`, THEN se crean la marca, `.bigswarm/objective.md` vacío, `.bigswarm/events/` y una sección marcada en `AGENTS.md`.
- WHEN `AGENTS.md` ya existe, THEN la sección se añade al final y el resto del archivo queda igual.
- WHEN `AGENTS.md` ya tiene la sección marcada, THEN no se duplica.
- WHEN elijo una carpeta que ya tiene la marca, THEN se cargan el objetivo y los eventos ya escritos y no se recrean esos archivos.
- IF la carpeta no se puede escribir, THEN no se crea una marca a medias y veo el error.

**Tablero**

No aplica. Esta HU no mueve un tile de home.
