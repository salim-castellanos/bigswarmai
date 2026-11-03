---
id: HU-006
feature: F-004
epic: E-001
module: 01-workspace
needs: [HU-010, HU-011, HU-003, HU-004]
screen: nodo
---

# HU-006 — Lanzar el enjambre con un proveedor

Como operador, quiero arrancar el nodo que elegí, con su estrategia y su número de agentes, para descubrir el plan desde el objetivo principal o desde un subobjetivo.

**Aceptación**

- WHEN el nodo tiene estrategia, un número de agentes mayor que cero y la conexión está lista, THEN arranca ese nodo: el orquestador usa su modelo y los agentes el suyo.
- WHEN arranco un subobjetivo, THEN corre ese nodo y no el resto del árbol.
- WHEN arranco el principal, THEN la estrategia de ese nodo decide cómo entran sus subobjetivos.
- WHEN un agente publica un descubrimiento, THEN cumple HU-003.
- WHEN miro el nodo, THEN veo cuántos agentes hay y el uso de tokens de cada uno.
- WHEN cambio la estrategia o la cantidad y no hay una ejecución en curso, THEN el próximo arranque usa esos valores.
- IF la conexión no está lista, THEN no parte la ejecución.

**Tablero**

No aplica.
