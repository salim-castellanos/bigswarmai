---
id: HU-008
feature: F-004
epic: E-001
module: 01-workspace
needs: [HU-006]
screen: workspace
---

# HU-008 — Conectar un MCP a un objetivo

Como operador, quiero conectar un MCP a un objetivo para usar una capacidad que no está en las herramientas de la carpeta.

**Aceptación**

- WHEN conecto un MCP a un objetivo, THEN solo los agentes de ese objetivo pueden llamarlo.
- WHEN otro objetivo del mismo workspace corre, THEN ese MCP no está disponible.
- IF quito el MCP, THEN las llamadas nuevas no lo usan.

**Tablero**

No aplica.
