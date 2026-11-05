# Harness de investigación — `investigate`

Contrato reutilizable. No es solo de este plugin. Otro sistema puede copiar los nombres, las descripciones y el orden. El código que lo ejecuta hoy está en `apps/extension/src/investigate.ts`.

Un harness es el sistema que corre en el momento de la inferencia: qué herramientas ve el modelo, cómo están descritas, quién las llama y qué se le devuelve. El mismo modelo, con otra interfaz, produce otro resultado. La meta de este contrato es esa mejora demostrada, no una cifra fija. Un ejemplo del tipo «del 15% al 90%» solo ilustra el tamaño del efecto. No es una puntuación que este plugin prometa.

## Qué publican los laboratorios

Cada fila es un efecto medido al cambiar el harness, con el modelo u otro factor dicho al lado. Sirven para elegir qué copiar.

| Fuente | Qué midieron | Número |
| --- | --- | --- |
| GAIA, Meta y Hugging Face, 2023 | Preguntas reales que exigen razonar, leer archivos y navegar | GPT-4 con plugins, cerca del 15%. Personas, 92%. |
| Tabla GAIA, octubre 2026 | El mismo tipo de pregunta, años después | Sistemas de varios modelos con harness propio, cerca del 94% en el conjunto oculto. No es el mismo modelo de 2023. |
| Anthropic, Research, junio 2025 | Evaluación interna de investigación | Opus 4 como líder y Sonnet 4 como subagentes superó a un solo Opus 4 en un 90,2%. Es una mejora relativa, no «90% de aciertos». |
| Anthropic, la misma nota | Un cambio de prompt en unas 20 preguntas reales | El acierto pasó de cerca del 30% a cerca del 80%. |
| Anthropic, la misma nota | Reescribir la descripción de una herramienta mala | El tiempo de la tarea bajó un 40%. |
| Anthropic, BrowseComp | De dónde sale el acierto al buscar en la web | El gasto de tokens explica cerca del 80% de la variación. Llamadas a herramientas y elección de modelo completan cerca del 95%. |
| SWE-agent, 2024 | Misma pesa, otra interfaz sobre el repositorio | La interfaz hecha para el modelo sumó 10,7 puntos frente a una terminal genérica. |
| OpenAI Deep Research, 2025 | Investigación con búsqueda, lectura y código | Herramientas fijas: buscar en la web, leer archivos del usuario, intérprete de código. El informe cita la frase de la fuente. |
| Gemini Deep Research, 2026 | El mismo ciclo | Por defecto: buscar, leer una URL, ejecutar código. Plan, búsqueda, lectura, iteración, informe. |

Lo que se repite, y es lo que copiamos:

- Pocas herramientas, cada una con un propósito que no se solapa con otra.
- La descripción es parte del harness. Una descripción vaga manda al agente al sitio equivocado.
- El líder no investiga. Reparte un encargo concreto: objetivo, formato, fuentes y límite. Un encargo vago hace que dos agentes busquen lo mismo.
- El subagente comprime. Devuelve el hallazgo, no el transcript ni la página entera.
- Primero ancho, después estrecho. Una consulta corta, ver qué hay, luego precisar.
- Citar al final, contra las fuentes ya leídas, no de memoria.
- Parar cuando basta. El fallo típico es seguir buscando.
- El esfuerzo escala con la pregunta: un hecho, un agente y pocas llamadas. Una comparación, unos pocos agentes.
- La web y la carpeta son herramientas distintas. Buscar en la web un dato que solo está en la carpeta no puede funcionar.

## Conjunto `investigate`

Cinco herramientas. Solo lectura. Ninguna edita, borra ni ejecuta un comando.

El texto de `description` es el que recibe el modelo. Va en inglés porque el identificador y la instrucción de la herramienta van en inglés. No se parafrasea en la llamada.

### `list_files`

Lista nombres de archivos y carpetas bajo una ruta relativa del workspace. Úsala primero para ver qué hay. No lee el contenido. Omite `.git`, `node_modules` y `.bigswarm`.

Entrada: `{ "path": "" }`. Vacío es la raíz de la carpeta abierta.

### `search_text`

Busca una frase corta y exacta en los archivos del workspace. Empieza con una consulta breve y luego estrecha. Devuelve hasta 30 aciertos, con ruta y número de línea.

Entrada: `{ "query": "frase corta" }`.

### `read_slice`

Lee el comienzo de un solo archivo del workspace, como máximo 8000 caracteres. Úsala después de listar o buscar, sobre una ruta que ya viste.

Entrada: `{ "path": "docs/notas.md" }`.

### `read_board`

Lee los descubrimientos ya escritos en este workspace: la afirmación, por qué importa y la fuente. Úsala antes de buscar, para no repetir un hallazgo.

Entrada: `{}`.

### `fetch_url`

