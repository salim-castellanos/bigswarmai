---
id: HU-004
feature: F-003
epic: E-001
module: 01-workspace
needs: [HU-001]
screen: workspace
---

# HU-004 — Listar, buscar y leer

Como operador, quiero listar, buscar y leer un tramo de un archivo de la carpeta para mirar el problema sin convertir esa lectura en un descubrimiento.

**Aceptación**

- WHEN la carpeta está inicializada y pido la lista, THEN veo los nombres del primer nivel, sin seguir un enlace que salga de la carpeta.
- WHEN busco un texto que está en un archivo de la carpeta, THEN veo la ruta y el renglón.
- WHEN leo un archivo de la carpeta, THEN veo como máximo los primeros 8000 caracteres.
- IF pido una ruta que sale de la carpeta, THEN no veo ese archivo.
- WHEN listo, busco o leo, THEN no se crea un evento en `.bigswarm/events/`.

**Tablero**

No aplica.
