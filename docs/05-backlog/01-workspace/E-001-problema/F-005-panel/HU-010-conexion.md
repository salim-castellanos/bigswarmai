---
id: HU-010
feature: F-005
epic: E-001
module: 01-workspace
needs: [HU-009]
screen: conexion
---

# HU-010 — Conectar orquestador y agentes

Como operador, quiero indicar el modelo del orquestador y el de los agentes en una sola pantalla, para poder usar uno más capaz en el orquestador y otro menor en los agentes.

**Aceptación**

- WHEN abro Conexión, THEN veo los modelos que VS Code ya tiene dados de alta y dos elecciones: modelo del orquestador y modelo de los agentes. No hay campo de clave.
- WHEN guardo la misma elección en los dos, THEN la conexión queda lista si ese modelo está en la lista.
- WHEN guardo un modelo distinto en cada uno, THEN la conexión recuerda los dos.
- WHEN no hay modelos en VS Code, THEN el panel indica que los agregue con Chat: Manage Language Models y no queda lista.
- WHEN pruebo la conexión y el modelo responde con error, THEN veo el error y no se marca como lista.

**Tablero**

No aplica.