Lee el texto de una página pública `http` o `https`. Úsala solo para comprobar un dato que no está en el workspace. El operador aprueba cada sitio nuevo. El texto vuelve recortado.

Entrada: `{ "url": "https://ejemplo.org/pagina" }`.

## Orquestación

1. El orquestador no llama estas herramientas. Mira el objetivo, los subobjetivos que aún no tienen resultado y el tablero. Reparte ángulos. Cada ángulo dice qué hay que averiguar, qué cuenta como hallazgo y qué no hay que repetir.
2. Cada agente recibe las cinco herramientas y un tope de 6 rondas. En una ronda puede pedir varias. Se ejecutan en serie para que la aprobación de un sitio no se pise con otra.
3. `fetch_url` tiene un tope de 3 páginas por agente. Un sitio nuevo abre un diálogo. Si el operador dice que no, la herramienta devuelve esa negativa y el agente sigue con lo que ya tiene.
4. El agente termina con un JSON y nada más: `{"claim":"...","why":"...","source":"..."}`. La afirmación y el porqué los redacta el modelo. `source` solo puede ser `objective` (inferido del objetivo o de los subobjetivos ya dados), `board` (inferido de un descubrimiento ya escrito) o una ruta o URL que `read_slice` o `fetch_url` devolvieron en esa corrida. Otra fuente se descarta y no se guarda el hallazgo. Si no hay nada nuevo, `{"skip":true}`.
5. El orquestador escribe el resultado final a partir de esos hallazgos. No inventa una fuente que ningún agente haya leído.
6. Si la pregunta es un solo hecho, basta un agente. No se abren agentes de más.
7. Parar cancela la ronda en curso y no abre otra.

## Controles de la corrida

No cambian las herramientas ni el número de versión. Al terminar, el plugin escribe un Markdown nuevo en `research/` y lo abre. No pisa un informe anterior. Junto a Start, **Calls** es el tope de llamadas al modelo; al pasarlo, la corrida para y lo que ya se guardó se queda. Si la carpeta no tiene objetivos, **Explain this folder** crea uno que lee los archivos y cita la ruta. Si el modelo ya está conectado, lo arranca.

## Qué no entra en este harness

Editar, ejecutar comandos y borrar. Eso es otro harness, el de actuar sobre la carpeta, y pide aprobación en cada cambio. Un MCP entra solo si el objetivo lo necesita y estas cinco no alcanzan.

## Versión

La versión vigente es `investigate` **3**. La 2 solo aceptaba `objective`, `board`, o una ruta o URL abierta en esa corrida. La 3 muestra el tablero actual antes de cada respuesta del modelo, para que los agentes que corren a la vez vean lo que otro acaba de escribir. El tablero no cuenta como prueba de un dato externo. Vive en el código (`HARNESS_ID`, `HARNESS_VERSION`), no en la carpeta del problema. Las corridas de las versiones 1 y 2 se siguen leyendo.

| Qué queda fijo | Qué puede cambiar en una versión nueva |
| --- | --- |
| El resultado guarda `claim`, `why` y `source`. | El texto de una descripción, el tope de rondas o de páginas, el orden en que se sugieren las herramientas. |
| Un archivo de corrida viejo se lee aunque no traiga versión. | Una herramienta nueva, o una entrada nueva en una herramienta que ya existe, entra como campo opcional. |
| `objectives.json`, los eventos y el log no dependen del texto del prompt. | El prompt del agente y el del orquestador. |

Reglas para no romper lo que ya corrió:

1. Al arrancar, el plugin toma la versión vigente y la escribe en la corrida: `harnessId` y `harnessVersion`. Una corrida anterior, sin esos campos, sigue siendo válida.
2. La ejecución no relee el prompt de una corrida vieja. Usa el código de la versión vigente. Por eso una mejora del harness mejora la siguiente corrida sin migrar la carpeta.
3. Subir la versión cuando cambia una descripción, un tope o el conjunto de herramientas. No se sube por un arreglo que no altera lo que el modelo ve.
4. No se renombra ni se quita una herramienta dentro de la misma versión. Eso es una versión nueva. Las corridas hechas con la anterior se quedan en su archivo.
5. **Run again** vuelve a ejecutar con la versión vigente. No repite el harness con el que se escribió el resultado viejo.
6. Otro sistema que copie este contrato importa el mismo par id y versión, y guarda esos dos campos en su propio resultado.

## Cómo lo usa otro sistema

Conserva los nombres, las descripciones y el número de versión. Implementa cada herramienta con el límite de este contrato: no salir de la carpeta en las tres primeras, no abrir la red sin un sí de la persona, devolver texto corto. El orquestador solo reparte y cita. El agente solo investiga y comprime. La versión 2 ya está publicada: cambió qué `source` se acepta. Las corridas de la versión 1 siguen leyéndose. Una versión 3 se documenta aquí del mismo modo.
