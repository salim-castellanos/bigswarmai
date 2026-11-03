---
id: 001-ventana
title: Ventana del workspace
status: implemented
hu: HU-001
runbook: 001-ventana
supersedes:
superseded-by:
---

# Spec 001 — Ventana

La ventana abre una carpeta y cumple HU-001, HU-002, HU-003 y HU-004.

## Insumos

- HU: `docs/05-backlog/01-workspace/E-001-problema/F-001-carpeta/HU-001-abrir-carpeta.md`
- HU: `docs/05-backlog/01-workspace/E-001-problema/F-001-carpeta/HU-002-objetivo.md`
- HU: `docs/05-backlog/01-workspace/E-001-problema/F-002-tablero/HU-003-descubrimiento.md`
- HU: `docs/05-backlog/01-workspace/E-001-problema/F-003-lectura/HU-004-leer-carpeta.md`
- Arquitectura: `docs/03-architecture/01-workspace-files.md`
- Diseño: `docs/04-design/screens.md` fila `workspace`
- Gates: `docs/02-gates/quality-gates.md` del molde (`../../docs/02-gates/quality-gates.md` desde `example/`)
- Tech: `docs/01-steering/context/tech.md`

## Contexto

Corte inicial de BigSwarmAI. La ventana y el módulo del workspace son el mismo comportamiento.

## In scope

Abrir o inicializar una carpeta, guardar el objetivo, publicar un descubrimiento con afirmación, porqué y origen, listar, buscar y leer sin crear eventos.

## Tablero

No aplica. Las HUs no mueven un tile de home.

## Out of scope

Editar, ejecutar comandos, lanzar agentes, proveedores, costo, parar una corrida, MCP. HU-005…HU-008.

## Comportamiento

- WHEN elijo una carpeta sin `.bigswarm/workspace.json`, THEN se crean la marca (`schema` 1, `product` `BigSwarmAI`), `.bigswarm/objective.md` vacío, `.bigswarm/events/` y la sección `<!-- bigswarm:start -->` … `<!-- bigswarm:end -->` en `AGENTS.md`.
- WHEN `AGENTS.md` ya existe, THEN esa sección se añade al final y el texto previo queda igual.
- WHEN la sección ya está, THEN no se duplica.
- WHEN la marca ya existe, THEN se leen el objetivo y los eventos y no se recrean esos archivos.
- IF la carpeta no se puede escribir, THEN no queda marca y la ventana muestra el error.
- WHEN guardo un objetivo en una carpeta inicializada, THEN `.bigswarm/objective.md` queda con ese texto y al reabrir se ve el mismo.
- WHEN guardo otro texto, THEN reemplaza al anterior.
- IF la carpeta no está inicializada, THEN no se escribe objetivo ni evento ni se lista.
- WHEN publico afirmación, porqué y origen con texto, THEN hay un json nuevo en `.bigswarm/events/` y la ventana lo muestra.
- WHEN reabro, THEN ese json sigue.
- IF falta uno de los tres textos, THEN no hay json nuevo.
- WHEN listo, THEN veo los nombres del primer nivel.
- WHEN busco un texto presente, THEN veo ruta y renglón.
- WHEN leo, THEN veo como máximo los primeros 8000 caracteres.
- IF la ruta resuelta sale de la carpeta, THEN no veo ese archivo.
- WHEN listo, busco o leo, THEN el número de eventos no cambia.

## Pantalla

Una ventana, pantalla `workspace`. Sin rutas de un sitio público. Elige carpeta, muestra objetivo, lista de eventos, búsqueda y lectura.

## Formulario y validación

Objetivo: un texto, puede ir vacío. Descubrimiento: afirmación, porqué y origen; los tres obligatorios, se validan al publicar. Búsqueda: un texto.

## Mensajes

- Carpeta inicializada.
- Carpeta cargada.
- No se pudo escribir la carpeta.
- La carpeta no está inicializada.
- Falta la afirmación, el porqué o el origen.
- La ruta queda fuera de la carpeta.
- Objetivo guardado.
- Descubrimiento publicado.

## Autenticación y autorización

El operador en su máquina. No hay cuenta. La autoridad es el sistema de archivos de esa carpeta.

## Datos

Archivos de `docs/03-architecture/01-workspace-files.md`. No hay base de datos.

## Contratos

La ventana llama a su proceso local.

| Método | Camino | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| POST | `/api/open` | `{ "path" }` | `{ "created", "objective", "events" }` |
| POST | `/api/objective` | `{ "path", "text" }` | `{ "objective" }` |
| POST | `/api/discovery` | `{ "path", "claim", "why", "source" }` | `{ "event" }` |
| POST | `/api/list` | `{ "path" }` | `{ "names" }` |
| POST | `/api/search` | `{ "path", "query" }` | `{ "hits": [{ "file", "line" }] }` |
| POST | `/api/read` | `{ "path", "file" }` | `{ "text" }` |

Error: estado 400 y `{ "error" }` con uno de los mensajes de arriba.

## Pruebas

| AC | Capa | Qué se invoca | Qué falla si se rompe |
| --- | --- | --- | --- |
| Inicializar carpeta vacía | unit | `open` sobre un directorio temporal vacío | No aparece la marca, el objetivo, `events/` o la sección de `AGENTS.md` |
| No pisar `AGENTS.md` | unit | `open` con un `AGENTS.md` previo | El texto previo desaparece o la sección sale duplicada |
| Cargar sin recrear | unit | `open` dos veces y un evento escrito a mano entre medias | El segundo `open` borra el evento o marca `created` |
| Carpeta de solo lectura | unit | `open` en un directorio no escribible | Queda una marca a medias |
| Guardar objetivo | unit | `saveObjective` y `open` | Al reabrir el texto es otro |
| Objetivo sin marca | unit | `saveObjective` sin `open` | Se escribe `objective.md` igual |
| Publicar descubrimiento | unit | `addDiscovery` con los tres textos | No hay json nuevo con claim, why y source |
| Rechazar descubrimiento incompleto | unit | `addDiscovery` sin origen | Aparece un json nuevo |
| Listar, buscar, leer | unit | `listNames`, `searchText`, `readSlice` sobre un archivo fijado | No está el nombre, el renglón o el tramo; o aparece un evento |
| Ruta fuera | unit | `readSlice` con `../` | Devuelve el archivo de afuera |

e2e HTTP: no aplica. El proceso local no es un api de producto. e2e Playwright: no aplica en este corte. La ventana es Electron sobre este módulo; la batería que cierra el corte es la unitaria.

## Delta

`ADDED` documento base.
