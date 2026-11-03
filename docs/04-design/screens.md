# Pantallas

El IDE pone el árbol de archivos, el editor y la terminal. BigSwarmAI no los reemplaza.

| id | Qué ve el operador |
| --- | --- |
| panel | La barra lateral solo tiene el árbol. Arriba, Connect, + Objective y, si hay una corrida, Stop. Debajo, tres botones con icono y nombre: bombillo Discoveries, líneas Log, marca Result. Cada uno abre su pestaña. El punto verde es un resultado vigente. El punto ámbar es un resultado viejo: el texto del objetivo cambió y Start lo vuelve a correr. Run again repite el nodo elegido. |
| conexion | Pestaña ancha del editor. Lista los modelos que VS Code ya tiene. El operador elige el del orquestador y el de los agentes, y puede probar. No pide la clave. |
| asistente | La misma clase de pestaña ancha. Pregunta el texto del objetivo, si es el principal o subobjetivo de cuál, y lo deja en el árbol. No hace falta el modelo para guardarlo. |
| nodo | Al elegir un nodo en el panel: su texto, la estrategia (se puede cambiar para el próximo arranque), la cantidad de agentes, y si este nodo usa los modelos de la conexión o un par distinto. Arrancar aquí corre solo este nodo. Arrancar el principal corre la estrategia sobre ese árbol. |
| descubrimiento | En el panel, la lista de eventos del nodo. Al elegir uno, el IDE abre el archivo de origen. |

Los rótulos de vistas, pestañas y botones van en inglés: Objectives, Discoveries, Log, Result, Connection, Objective, Connect, Initialize folder, Start, Save, Edit, Delete, Sub-objective.

Una estrategia nueva es una entrada nueva del registro de la extensión. El panel solo guarda el identificador en el nodo. No se redibuja el panel para añadir una estrategia.
