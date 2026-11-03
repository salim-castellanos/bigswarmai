---
id: HU-005
feature: F-004
epic: E-001
module: 01-workspace
needs: [HU-004]
screen: workspace
---

# HU-005 — Editar y ejecutar con pregunta

Como operador, quiero que el enjambre pueda editar un archivo de la carpeta y ejecutar un comando, y que se detenga a preguntarme cuando la acción sea peligrosa.

**Aceptación**

- WHEN una edición queda dentro de la carpeta, THEN el archivo cambia.
- WHEN un comando es leer o correr dentro de la carpeta, THEN corre.
- WHEN la acción borra fuera de la carpeta, gasta dinero, toca credenciales, sale a la red o no se puede deshacer, THEN no corre hasta que yo la autorizo.
- IF no autorizo, THEN la acción no ocurre.

**Tablero**

No aplica.
