---
id: HU-007
feature: F-004
epic: E-001
module: 01-workspace
needs: [HU-006]
screen: workspace
---

# HU-007 — Parar y reanudar

Como operador, quiero parar la ejecución, o recuperar lo ya escrito si el proceso muere, para continuar desde los descubrimientos guardados.

**Aceptación**

- WHEN paro, THEN los agentes dejan de llamar herramientas y el estado queda en la carpeta.
- WHEN el proceso muere a mitad de una ejecución, THEN al abrir la carpeta veo los eventos ya escritos y puedo reanudar.
- WHEN reanudo, THEN no se borran los eventos anteriores.

**Tablero**

No aplica.
