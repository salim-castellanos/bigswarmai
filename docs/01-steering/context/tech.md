# Tech — BigSwarmAI

## Decisiones de este corte

| Capa | Elección | Por qué |
| --- | --- | --- |
| Lenguaje | TypeScript, ejecutado con tsx en Node 20 | Es el Node de esta máquina; no hace falta un paso de compilación para la ventana |
| Ventana | Electron | El operador elige una carpeta del sistema desde el primer uso |
| Pantalla | HTML servido por la propia app en `127.0.0.1` | La misma ventana y las pruebas hablan con el módulo del workspace |
| Pruebas | `node:test` | La batería de HU-001…HU-004 es el módulo, no un curl |

## Fuera de este corte

El panel de la extensión (conexión con dos modelos, asistente de objetivos, arrancar un nodo). El módulo de archivos de este corte lo reutiliza esa extensión. MCP y el enjambre que llama al modelo entran con el panel, no con otra ventana.
