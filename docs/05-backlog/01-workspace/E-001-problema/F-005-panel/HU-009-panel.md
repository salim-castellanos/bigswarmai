---
id: HU-009
feature: F-005
epic: E-001
module: 01-workspace
needs: [HU-001]
screen: panel
---

# HU-009 — Ver el panel en la carpeta abierta

Como operador, quiero ver BigSwarmAI en el IDE donde ya abrí la carpeta, para no elegir la ruta en un formulario.

**Aceptación**

- WHEN hay una carpeta abierta en el IDE, THEN la barra lateral muestra el panel.
- WHEN esa carpeta no tiene marca, THEN el panel ofrece inicializarla y, al hacerlo, cumple HU-001.
- WHEN la marca ya existe, THEN el panel muestra el árbol de objetivos y los descubrimientos, sin recrear los archivos.
- WHEN elijo un descubrimiento con origen en un archivo de la carpeta, THEN el IDE abre ese archivo.
- WHEN cambio la estrategia o la cantidad de agentes de un nodo, THEN esos valores quedan en ese nodo para el próximo arranque.

**Tablero**

No aplica.
