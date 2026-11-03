# Archivos del workspace

La carpeta que el operador abre no es el código de BigSwarmAI.

| Ruta | Qué es |
| --- | --- |
| `.bigswarm/workspace.json` | Marca. Sin este archivo la carpeta no está inicializada. |
| `.bigswarm/objective.md` | El objetivo principal, texto plano. |
| `.bigswarm/objectives.json` | El árbol: principal y subobjetivos. Cada nodo guarda su estrategia, cuántos agentes y el estado. Los id de modelo no van aquí. |
| `.bigswarm/log.json` | La bitácora de la corrida, en orden. Sobrevive al cerrar la ventana. |
| `.bigswarm/events/*.json` | Un descubrimiento por archivo. Puede llevar `objectiveId` del nodo que lo produjo. |
| `.bigswarm/results/<id-del-objetivo>/` | Cada corrida: un `.json` y un `.md` con el resumen, la nota sobre subobjetivos y los descubrimientos. |
| `AGENTS.md` | Instructivo. BigSwarmAI añade una sección entre `<!-- bigswarm:start -->` y `<!-- bigswarm:end -->`. |

La marca guarda `schema: 1` y `product: "BigSwarmAI"`. Las claves de un proveedor no viven en esta carpeta.

Un descubrimiento tiene `claim`, `why` y `source`, los tres con texto. Listar, buscar y leer no crean eventos.

Una ruta que, al resolverla, queda fuera de la carpeta no se lee.
