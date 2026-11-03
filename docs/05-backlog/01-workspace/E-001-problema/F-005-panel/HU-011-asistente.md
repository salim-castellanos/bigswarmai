---
id: HU-011
feature: F-005
epic: E-001
module: 01-workspace
needs: [HU-009]
screen: asistente
---

# HU-011 — Asistente de objetivo y subobjetivos

Como operador, quiero un asistente que me pregunte el objetivo y si cuelga de otro, para armar el árbol sin escribir el archivo a mano.

**Aceptación**

- WHEN completo el asistente con un texto y elijo principal, THEN ese nodo queda en la raíz del árbol, en `.bigswarm/objectives.json`, con estrategia `board` y 1 agente.
- WHEN completo el asistente con un texto y elijo un padre, THEN el nodo queda como subobjetivo de ese padre, con estrategia `board` y 1 agente.
- WHEN cierro el IDE y vuelvo a abrir la carpeta, THEN el árbol es el mismo.
- IF dejo el texto vacío, THEN no se crea el nodo.
- WHEN guardo el objetivo, THEN no hace falta que la conexión del modelo esté lista.

**Tablero**

No aplica.
