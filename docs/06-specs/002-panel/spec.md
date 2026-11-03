---
id: 002-panel
title: Panel de la extensión
status: implemented
hu: HU-009
runbook: 002-panel
supersedes:
superseded-by:
---

# Spec 002 — Panel

## Insumos

- HU: `docs/05-backlog/01-workspace/E-001-problema/F-005-panel/HU-009-panel.md`
- HU: `docs/05-backlog/01-workspace/E-001-problema/F-005-panel/HU-010-conexion.md`
- HU: `docs/05-backlog/01-workspace/E-001-problema/F-005-panel/HU-011-asistente.md`
- Arquitectura: `docs/03-architecture/01-workspace-files.md`
- Diseño: `docs/04-design/screens.md`
- Tech: `docs/01-steering/context/tech.md`

## Contexto

La carpeta ya se inicializa con el módulo de `001-ventana`. Este corte lo muestra dentro de VS Code.

## In scope

Barra lateral del panel. Pestaña de conexión que lista modelos de VS Code y guarda dos elecciones. Pestaña del asistente que crea principal o subobjetivo. Guardar estrategia y cantidad en el nodo.

## Tablero

No aplica.

## Out of scope

Llamar a los agentes, editar archivos, comandos, MCP, parar una corrida. El botón de arrancar el enjambre no ejecuta todavía.

## Comportamiento

- WHEN hay una carpeta abierta, THEN la vista Enjambre está en la barra lateral.
- WHEN no hay marca, THEN el panel muestra Inicializar y al usarla crea los archivos de HU-001.
- WHEN hay marca, THEN muestra los nodos de `.bigswarm/objectives.json` y los eventos, sin recrearlos.
- WHEN elijo un descubrimiento cuyo origen es un archivo de la carpeta, THEN el editor lo abre.
- WHEN cambio estrategia o cantidad de un nodo y guardo, THEN esos campos quedan en ese nodo. La cantidad menor que 1 no se guarda.
- WHEN abro Conexión y cargo modelos, THEN veo los que `vscode.lm.selectChatModels` devuelve y elijo orquestador y agentes. No hay campo de clave.
- WHEN los dos id elegidos están en esa lista, THEN la conexión queda lista. Si falta uno, no queda lista.
- WHEN no hay modelos, THEN el texto pide Chat: Manage Language Models.
- WHEN la prueba del modelo del orquestador falla, THEN se ve el error y la conexión no queda lista.
- WHEN el asistente guarda un texto como principal, THEN el nodo queda en la raíz, con estrategia `board` y 1 agente, y `.bigswarm/objective.md` queda con ese texto.
- WHEN elige un padre, THEN el nodo cuelga de ese padre con la misma estrategia y cantidad iniciales.
- IF el texto va vacío, THEN no se crea el nodo.
- WHEN guardo un objetivo, THEN no importa si la conexión está lista.

## Pantalla

`panel`, `conexion`, `asistente` y el trozo de `nodo` que guarda estrategia y cantidad. `docs/04-design/screens.md`.

## Formulario y validación

Conexión: dos listas. Asistente: texto obligatorio y padre opcional. Nodo: estrategia con texto y cantidad entera mayor o igual que 1.

## Mensajes

- Abre una carpeta en el IDE.
- Carpeta inicializada.
- Conexión lista.
- Falta conectar.
- No hay modelos. Ejecuta Chat: Manage Language Models.
- Esos modelos no están en la lista cargada.
- La prueba respondió.
- El objetivo no puede estar vacío.
- El objetivo padre no está en el árbol.
- Objetivo guardado.
- Nodo guardado.
- El origen no es un archivo de la carpeta.
- La cantidad de agentes tiene que ser al menos 1.

## Autenticación y autorización

La clave la guarda VS Code. La extensión no la escribe. La carpeta es la que el IDE tiene abierta.

## Datos

`.bigswarm/objectives.json` con `id`, `parentId`, `text`, `strategyId`, `agentCount`. Los id de modelo quedan en el estado global de la extensión.

## Contratos

No hay HTTP. La vista habla con la extensión por mensajes: `init`, `open`, `saveNode`, `load`, `save`, `test`, `add`.

## Pruebas

| AC | Capa | Qué se invoca | Qué falla si se rompe |
| --- | --- | --- | --- |
| Dos modelos presentes | unit | `connectionReady` con opus y sonnet | Lista o no lista al revés |
| Árbol principal e hijo | unit | `addObjective` | No aparece el padre, el hijo o `objective.md` |
| Texto vacío | unit | `addObjective` con espacios | Se crea `objectives.json` |
| Cantidad | unit | `updateObjective` con 4 y con 0 | No persiste 4, o persiste 0 |

e2e HTTP: no aplica. e2e Playwright: no aplica. La extensión se abre con el host de desarrollo de VS Code.

## Delta

`ADDED` documento base.
