# BigSwarmAI

[English](./README.md) | **Español**

Extensión de VS Code que corre un enjambre contra un objetivo en la carpeta que tienes abierta. Un orquestador reparte el trabajo. Los agentes comparten solo un descubrimiento que cambiaría lo que haría otro agente. La bitácora, los descubrimientos y el resultado final se quedan en esa carpeta.

La extensión no pide una clave. Usa los modelos que ya conectaste en VS Code.

## Qué haces con ella

- Inicializas la carpeta abierta. BigSwarmAI escribe un directorio `.bigswarm` pequeño y una sección en `AGENTS.md`.
- Eliges dos modelos: uno para el orquestador y otro para los agentes.
- Escribes un objetivo principal y cuelgas subobjetivos.
- Arrancas un nodo. Los que ya terminaron no se vuelven a correr. **Run again** repite el que seleccionaste.
- Lees **Discoveries**, **Log** y **Result** en pestañas propias del editor.
- **Stop** corta una corrida mientras va.

El punto verde significa que ese nodo ya tiene resultado. El punto ámbar significa que el texto cambió después de ese resultado, así que el siguiente **Start** lo vuelve a correr.

## Qué necesitas

- VS Code 1.95 o más nuevo.
- Al menos un modelo de chat disponible en VS Code (por ejemplo GitHub Copilot, u otro que hayas agregado en el editor).
- Una carpeta. Esa carpeta es el problema, no el código de esta extensión.

## Instalar desde el código

```bash
git clone https://github.com/salim-castellanos/bigswarmai.git
cd bigswarmai/apps/extension
npm install
npm run compile
```

Abre `apps/extension` en VS Code y pulsa F5. La configuración de lanzamiento se llama **BigSwarmAI**.

Para armar un VSIX en Node 20:

```bash
npx --yes @vscode/vsce@2.32.0 package --allow-missing-repository --skip-license
```

Luego, en Extensiones: **Install from VSIX** y elige ese archivo.

## Usarla

1. Abre una carpeta y elige el icono de BigSwarmAI en la barra de actividades.
2. Si la carpeta es nueva, pulsa **Initialize folder**.
3. **Connect**. Carga los modelos de VS Code, elige orquestador y agentes, **Save** y **Test**.
4. **+ Objective**. Escribe qué quieres lograr. Deja el padre vacío si es el principal, o elige un padre si es un subobjetivo.
5. Selecciona el nodo en el árbol. La estrategia que corre es `board`. Indica cuántos agentes y pulsa **Start**.
6. Abre **Discoveries**, **Log** o **Result**. Cada botón abre una pestaña del editor. **Log** también se abre al arrancar, y **Result** al terminar.

Hoy la única estrategia que corre es `board`. El orquestador decide qué subobjetivos directos faltan, cuáles pueden ir juntos y cuáles tienen que esperar.

## La carpeta

| Ruta | Qué es |
| --- | --- |
| `.bigswarm/workspace.json` | Marca la carpeta como workspace de BigSwarmAI. |
| `.bigswarm/objectives.json` | El árbol: texto, padre, estrategia y cantidad de agentes. |
| `.bigswarm/objective.md` | El objetivo principal, en texto plano. |
| `.bigswarm/events/*.json` | Un descubrimiento por archivo: afirmación, por qué importa y origen. |
| `.bigswarm/results/<id-del-objetivo>/` | Cada corrida, en JSON y Markdown. |
| `.bigswarm/log.json` | La bitácora, del paso más antiguo al más nuevo. Sigue ahí al recargar la ventana. |
| `AGENTS.md` | Una sección entre `<!-- bigswarm:start -->` y `<!-- bigswarm:end -->`. El resto del archivo no se toca. |

Los identificadores de modelo viven en la extensión, no en la carpeta.

## El repositorio

| Ruta | Qué es |
| --- | --- |
| `apps/extension` | La extensión de VS Code. |
| `apps/desktop/src/workspace.ts` | La memoria de la carpeta que usa la extensión. |
| `docs/` | Notas de producto en español: idea, pantallas, backlog. |

## Licencia

[MIT](./LICENSE)
