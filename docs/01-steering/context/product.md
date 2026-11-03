# Producto — BigSwarmAI

Idea de negocio **general**. No es una HU, no es C4, no es stack.

## Idea

Una extensión del IDE (VS Code y compatibles). El IDE abre la carpeta, el editor, la búsqueda y la terminal. BigSwarmAI aporta el panel para conectar el modelo, armar objetivos y ejecutar el enjambre.

Esa carpeta es el problema a resolver, con sus objetivos y su memoria. El enjambre investiga y actúa ahí, descubre el plan mientras avanza, y pregunta al operador antes de hacer algo peligroso.

El código de BigSwarmAI se construye en `example/` y después se instala. La carpeta que se abre no es ese código.

El aprovechamiento del enjambre depende del harness: qué herramientas tiene cada agente y cuándo se llaman. Cambiar de modelo no sustituye ese harness.

## Usuarios

| Actor | Necesidad |
| --- | --- |
| Operador | Instalar la extensión, conectar el modelo, definir un objetivo principal y sus subobjetivos, elegir en cuál arrancar, ver costo y descubrimientos, parar, reanudar y aprobar lo peligroso |
| Agente del enjambre | Leer el tablero y las instrucciones del workspace, usar solo las herramientas de su tarea, publicar hallazgos y esperar aprobación cuando la acción es peligrosa |

## Objetivos

- Con un objetivo (“lograr X”), ejecutar un enjambre que descubre el plan como parte de la misma tarea.
- Un workspace tiene un objetivo principal y puede tener subobjetivos. El operador arranca el principal o un subobjetivo. El resultado de uno puede ser insumo de otro en la misma carpeta.
- El operador elige la estrategia y cuántos agentes corren en el nodo que arranca. Puede cambiar la estrategia antes del siguiente arranque.
- La conexión guarda dos modelos: uno para el orquestador y otro para los agentes. Si no se cambia, los dos apuntan al mismo. El orquestador puede usar un modelo más capaz y los agentes uno menor.
- Un orquestador asigna trabajo. El tablero — una carpeta de eventos — es el otro canal: los agentes escriben descubrimientos y los demás los leen.
- Hay una estrategia principal (orquestador + grupos que exploran partes distintas + tablero) y se puede cambiar a otra estrategia de enjambre.
- Después de configurar un proveedor (Azure Foundry, ChatGPT, Claude, DeepSeek u otro), el operador aporta el contexto y arranca. El proveedor se puede cambiar sin rehacer las herramientas.
- Durante la ejecución se ve el costo que acumula cada agente, su uso de tokens y cuántos descubrimientos avanzan hacia el objetivo.
- La interfaz es un panel de la extensión dentro del IDE. El IDE sigue siendo quien abre la carpeta, el editor y la terminal.
- El enjambre puede investigar y ejecutar comandos. Si la acción es peligrosa, se detiene y pregunta al operador.
- Cada agente recibe un conjunto corto de herramientas, el de su tarea, no todas las de la plataforma.
- El conjunto de la carpeta es: ver la estructura, buscar, leer un tramo, editar, ejecutar un comando, leer el tablero y agregar un evento, y preguntar al operador.
- El orden de las herramientas es flexible: el agente busca y lee por el camino que el objetivo pida. El harness no le impone una sola secuencia.
- Al tablero solo entra un descubrimiento significativo: algo que cambiaría lo que otro agente haría. Lleva la afirmación, por qué importa al objetivo y de dónde salió. Un log de herramienta, un archivo entero o un razonamiento a medias no es un descubrimiento.
- Ese evento llega rápido al resto. Los demás leen la afirmación, no el transcript de quien la encontró.
- Un MCP se conecta a un objetivo cuando hace falta una capacidad que ese conjunto no tiene. No está encendido para todos los agentes desde el inicio.
- Si la carpeta no está inicializada, elegirla crea los archivos mínimos. Si ya lo está, se carga desde donde iba, sin pisar la memoria.
- Esos archivos incluyen `AGENTS.md` y la metadata. `AGENTS.md` explica dónde está cada cosa y cómo funciona, de forma que BigSwarmAI inicialice el workspace y otra plataforma de agentes pueda entenderlo.
- La metadata guarda, por objetivo, el padre si es subobjetivo, la estrategia, cuántos agentes, el estado, los descubrimientos y lo necesario para reanudar o volver a ejecutar. Los identificadores de modelo viven en la conexión de la extensión, no en la carpeta.
- Parar, cerrar la ventana o apagar el proceso deja esa memoria en la carpeta. La siguiente apertura continúa desde ahí.

## No-objetivos

- Sustituir el molde SDD. Este producto se construye con ese método.
- Usar la carpeta de trabajo como repositorio del código de BigSwarmAI.
- Un chat de un solo agente como forma de resolver el objetivo.
- Obligar a cerrar el plan en una fase previa y solo después ejecutar.
- Hacer que todo el contexto pase únicamente por el orquestador.
- Dar a cada agente todas las herramientas y todos los MCP en cada tarea.
- Llenar el tablero con el registro crudo de cada herramienta.
- Ejecutar una acción peligrosa sin la respuesta del operador.
- Implementar otras plataformas de agentes. `AGENTS.md` les deja el mapa; no forman parte del producto.
- Entrenar o alojar modelos.

## Definición de “correcto”

Un workspace es correcto cuando, al abrirlo, BigSwarmAI sabe si ya estaba inicializado. Si no lo estaba, crea `AGENTS.md` y la metadata mínima. Si lo estaba, muestra los objetivos, cuántos agentes tenía cada ejecución, en qué estado iba y los descubrimientos ya escritos.

Ejecutar un objetivo es correcto cuando varios agentes trabajan a la vez, el orquestador reparte trabajo y un perfil de herramientas, y al tablero llega solo un descubrimiento significativo —afirmación, por qué importa y origen— que los demás usan sin repetir la búsqueda ni leer el transcript ajeno, y el operador ve capacidad, costo y avance, sin haber escrito el plan completo antes. Un resultado puede quedar como insumo de otro objetivo de la misma carpeta. Una acción peligrosa no ocurre hasta que el operador la autoriza. Un MCP entra solo si ese objetivo lo tiene conectado. Si el proceso muere, volver a abrir esa carpeta permite continuar con la misma metadata.
